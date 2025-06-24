import { useState, useCallback, useEffect, useMemo } from 'react'
import { optimizedChatService, OptimizedConversationWithMessages, PaginationResult } from '../../../lib/optimized-chat-service'
import type { ChatMessage } from '../../../lib/supabase'
import { useSession } from './useSession'

interface UseOptimizedChatReturn {
  // Conversas
  conversations: OptimizedConversationWithMessages[]
  isLoadingConversations: boolean
  conversationsError: string | null
  loadMoreConversations: () => Promise<void>
  hasMoreConversations: boolean
  
  // Mensagens
  messages: ChatMessage[]
  isLoadingMessages: boolean
  messagesError: string | null
  loadMoreMessages: () => Promise<void>
  hasMoreMessages: boolean
  
  // Ações
  loadConversation: (id: string) => Promise<void>
  searchConversations: (term: string) => Promise<void>
  searchResults: any[]
  isSearching: boolean
  
  // Estatísticas
  chatStats: any
  loadChatStats: () => Promise<void>
  
  // Estado geral
  isOptimized: boolean
  performanceMetrics: {
    conversationLoadTime: number | null
    messageLoadTime: number | null
    searchTime: number | null
  }
}

export function useOptimizedChat(): UseOptimizedChatReturn {
  const { user } = useSession()
  const userId = user?.id || ''

  // Estados das conversas
  const [conversations, setConversations] = useState<OptimizedConversationWithMessages[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [conversationsError, setConversationsError] = useState<string | null>(null)
  const [conversationOffset, setConversationOffset] = useState(0)
  const [hasMoreConversations, setHasMoreConversations] = useState(true)

  // Estados das mensagens
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messagesCursor, setMessagesCursor] = useState<string | undefined>()
  const [hasMoreMessages, setHasMoreMessages] = useState(false)

  // Estados de busca
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Estados de estatísticas
  const [chatStats, setChatStats] = useState<any>(null)

  // Estados de performance
  const [performanceMetrics, setPerformanceMetrics] = useState({
    conversationLoadTime: null as number | null,
    messageLoadTime: null as number | null,
    searchTime: null as number | null
  })

  // Verificar se otimizações estão disponíveis
  const [isOptimized, setIsOptimized] = useState(false)

  // Verificar health do serviço otimizado na inicialização
  useEffect(() => {
    const checkOptimizedService = async () => {
      const isHealthy = await optimizedChatService.healthCheck()
      setIsOptimized(isHealthy)
      
      if (!isHealthy) {
        console.warn('⚠️ Serviço otimizado não disponível, usando fallback')
      } else {
        console.log('✅ Serviço otimizado ativo!')
      }
    }

    checkOptimizedService()
  }, [])

  // Carregar conversas otimizado
  const loadConversations = useCallback(async (reset: boolean = false) => {
    if (!userId) return

    setIsLoadingConversations(true)
    setConversationsError(null)
    
    const startTime = performance.now()
    
    try {
      const offset = reset ? 0 : conversationOffset
      const limit = 20

      const result = await optimizedChatService.getUserConversationsOptimized(
        userId,
        limit,
        offset
      )

      if (reset) {
        setConversations(result)
        setConversationOffset(limit)
      } else {
        setConversations(prev => [...prev, ...result])
        setConversationOffset(prev => prev + limit)
      }

      // Verificar se há mais conversas
      setHasMoreConversations(result.length === limit)

      // Métricas de performance
      const loadTime = performance.now() - startTime
      setPerformanceMetrics(prev => ({
        ...prev,
        conversationLoadTime: loadTime
      }))

      if (loadTime > 500) {
        console.warn(`⚠️ Carregamento de conversas lento: ${loadTime.toFixed(2)}ms`)
      } else {
        console.log(`✅ Conversas carregadas em ${loadTime.toFixed(2)}ms`)
      }

    } catch (error) {
      setConversationsError(error instanceof Error ? error.message : 'Erro ao carregar conversas')
      console.error('Erro ao carregar conversas:', error)
    } finally {
      setIsLoadingConversations(false)
    }
  }, [userId, conversationOffset])

  // Carregar mais conversas
  const loadMoreConversations = useCallback(async () => {
    if (!hasMoreConversations || isLoadingConversations) return
    await loadConversations(false)
  }, [hasMoreConversations, isLoadingConversations, loadConversations])

  // Carregar conversa específica
  const loadConversation = useCallback(async (id: string) => {
    if (!userId) return

    setIsLoadingMessages(true)
    setMessagesError(null)
    setCurrentConversationId(id)
    setMessagesCursor(undefined)
    
    const startTime = performance.now()

    try {
      const result: PaginationResult<ChatMessage> = await optimizedChatService.getConversationMessagesOptimized(
        id,
        userId,
        50
      )

      setMessages(result.data)
      setHasMoreMessages(result.hasMore)
      setMessagesCursor(result.nextCursor)

      // Métricas de performance
      const loadTime = performance.now() - startTime
      setPerformanceMetrics(prev => ({
        ...prev,
        messageLoadTime: loadTime
      }))

      if (loadTime > 300) {
        console.warn(`⚠️ Carregamento de mensagens lento: ${loadTime.toFixed(2)}ms`)
      } else {
        console.log(`✅ Mensagens carregadas em ${loadTime.toFixed(2)}ms`)
      }

    } catch (error) {
      setMessagesError(error instanceof Error ? error.message : 'Erro ao carregar mensagens')
      console.error('Erro ao carregar mensagens:', error)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [userId])

  // Carregar mais mensagens (scroll infinito)
  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || isLoadingMessages || !currentConversationId || !messagesCursor) return

    setIsLoadingMessages(true)

    try {
      const result: PaginationResult<ChatMessage> = await optimizedChatService.getConversationMessagesOptimized(
        currentConversationId,
        userId,
        50,
        messagesCursor
      )

      // Adicionar mensagens ao início (mensagens mais antigas)
      setMessages(prev => [...result.data, ...prev])
      setHasMoreMessages(result.hasMore)
      setMessagesCursor(result.nextCursor)

    } catch (error) {
      console.error('Erro ao carregar mais mensagens:', error)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [hasMoreMessages, isLoadingMessages, currentConversationId, messagesCursor, userId])

  // Busca otimizada
  const searchConversations = useCallback(async (term: string) => {
    if (!userId || !term || term.trim().length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const startTime = performance.now()

    try {
      const results = await optimizedChatService.searchConversationsAndMessages(
        term.trim(),
        userId,
        20
      )

      setSearchResults(results)

      // Métricas de performance
      const searchTime = performance.now() - startTime
      setPerformanceMetrics(prev => ({
        ...prev,
        searchTime
      }))

      if (searchTime > 200) {
        console.warn(`⚠️ Busca lenta: ${searchTime.toFixed(2)}ms`)
      } else {
        console.log(`✅ Busca executada em ${searchTime.toFixed(2)}ms`)
      }

    } catch (error) {
      console.error('Erro na busca:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [userId])

  // Carregar estatísticas do usuário
  const loadChatStats = useCallback(async () => {
    if (!userId) return

    try {
      const stats = await optimizedChatService.getUserChatStats(userId)
      setChatStats(stats)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
    }
  }, [userId])

  // Carregar conversas na inicialização
  useEffect(() => {
    if (userId && isOptimized) {
      loadConversations(true)
      loadChatStats()
    }
  }, [userId, isOptimized])

  // Memoizar valores para evitar re-renders desnecessários
  const memoizedReturn = useMemo(() => ({
    // Conversas
    conversations,
    isLoadingConversations,
    conversationsError,
    loadMoreConversations,
    hasMoreConversations,
    
    // Mensagens
    messages,
    isLoadingMessages,
    messagesError,
    loadMoreMessages,
    hasMoreMessages,
    
    // Ações
    loadConversation,
    searchConversations,
    searchResults,
    isSearching,
    
    // Estatísticas
    chatStats,
    loadChatStats,
    
    // Estado geral
    isOptimized,
    performanceMetrics
  }), [
    conversations, isLoadingConversations, conversationsError, loadMoreConversations, hasMoreConversations,
    messages, isLoadingMessages, messagesError, loadMoreMessages, hasMoreMessages,
    loadConversation, searchConversations, searchResults, isSearching,
    chatStats, loadChatStats,
    isOptimized, performanceMetrics
  ])

  return memoizedReturn
}

// Hook para métricas de performance
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState({
    averageConversationLoadTime: 0,
    averageMessageLoadTime: 0,
    averageSearchTime: 0,
    totalOperations: 0,
    slowOperations: 0
  })

  const recordMetric = useCallback((operation: string, time: number) => {
    setMetrics(prev => {
      const isSlow = time > (operation === 'search' ? 200 : operation === 'messages' ? 300 : 500)
      
      return {
        ...prev,
        [`average${operation.charAt(0).toUpperCase() + operation.slice(1)}LoadTime`]: 
          (prev[`average${operation.charAt(0).toUpperCase() + operation.slice(1)}LoadTime` as keyof typeof prev] as number + time) / 2,
        totalOperations: prev.totalOperations + 1,
        slowOperations: prev.slowOperations + (isSlow ? 1 : 0)
      }
    })
  }, [])

  const getPerformanceReport = useCallback(() => {
    const slowPercentage = metrics.totalOperations > 0 
      ? (metrics.slowOperations / metrics.totalOperations) * 100 
      : 0

    return {
      ...metrics,
      slowOperationPercentage: slowPercentage,
      performanceRating: slowPercentage < 10 ? 'Excelente' : 
                         slowPercentage < 25 ? 'Bom' : 
                         slowPercentage < 50 ? 'Razoável' : 'Precisa melhorar'
    }
  }, [metrics])

  return {
    recordMetric,
    getPerformanceReport,
    metrics
  }
} 