import { supabase } from './supabase'
import { sessionManager } from './session'
import { cacheService } from './cache-service'
import { compressionService } from './compression-service'
import type { ChatConversation, ChatMessage } from './supabase'

// Estender interface para incluir novos campos otimizados
export interface OptimizedConversationWithMessages extends ChatConversation {
  message_count: number
  last_message?: string
  last_message_time?: string
  has_unread?: boolean
}

export interface CreateConversationData {
  title: string
  userId?: string
}

export interface CreateMessageData {
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, any>
}

export interface PaginationResult<T> {
  data: T[]
  hasMore: boolean
  total?: number
  nextCursor?: string
}

class OptimizedChatService {
  private static instance: OptimizedChatService
  private localStorageKey = 'chat_conversations_backup'
  private initialized = false

  public static getInstance(): OptimizedChatService {
    if (!OptimizedChatService.instance) {
      OptimizedChatService.instance = new OptimizedChatService()
    }
    return OptimizedChatService.instance
  }

  private async initialize() {
    if (this.initialized) return
    this.initialized = true
  }

  // ========================================
  // 🚀 MÉTODO PRINCIPAL OTIMIZADO
  // ========================================
  // Substitui getUserConversations() - resolve problema N+1
  async getUserConversationsOptimized(
    userId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<OptimizedConversationWithMessages[]> {
    await this.initialize()
    
    try {
      const targetUserId = userId || sessionManager.getUserId()
      
      // Verificar cache primeiro (cache mais agressivo para função otimizada)
      const cacheKey = `optimized_conversations_${targetUserId}_${limit}_${offset}`
      const cached = await cacheService.get<OptimizedConversationWithMessages[]>(cacheKey)
      if (cached) {
        return cached
      }

      let supabaseResult: OptimizedConversationWithMessages[] = []
      let supabaseWorked = false

      try {
        // 🚀 USAR FUNÇÃO SQL OTIMIZADA - Uma única query
        const { data: conversations, error } = await supabase
          .rpc('get_user_conversations_with_stats', {
            p_user_id: targetUserId,
            p_limit: limit,
            p_offset: offset
          })

        if (!error && conversations) {
          supabaseResult = conversations.map((conv: any) => ({
            ...conv,
            // Garantir compatibilidade com interface existente
            last_message: conv.last_message || 'Sem mensagens',
            message_count: Number(conv.message_count) || 0,
            has_unread: Boolean(conv.has_unread)
          }))
          supabaseWorked = true

          // Cache por 2 minutos (mais tempo que o cache atual)
          await cacheService.set(cacheKey, supabaseResult, 2 * 60 * 1000)
        }
      } catch (supabaseError) {
        console.warn('Função otimizada falhou, usando fallback:', supabaseError)
        // Fallback para método antigo se função SQL falhar
        return this.getUserConversationsFallback(targetUserId, limit, offset)
      }

      if (supabaseWorked && supabaseResult.length > 0) {
        return supabaseResult
      }

      // Fallback para localStorage se necessário
      return this.getFromLocalStorage().slice(offset, offset + limit)

    } catch (error) {
      console.error('Erro na função otimizada:', error)
      return this.getUserConversationsFallback(userId, limit, offset)
    }
  }

  // ========================================
  // 🚀 MÉTODO DE MENSAGENS OTIMIZADO
  // ========================================
  async getConversationMessagesOptimized(
    conversationId: string,
    userId?: string,
    limit: number = 50,
    cursor?: string
  ): Promise<PaginationResult<ChatMessage>> {
    await this.initialize()
    
    try {
      const targetUserId = userId || sessionManager.getUserId()
      
      // Cache key específico para paginação
      const cacheKey = `optimized_messages_${conversationId}_${limit}_${cursor || 'initial'}`
      const cached = await cacheService.get<PaginationResult<ChatMessage>>(cacheKey)
      if (cached) {
        return cached
      }

      try {
        // 🚀 USAR FUNÇÃO SQL OTIMIZADA
        const { data: result, error } = await supabase
          .rpc('get_conversation_messages_paginated', {
            p_conversation_id: conversationId,
            p_user_id: targetUserId,
            p_limit: limit,
            p_cursor: cursor ? new Date(cursor).toISOString() : null
          })

        if (error) {
          throw error
        }

        if (!result || result.length === 0) {
          return { data: [], hasMore: false }
        }

        // O último registro contém a informação has_more
        const hasMore = result[0]?.has_more || false
        const messages = result.map((msg: any) => ({
          id: msg.id,
          conversation_id: msg.conversation_id,
          role: msg.role,
          content: msg.content,
          metadata: msg.metadata,
          created_at: msg.created_at
        }))

        const paginationResult: PaginationResult<ChatMessage> = {
          data: messages,
          hasMore,
          nextCursor: messages.length > 0 ? messages[messages.length - 1].created_at : undefined
        }

        // Cache por 1 minuto
        await cacheService.set(cacheKey, paginationResult, 60 * 1000)
        
        return paginationResult

      } catch (supabaseError) {
        console.warn('Função de mensagens otimizada falhou:', supabaseError)
        // Fallback para método antigo
        return this.getConversationMessagesFallback(conversationId, userId, limit, cursor)
      }

    } catch (error) {
      console.error('Erro nas mensagens otimizadas:', error)
      return { data: [], hasMore: false }
    }
  }

  // ========================================
  // 🚀 BUSCA INTELIGENTE OTIMIZADA
  // ========================================
  async searchConversationsAndMessages(
    searchTerm: string,
    userId?: string,
    limit: number = 20
  ): Promise<any[]> {
    await this.initialize()
    
    try {
      const targetUserId = userId || sessionManager.getUserId()
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        return []
      }

      const cacheKey = `search_${targetUserId}_${searchTerm}_${limit}`
      const cached = await cacheService.get<any[]>(cacheKey)
      if (cached) {
        return cached
      }

      const { data: results, error } = await supabase
        .rpc('search_conversations_and_messages', {
          p_user_id: targetUserId,
          p_search_term: searchTerm.trim(),
          p_limit: limit
        })

      if (error) {
        throw error
      }

      // Cache por 5 minutos (busca é menos volátil)
      await cacheService.set(cacheKey, results || [], 5 * 60 * 1000)
      
      return results || []

    } catch (error) {
      console.error('Erro na busca otimizada:', error)
      return []
    }
  }

