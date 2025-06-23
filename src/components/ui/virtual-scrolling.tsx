'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface VirtualScrollingProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
  onScrollEnd?: () => void
  isLoading?: boolean
  hasMore?: boolean
  loadingComponent?: React.ReactNode
}

export function VirtualScrolling<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScrollEnd,
  isLoading = false,
  hasMore = false,
  loadingComponent
}: VirtualScrollingProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  // Calcular índices visíveis
  const visibleRange = useMemo(() => {
    const containerStartIndex = Math.floor(scrollTop / itemHeight)
    const containerEndIndex = Math.min(
      containerStartIndex + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    )

    const startIndex = Math.max(0, containerStartIndex - overscan)
    const endIndex = Math.min(items.length - 1, containerEndIndex + overscan)

    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  // Itens visíveis
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index
    }))
  }, [items, visibleRange])

  // Altura total do conteúdo
  const totalHeight = items.length * itemHeight

  // Offset do primeiro item visível
  const offsetY = visibleRange.startIndex * itemHeight

  // Handler de scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop
    setScrollTop(scrollTop)

    // Detectar scroll no fim para lazy loading
    if (onScrollEnd && hasMore && !isLoading) {
      const { scrollHeight, clientHeight } = e.currentTarget
      const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 100 // 100px antes do fim
      
      if (scrolledToBottom) {
        onScrollEnd()
      }
    }
  }, [onScrollEnd, hasMore, isLoading])

  // Scroll para um item específico
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!scrollElementRef.current) return

    const maxScrollTop = totalHeight - containerHeight
    let targetScrollTop: number

    switch (align) {
      case 'center':
        targetScrollTop = index * itemHeight - containerHeight / 2 + itemHeight / 2
        break
      case 'end':
        targetScrollTop = index * itemHeight - containerHeight + itemHeight
        break
      default: // 'start'
        targetScrollTop = index * itemHeight
    }

    // Limitar ao range válido
    targetScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop))

    scrollElementRef.current.scrollTop = targetScrollTop
  }, [itemHeight, containerHeight, totalHeight])

  // Scroll suave para um item
  const scrollToIndexSmooth = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!scrollElementRef.current) return

    const maxScrollTop = totalHeight - containerHeight
    let targetScrollTop: number

    switch (align) {
      case 'center':
        targetScrollTop = index * itemHeight - containerHeight / 2 + itemHeight / 2
        break
      case 'end':
        targetScrollTop = index * itemHeight - containerHeight + itemHeight
        break
      default: // 'start'
        targetScrollTop = index * itemHeight
    }

    // Limitar ao range válido
    targetScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop))

    scrollElementRef.current.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    })
  }, [itemHeight, containerHeight, totalHeight])

  // Expor funções de scroll via ref
  const imperativeHandle = {
    scrollToIndex,
    scrollToIndexSmooth,
    scrollToTop: () => scrollToIndex(0),
    scrollToBottom: () => scrollToIndex(items.length - 1, 'end')
  }

  // Hook para permitir acesso externo às funções
  useEffect(() => {
    if (scrollElementRef.current) {
      (scrollElementRef.current as any).virtualScrollAPI = imperativeHandle
    }
  }, [imperativeHandle])

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Container com altura total */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Itens visíveis */}
        <div 
          style={{ 
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{ 
                height: itemHeight,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}

          {/* Loading indicator no final */}
          {hasMore && isLoading && (
            <div 
              style={{ 
                height: itemHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {loadingComponent || (
                <div className="text-gray-500 text-sm">Carregando...</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Hook para usar virtual scrolling facilmente
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0)
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    )
    
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, items.length])

  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index
    }))
  }, [items, visibleRange])

  return {
    visibleItems,
    visibleRange,
    totalHeight: items.length * itemHeight,
    offsetY: visibleRange.startIndex * itemHeight,
    handleScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop)
    }
  }
}

// Componente especializado para conversas
interface ConversationVirtualScrollProps {
  conversations: any[]
  onSelectConversation: (id: string) => void
  currentConversationId?: string | null
  isLoading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  className?: string
}

export function ConversationVirtualScroll({
  conversations,
  onSelectConversation,
  currentConversationId,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  className = ''
}: ConversationVirtualScrollProps) {
  const ITEM_HEIGHT = 76 // Altura aproximada de um item de conversa
  const CONTAINER_HEIGHT = 600 // Altura do container

  const renderConversationItem = useCallback((conversation: any, index: number) => (
    <div
      key={conversation.id}
      className="group relative cursor-pointer transition-all duration-200 m-1"
      onClick={() => onSelectConversation(conversation.id)}
    >
      <div className={`border rounded-lg p-3 transition-all duration-200 shadow-sm ${
        currentConversationId === conversation.id
          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 shadow-md'
          : 'bg-white dark:bg-neutral-700 border-gray-200 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-600'
      }`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-medium truncate ${
              currentConversationId === conversation.id 
                ? 'text-blue-700 dark:text-blue-300' 
                : 'text-gray-800 dark:text-neutral-200'
            }`}>
              {conversation.title || 'Conversa sem título'}
            </h3>
            <p className={`text-xs line-clamp-1 mt-1 ${
              currentConversationId === conversation.id 
                ? 'text-gray-600 dark:text-neutral-300' 
                : 'text-gray-500 dark:text-neutral-400'
            }`}>
              {conversation.last_message || 'Sem mensagens'}
            </p>
          </div>
        </div>
      </div>
    </div>
  ), [onSelectConversation, currentConversationId])

  return (
    <VirtualScrolling
      items={conversations}
      itemHeight={ITEM_HEIGHT}
      containerHeight={CONTAINER_HEIGHT}
      renderItem={renderConversationItem}
      onScrollEnd={onLoadMore}
      isLoading={isLoading}
      hasMore={hasMore}
      className={className}
      loadingComponent={
        <div className="flex items-center justify-center space-x-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-sm">Carregando conversas...</span>
        </div>
      }
    />
  )
} 