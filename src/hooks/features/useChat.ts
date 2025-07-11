import { useState, useCallback, useEffect } from 'react'
import { Message, LoadingState } from '../../types/features/chat'
import { chatApiService } from '../../services/chat'
import { useSession } from './useSession'

interface UseChatReturn {
  messages: Message[]
  loadingState: LoadingState
  sendMessage: (content: string) => Promise<void>
  loadConversation: (id: string) => Promise<void>
  startNewConversation: () => void
  isAnyLoading: boolean
}

export function useChat(): UseChatReturn {
  const { user } = useSession()
  const userId = user?.id || ''

  const [messages, setMessages] = useState<Message[]>([])
  const [loadingState, setLoadingState] = useState<LoadingState>({
    sendingMessage: false,
    loadingConversation: false,
    loadingHistory: false,
    savingMessage: false,
    generatingTTS: false,
    generatingImage: false
  })

  const updateLoadingState = useCallback((key: keyof LoadingState, value: boolean) => {
    setLoadingState(prev => ({ ...prev, [key]: value }))
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !userId) return

    updateLoadingState('sendingMessage', true)
    try {
      // Implementação simplificada
      console.log('Enviando mensagem:', content)
    } finally {
      updateLoadingState('sendingMessage', false)
    }
  }, [userId, updateLoadingState])

  const loadConversation = useCallback(async (id: string) => {
    updateLoadingState('loadingConversation', true)
    try {
      const result = await chatApiService.getConversationWithMessages(id, userId)
      setMessages(result.messages)
    } finally {
      updateLoadingState('loadingConversation', false)
    }
  }, [userId, updateLoadingState])

  const startNewConversation = useCallback(() => {
    setMessages([])
  }, [])

  const isAnyLoading = Object.values(loadingState).some(loading => loading)

  return {
    messages,
    loadingState,
    sendMessage,
    loadConversation,
    startNewConversation,
    isAnyLoading
  }
}