  // ========================================
  // 🚀 ESTATÍSTICAS DO USUÁRIO
  // ========================================
  async getUserChatStats(userId?: string): Promise<any> {
    await this.initialize()
    
    try {
      const targetUserId = userId || sessionManager.getUserId()
      
      const cacheKey = `user_stats_${targetUserId}`
      const cached = await cacheService.get<any>(cacheKey)
      if (cached) {
        return cached
      }

      const { data: stats, error } = await supabase
        .rpc('get_user_chat_stats', {
          p_user_id: targetUserId
        })

      if (error) {
        throw error
      }

      const result = stats && stats.length > 0 ? stats[0] : {
        total_conversations: 0,
        total_messages: 0,
        messages_today: 0,
        avg_messages_per_conversation: 0,
        most_active_day: 'N/A',
        last_activity: null
      }

      // Cache por 10 minutos
      await cacheService.set(cacheKey, result, 10 * 60 * 1000)
      
      return result

    } catch (error) {
      console.error('Erro nas estatísticas:', error)
      return {
        total_conversations: 0,
        total_messages: 0,
        messages_today: 0,
        avg_messages_per_conversation: 0,
        most_active_day: 'N/A',
        last_activity: null
      }
    }
  }

  // ========================================
  // 🚀 BATCH LOADING PARA MÚLTIPLAS CONVERSAS
  // ========================================
  async getMultipleConversationsWithMessages(
    conversationIds: string[],
    userId?: string
  ): Promise<Record<string, ChatMessage[]>> {
    await this.initialize()
    
    try {
      const targetUserId = userId || sessionManager.getUserId()
      
      if (conversationIds.length === 0) {
        return {}
      }

      // Batch query para todas as mensagens de uma vez
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      // Agrupar mensagens por conversation_id
      const grouped = (messages || []).reduce((acc, message) => {
        const convId = message.conversation_id
        if (!acc[convId]) acc[convId] = []
        acc[convId].push(message)
        return acc
      }, {} as Record<string, ChatMessage[]>)

      return grouped

    } catch (error) {
      console.error('Erro no batch loading:', error)
      return {}
    }
  }

