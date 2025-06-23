import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { cacheService } from './cache-service'
import { lazyLoadingService } from './lazy-loading-service'
import { compressionService } from './compression-service'
import { chatService } from './chat-service'

// Hook para cache inteligente
export function useSmartCache() {
  const [cacheStats, setCacheStats] = useState(cacheService.getStats())

  useEffect(() => {
    const updateStats = () => {
      setCacheStats(cacheService.getStats())
    }

    // Atualizar stats a cada 5 segundos
    const interval = setInterval(updateStats, 5000)
    return () => clearInterval(interval)
  }, [])

  const clearCache = useCallback(() => {
    cacheService.clear()
    setCacheStats(cacheService.getStats())
  }, [])

  const invalidatePattern = useCallback((pattern: RegExp) => {
    cacheService.invalidatePattern(pattern)
    setCacheStats(cacheService.getStats())
  }, [])

  const configureCacheService = useCallback((config: any) => {
    cacheService.configure(config)
  }, [])

  return {
    cacheStats,
    clearCache,
    invalidatePattern,
    configureCacheService,
    // Funções de cache específicas
    cacheConversations: cacheService.cacheConversations.bind(cacheService),
    getCachedConversations: cacheService.getCachedConversations.bind(cacheService),
    cacheMessages: cacheService.cacheMessages.bind(cacheService),
    getCachedMessages: cacheService.getCachedMessages.bind(cacheService)
  }
}

// Hook para lazy loading de conversas
export function useLazyConversations(userId: string | null) {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const loadConversations = useCallback(async (page: number = 0, isLoadMore: boolean = false) => {
    if (!userId) return

    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setError(null)
      }

      const result = await lazyLoadingService.loadConversations(userId, page)
      
      if (isLoadMore) {
        setConversations(prev => [...prev, ...result.conversations])
      } else {
        setConversations(result.conversations)
      }
      
      setHasMore(result.hasMore)
      setCurrentPage(page)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar conversas'
      setError(errorMessage)
      console.error('Erro no lazy loading:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [userId])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadConversations(currentPage + 1, true)
    }
  }, [loadConversations, currentPage, hasMore, loadingMore])

  const refresh = useCallback(() => {
    setCurrentPage(0)
    setHasMore(true)
    loadConversations(0, false)
  }, [loadConversations])

  // Carregar inicial
  useEffect(() => {
    if (userId) {
      loadConversations(0, false)
    }
  }, [userId])

  return {
    conversations,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    currentPage
  }
}

// Hook para lazy loading de mensagens
export function useLazyMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)

  const loadMessages = useCallback(async (cursor?: string, isLoadMore: boolean = false) => {
    if (!conversationId) return

    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setError(null)
      }

      const result = await lazyLoadingService.loadMessages(conversationId, cursor)
      
      if (isLoadMore) {
        // Adicionar mensagens mais antigas no início
        setMessages(prev => [...result.messages, ...prev])
      } else {
        setMessages(result.messages)
      }
      
      setHasMore(result.hasMore)
      setNextCursor(result.nextCursor)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar mensagens'
      setError(errorMessage)
      console.error('Erro no lazy loading de mensagens:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [conversationId])

  const loadOlderMessages = useCallback(() => {
    if (!loadingMore && hasMore && nextCursor) {
      loadMessages(nextCursor, true)
    }
  }, [loadMessages, nextCursor, hasMore, loadingMore])

  const refresh = useCallback(() => {
    setMessages([])
    setNextCursor(undefined)
    setHasMore(true)
    loadMessages(undefined, false)
  }, [loadMessages])

  // Carregar inicial
  useEffect(() => {
    if (conversationId) {
      refresh()
    }
  }, [conversationId])

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    loadOlderMessages,
    refresh
  }
}

// Hook para compressão de dados
export function useCompression() {
  const [compressionStats, setCompressionStats] = useState(compressionService.getStats())

  useEffect(() => {
    const updateStats = () => {
      setCompressionStats(compressionService.getStats())
    }

    // Atualizar stats a cada 10 segundos
    const interval = setInterval(updateStats, 10000)
    return () => clearInterval(interval)
  }, [])

  const compressMessage = useCallback((content: string, metadata?: any) => {
    const result = compressionService.compressMessage(content, metadata)
    setCompressionStats(compressionService.getStats())
    return result
  }, [])

  const decompressMessage = useCallback((compressedData: any) => {
    return compressionService.decompressMessage(compressedData)
  }, [])

  const resetStats = useCallback(() => {
    compressionService.resetStats()
    setCompressionStats(compressionService.getStats())
  }, [])

  return {
    compressionStats,
    compressMessage,
    decompressMessage,
    resetStats
  }
}

// Hook para virtual scrolling
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
  }, [items, visibleRange])

  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.startIndex * itemHeight

  const onScroll = useCallback((scrollTop: number) => {
    setScrollTop(scrollTop)
  }, [])

  return {
    visibleItems,
    visibleRange,
    totalHeight,
    offsetY,
    onScroll
  }
}

// Hook para performance monitoring removido para produção

// Hook combinado para conversas otimizadas removido para produção