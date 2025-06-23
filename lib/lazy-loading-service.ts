import { cacheService } from './cache-service'
import { chatService } from './chat-service'

interface PaginationConfig {
  pageSize: number
  initialLoad: number
  maxCachePages: number
}

interface PaginatedConversations {
  conversations: any[]
  hasMore: boolean
  nextPage: number
  totalCount: number
}

interface PaginatedMessages {
  messages: any[]
  hasMore: boolean
  nextCursor?: string
  totalCount: number
}

class LazyLoadingService {
  private config: PaginationConfig = {
    pageSize: 20,
    initialLoad: 30,
    maxCachePages: 5
  }

  private loadingStates = new Map<string, boolean>()

  configure(newConfig: Partial<PaginationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false
  }

  private setLoading(key: string, loading: boolean): void {
    this.loadingStates.set(key, loading)
  }

  async loadConversations(
    userId: string,
    page: number = 0,
    forceRefresh: boolean = false
  ): Promise<PaginatedConversations> {
    const cacheKey = `paginated_conversations_${userId}_${page}`
    const loadingKey = `loading_conversations_${userId}_${page}`

    if (this.isLoading(loadingKey)) {
      throw new Error('Já carregando esta página')
    }

    if (!forceRefresh) {
      const cached = await cacheService.get<PaginatedConversations>(cacheKey)
      if (cached) {
        return cached
      }
    }

    try {
      this.setLoading(loadingKey, true)

      const allConversations = await chatService.getUserConversations(userId)
      
      const startIndex = page * this.config.pageSize
      const endIndex = startIndex + this.config.pageSize
      const pageConversations = allConversations.slice(startIndex, endIndex)
      
      const result: PaginatedConversations = {
        conversations: pageConversations,
        hasMore: endIndex < allConversations.length,
        nextPage: page + 1,
        totalCount: allConversations.length
      }

      await cacheService.set(cacheKey, result, 2 * 60 * 1000)
      this.cleanupOldPages(userId, 'conversations', page)

      return result

    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
      throw error
    } finally {
      this.setLoading(loadingKey, false)
    }
  }

  async loadMessages(
    conversationId: string,
    cursor?: string,
    limit: number = this.config.pageSize,
    forceRefresh: boolean = false
  ): Promise<PaginatedMessages> {
    const cacheKey = `paginated_messages_${conversationId}_${cursor || 'initial'}`
    const loadingKey = `loading_messages_${conversationId}_${cursor || 'initial'}`

    if (this.isLoading(loadingKey)) {
      throw new Error('Já carregando mensagens')
    }

    if (!forceRefresh) {
      const cached = await cacheService.get<PaginatedMessages>(cacheKey)
      if (cached) {
        return cached
      }
    }

    try {
      this.setLoading(loadingKey, true)

      const { messages } = await chatService.getConversationWithMessages(conversationId)
      
      let filteredMessages = messages
      
      if (cursor) {
        const cursorDate = new Date(cursor)
        filteredMessages = messages.filter(msg => 
          new Date(msg.created_at) < cursorDate
        )
      }

      const sortedMessages = filteredMessages
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit)

      const nextCursor = sortedMessages.length > 0 
        ? sortedMessages[sortedMessages.length - 1].created_at
        : undefined

      const hasMore = sortedMessages.length === limit && 
        filteredMessages.length > limit

      const result: PaginatedMessages = {
        messages: sortedMessages.reverse(),
        hasMore,
        nextCursor,
        totalCount: messages.length
      }

      await cacheService.set(cacheKey, result, 60 * 1000)

      return result

    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
      throw error
    } finally {
      this.setLoading(loadingKey, false)
    }
  }

  private cleanupOldPages(userId: string, type: 'conversations' | 'messages', currentPage: number): void {
    try {
      const maxPages = this.config.maxCachePages
      const pagesToCleanup: number[] = []

      if (currentPage >= maxPages) {
        for (let i = 0; i <= currentPage - maxPages; i++) {
          pagesToCleanup.push(i)
        }
      }

      pagesToCleanup.forEach(page => {
        const key = `paginated_${type}_${userId}_${page}`
        cacheService.delete(key)
      })
    } catch (error) {
      console.warn('Erro na limpeza de cache:', error)
    }
  }

  invalidateConversationCache(conversationId: string): void {
    cacheService.invalidatePattern(new RegExp(`messages_${conversationId}`))
  }

  invalidateUserCache(userId: string): void {
    cacheService.invalidatePattern(new RegExp(`conversations_${userId}`))
  }

  // Pré-carregar próxima página de conversas
  async preloadNextConversations(userId: string, currentPage: number): Promise<void> {
    try {
      const nextPage = currentPage + 1
      const cacheKey = `paginated_conversations_${userId}_${nextPage}`
      
      // Verificar se já está em cache
      const cached = await cacheService.get(cacheKey)
      if (!cached) {
        // Carregar em background sem aguardar
        this.loadConversations(userId, nextPage).catch(error => {
          console.warn('Erro no pré-carregamento:', error)
        })
      }
    } catch (error) {
      console.warn('Erro no pré-carregamento de conversas:', error)
    }
  }
}

export const lazyLoadingService = new LazyLoadingService()