  // ========================================
  // MÉTODOS DE COMPATIBILIDADE (FALLBACK)
  // ========================================
  
  // Fallback para método antigo se função SQL falhar
  private async getUserConversationsFallback(
    userId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<OptimizedConversationWithMessages[]> {
    // Importar e usar o ChatService antigo se necessário
    const { chatService } = await import('./chat-service')
    const oldResult = await chatService.getUserConversations(userId)
    
    // Converter para formato otimizado
    return oldResult.slice(offset, offset + limit).map(conv => ({
      ...conv,
      has_unread: false // Campo adicional padrão
    }))
  }

  private async getConversationMessagesFallback(
    conversationId: string,
    userId?: string,
    limit: number = 50,
    cursor?: string
  ): Promise<PaginationResult<ChatMessage>> {
    const { chatService } = await import('./chat-service')
    const result = await chatService.getConversationWithMessages(conversationId, userId)
    
    // Implementar paginação manual
    let messages = result.messages || []
    
    if (cursor) {
      const cursorDate = new Date(cursor)
      messages = messages.filter(msg => new Date(msg.created_at) > cursorDate)
    }
    
    const paginatedMessages = messages.slice(0, limit)
    const hasMore = messages.length > limit

    return {
      data: paginatedMessages,
      hasMore,
      nextCursor: paginatedMessages.length > 0 
        ? paginatedMessages[paginatedMessages.length - 1].created_at 
        : undefined
    }
  }

  // ========================================
  // MÉTODOS AUXILIARES (localStorage, etc)
  // ========================================
  
  private getFromLocalStorage(): OptimizedConversationWithMessages[] {
    if (typeof window === 'undefined') return []
    
    try {
      const backup = localStorage.getItem(this.localStorageKey)
      if (!backup) return []
      
      const data = JSON.parse(backup)
      const currentUserId = sessionManager.getUserId()
      
      if (data.userId === currentUserId) {
        return (data.conversations || []).map((conv: any) => ({
          ...conv,
          has_unread: conv.has_unread || false
        }))
      }
      return []
    } catch (error) {
      return []
    }
  }

  // ========================================
  // MÉTODOS PÚBLICOS PARA COMPATIBILIDADE
  // ========================================
  
  // Métodos que mantêm compatibilidade com o ChatService atual
  async createConversation(data: CreateConversationData): Promise<ChatConversation | null> {
    const { chatService } = await import('./chat-service')
    return chatService.createConversation(data)
  }

  async addMessage(data: CreateMessageData): Promise<ChatMessage | null> {
    const { chatService } = await import('./chat-service')
    const result = await chatService.addMessage(data)
    
    // Invalidar caches relacionados
    const userId = sessionManager.getUserId()
    if (userId) {
      cacheService.invalidatePattern(new RegExp(`optimized_conversations_${userId}`))
      cacheService.invalidatePattern(new RegExp(`optimized_messages_${data.conversationId}`))
    }
    
    return result
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Testar função otimizada
      const { error } = await supabase
        .rpc('get_user_conversations_with_stats', {
          p_user_id: '00000000-0000-0000-0000-000000000000', // UUID fictício
          p_limit: 1
        })

      // Se não der erro de "função não existe", está funcionando
      return !error || !error.message.includes('function')
    } catch (error) {
      return false
    }
  }
}

// Singleton otimizado
export const optimizedChatService = OptimizedChatService.getInstance()

// Export compatível com import atual
export default optimizedChatService 