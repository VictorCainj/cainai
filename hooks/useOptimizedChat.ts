import { useState, useCallback, useEffect } from 'react'
import { optimizedChatService, OptimizedConversationWithMessages, PaginationResult } from '../lib/optimized-chat-service'
import type { ChatMessage } from '../lib/supabase'

interface UseOptimizedChatReturn {
  conversations: OptimizedConversationWithMessages[]
  isLoadingConversations: boolean
  loadConversation: (id: string) => Promise<void>
  messages: ChatMessage[]
  isLoadingMessages: boolean
  searchConversations: (term: string) => Promise<void>
  searchResults: any[]
  isOptimized: boolean
  performanceMetrics: {
    conversationLoadTime: number | null
    messageLoadTime: number | null
  }
}

export function useOptimizedChat(userId: string): UseOptimizedChatReturn {
  const [conversations, setConversations] = useState<OptimizedConversationWithMessages[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isOptimized, setIsOptimized] = useState(false)
  const [performanceMetrics, setPerformanceMetrics] = useState({
    conversationLoadTime: null as number | null,
    messageLoadTime: null as number | null
  })

  // Verificar se serviço otimizado está disponível
  useEffect(() => {
    const checkOptimized = async () => {
      const isHealthy = await optimizedChatService.healthCheck()
      setIsOptimized(isHealthy)
      
      if (isHealthy) {
        console.log('✅ Serviço otimizado ativo!')
      } else {
        console.warn('⚠️ Fallback para serviço padrão')
      }
    }
    
    checkOptimized()
  }, [])

  // Carregar conversas otimizado
  const loadConversations = useCallback(async () => {
    if (!userId) return

    setIsLoadingConversations(true)
    const startTime = performance.now()
    
    try {
      const result = await optimizedChatService.getUserConversationsOptimized(userId, 50, 0)
      setConversations(result)
      
      const loadTime = performance.now() - startTime
      setPerformanceMetrics(prev => ({ ...prev, conversationLoadTime: loadTime }))
      
      if (loadTime > 500) {
        console.warn(`⚠️ Carregamento lento: ${loadTime.toFixed(2)}ms`)
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
    } finally {
      setIsLoadingConversations(false)
    }
  }, [userId])

  // Carregar conversa específica
  const loadConversation = useCallback(async (id: string) => {
    if (!userId) return

    setIsLoadingMessages(true)
    const startTime = performance.now()

    try {
      const result: PaginationResult<ChatMessage> = await optimizedChatService.getConversationMessagesOptimized(id, userId, 50)
      setMessages(result.data)
      
      const loadTime = performance.now() - startTime
      setPerformanceMetrics(prev => ({ ...prev, messageLoadTime: loadTime }))
      
      if (loadTime > 300) {
        console.warn(`⚠️ Mensagens lentas: ${loadTime.toFixed(2)}ms`)
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
    } finally {
      setIsLoadingMessages(false)
    }
  }, [userId])

  // Busca otimizada
  const searchConversations = useCallback(async (term: string) => {
    if (!userId || !term || term.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const results = await optimizedChatService.searchConversationsAndMessages(term, userId, 20)
      setSearchResults(results)
    } catch (error) {
      console.error('Erro na busca:', error)
      setSearchResults([])
    }
  }, [userId])

  // Carregar conversas na inicialização
  useEffect(() => {
    if (userId && isOptimized) {
      loadConversations()
    }
  }, [userId, isOptimized, loadConversations])

  return {
    conversations,
    isLoadingConversations,
    loadConversation,
    messages,
    isLoadingMessages,
    searchConversations,
    searchResults,
    isOptimized,
    performanceMetrics
  }
} 