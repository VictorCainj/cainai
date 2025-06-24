import { useState, useCallback } from 'react'

interface Conversation {
  id: string
  title: string
  last_message: string
  created_at: string
  updated_at: string
  message_count: number
}

interface UseSimpleConversationsReturn {
  conversations: Conversation[]
  loading: boolean
  error: string | null
  loadConversations: (userId: string) => Promise<void>
  refreshConversations: () => Promise<void>
}

export function useSimpleConversations(): UseSimpleConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const loadConversations = useCallback(async (userId: string) => {
    if (!userId) {
      setError('UserId é obrigatório')
      return
    }

    setLoading(true)
    setError(null)
    setCurrentUserId(userId)

    try {
      const response = await fetch(`/api/conversations?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setConversations(data.conversations || [])
      } else {
        setError(data.error || 'Erro ao carregar conversas')
        setConversations([])
      }
    } catch (err) {
      setError('Erro de conexão')
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshConversations = useCallback(async () => {
    if (currentUserId) {
      await loadConversations(currentUserId)
    }
  }, [currentUserId, loadConversations])

  return {
    conversations,
    loading,
    error,
    loadConversations,
    refreshConversations
  }
} 