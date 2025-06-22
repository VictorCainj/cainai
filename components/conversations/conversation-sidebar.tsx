'use client'

import React, { useState, useEffect } from 'react'
import { MessageCircle, Plus, Search, Clock, Check, CheckCheck, Trash2, MoreVertical, Loader2, CheckCircle2, AlertCircle, X, MessageSquare, MoreHorizontal, Calendar, User } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { sessionManager } from '@/lib/session'
import { chatService } from '@/lib/chat-service'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/auth/user-menu'

interface Conversation {
  id: string
  title: string
  lastMessage: string
  timestamp: string
  unreadCount: number
  isOnline: boolean
  avatar?: string
  status: 'sent' | 'delivered' | 'read'
  created_at?: string
  updated_at?: string
  last_message?: string
  message_count?: number
}

interface ConversationSidebarProps {
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
}

export function ConversationSidebar({ 
  currentConversationId, 
  onSelectConversation, 
  onNewConversation 
}: ConversationSidebarProps) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingConversations, setDeletingConversations] = useState<Set<string>>(new Set())
  const [notifications, setNotifications] = useState<{id: string, message: string, type: 'success' | 'error'}[]>([])
  const [orphanedConversations, setOrphanedConversations] = useState<any[]>([])
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  // Obter userId
  const userId = sessionManager.getUserId() || user?.id

  // Fechar menu de exclusão ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDeleteMenu(null)
    }

    if (showDeleteMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showDeleteMenu])

  // Carregar conversas reais do Supabase
  const loadConversations = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const conversationsData = await chatService.getUserConversations(userId)
      
      if (conversationsData && conversationsData.length > 0) {
        // Converter dados da API para o formato do componente
        const formattedConversations: Conversation[] = conversationsData.map((conv: any) => ({
          id: conv.id,
          title: conv.title || 'Conversa sem título',
          lastMessage: conv.last_message || 'Nenhuma mensagem ainda',
          timestamp: formatTimestamp(conv.updated_at || conv.created_at),
          unreadCount: 0, // Pode ser implementado depois
          isOnline: true, // Sempre online para IA
          status: 'read' as const,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          last_message: conv.last_message,
          message_count: conv.message_count || 0
        }))
        
        setConversations(formattedConversations)
      } else {
        setConversations([])
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  // Verificar conversas órfãs (apenas para usuários autenticados)
  const checkOrphanedConversations = async () => {
    if (!user || !userId) return

    try {
      // Buscar conversas que podem estar órfãs no localStorage
      const localSessionData = localStorage.getItem('chat_session_user')
      if (localSessionData) {
        const sessionUser = JSON.parse(localSessionData)
        
        // Se o sessionUser.id é diferente do user.id, pode haver conversas órfãs
        if (sessionUser.id !== user.id && sessionUser.isAnonymous) {
          // Verificar se existem conversas no Supabase com o ID anônimo
          const response = await fetch(`/api/conversations/diagnostics?anonymousId=${sessionUser.id}&userId=${user.id}`)
          const data = await response.json()
          
          if (data.orphanedConversations && data.orphanedConversations.length > 0) {
            setOrphanedConversations(data.orphanedConversations)
            setShowMigrationPrompt(true)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar conversas órfãs:', error)
    }
  }

  // Migrar conversas órfãs
  const migrateOrphanedConversations = async () => {
    if (!user || orphanedConversations.length === 0) return

    try {
      setMigrating(true)
      
      const response = await fetch('/api/conversations/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fromUserId: orphanedConversations[0]?.user_id,
          toUserId: user.id
        })
      })

      const result = await response.json()
      
      if (result.success) {
        showNotification(`${result.migratedCount} conversas migradas com sucesso!`, 'success')
        setShowMigrationPrompt(false)
        setOrphanedConversations([])
        
        // Atualizar sessionManager para usar o novo userId
        sessionManager.signOut()
        await sessionManager.signInWithSupabase()
        
        // Recarregar conversas
        setTimeout(() => loadConversations(), 1000)
      } else {
        showNotification(`Erro na migração: ${result.error}`, 'error')
      }
    } catch (error) {
      showNotification('Erro ao migrar conversas', 'error')
    } finally {
      setMigrating(false)
    }
  }

  // Carregar conversas quando o componente monta
  useEffect(() => {
    loadConversations()
  }, [userId])

  // Verificar conversas órfãs quando o usuário estiver autenticado
  useEffect(() => {
    if (user && !loading) {
      setTimeout(() => checkOrphanedConversations(), 2000)
    }
  }, [user, loading])

  // Recarregar conversas a cada 2 minutos para capturar novas conversas (menos frequente)
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations()
    }, 120000) // 2 minutos ao invés de 30 segundos

    return () => clearInterval(interval)
  }, [userId])

  // Função para formatar timestamp
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 1) {
      return 'agora'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`
    } else if (diffInHours < 24) {
      return `${diffInHours}h`
    } else if (diffInDays === 1) {
      return 'ontem'
    } else if (diffInDays < 7) {
      return `${diffInDays}d`
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Check className="w-4 h-4 text-gray-400" />
      case 'delivered': return <CheckCheck className="w-4 h-4 text-gray-400" />
      case 'read': return <CheckCheck className="w-4 h-4 text-blue-500" />
      default: return null
    }
  }

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      if (!conversationId) {
        showNotification('Erro: ID da conversa não encontrado', 'error')
        return
      }

      if (!userId) {
        showNotification('Erro: Usuário não identificado', 'error')
        return
      }

      // Marcar como "excluindo" para feedback visual
      setDeletingConversations(prev => new Set(Array.from(prev).concat(conversationId)))
      setShowDeleteMenu(null)
      
      // Se a conversa excluída era a atual, limpar seleção
      if (currentConversationId === conversationId) {
        onSelectConversation('')
      }

      let apiError: any = null
      let chatServiceError: any = null

      // Método 1: Tentar exclusão via API REST primeiro
      try {
        const apiUrl = `/api/conversations/${conversationId}?userId=${userId}`
        
        const response = await fetch(apiUrl, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        const result = await response.json()
        
        if (!response.ok || !result.success) {
          console.warn('Exclusão via API falhou:', result.error)
          apiError = new Error(`API Error: ${result.error || `Status ${response.status}`}`)
          throw apiError
        }
        
        // Se chegou aqui, deu sucesso na API
        console.log('Conversa excluída via API com sucesso')
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
        showNotification('Conversa excluída com sucesso!', 'success')
        
        return // Sair da função se sucesso

      } catch (error) {
        apiError = error
        console.warn('Tentando fallback via chat-service...')
        
        // Método 2: Fallback via chat-service diretamente
        try {
          const success = await chatService.deleteConversation(conversationId)
          
          if (!success) {
            chatServiceError = new Error('Exclusão falhou em todos os métodos do servidor')
            throw chatServiceError
          }
          
          // Se chegou aqui, deu sucesso no chat-service
          console.log('Conversa excluída via chat-service com sucesso')
          setConversations(prev => prev.filter(conv => conv.id !== conversationId))
          showNotification('Conversa excluída com sucesso!', 'success')
          
          return // Sair da função se sucesso
          
        } catch (chatError) {
          chatServiceError = chatError
          console.warn('Chat-service também falhou:', chatError)
        }
      }

      // Método 3: Exclusão apenas local como último recurso
      console.log('Tentando exclusão apenas local...')
      
      // Remover da lista local mesmo que o servidor tenha falhado
      setConversations(prev => prev.filter(conv => conv.id !== conversationId))
      
      // Mostrar aviso de que foi removida apenas localmente
      showNotification(
        'Conversa removida da lista (pode reaparecer no próximo carregamento). Tente novamente se necessário.', 
        'error'
      )
      
             return // Não jogar erro, pois fizemos exclusão local

    } catch (error) {
      // Este bloco só seria executado se houvesse um erro inesperado
      console.error('Erro inesperado na exclusão:', error)
      
      // Recarregar lista para restaurar estado correto
      loadConversations()
      
      // Mostrar erro para o usuário
      const errorMessage = error instanceof Error ? error.message : 'Erro inesperado'
      showNotification(`Erro inesperado: ${errorMessage}`, 'error')
    } finally {
      // Remover do estado "excluindo"
      setDeletingConversations(prev => {
        const newSet = new Set(prev)
        newSet.delete(conversationId)
        return newSet
      })
    }
  }

  // Expor função para atualizar lista (pode ser chamada pelo componente pai)
  const forceRefresh = () => {
    loadConversations()
  }

  // Listener para novas conversas criadas (via custom event)
  useEffect(() => {
    const handleNewConversation = () => {
      // Recarregar conversas quando uma nova for criada
      setTimeout(() => loadConversations(), 1000)
    }

    window.addEventListener('conversationCreated', handleNewConversation)
    return () => window.removeEventListener('conversationCreated', handleNewConversation)
  }, [])

  // Função para mostrar notificações
  const showNotification = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString()
    setNotifications(prev => [...prev, { id, message, type }])
    
    // Remover notificação após 3 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 3000)
  }

  // Remover notificação manualmente
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="w-80 bg-gray-50 dark:bg-neutral-800 border-r border-gray-200 dark:border-neutral-700 flex flex-col h-full relative overflow-hidden">
      {/* Header */}
      <div className="relative z-10 p-4 border-b border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg flex items-center justify-center shadow-sm">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-neutral-200">Conversas</h2>
              <p className="text-xs text-blue-600 dark:text-blue-400">Assistente IA</p>
            </div>
          </div>
        </div>

        {/* New Conversation Button */}
        <Button
          onClick={onNewConversation}
          className="w-full py-3 mb-4 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-lg shadow-sm transition-all duration-200"
          disabled={loading}
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="font-medium">Nova Conversa</span>
        </Button>

        {/* Search Bar */}
        <div className="relative">
          <div className="bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-neutral-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar conversas..."
                className="w-full pl-10 pr-4 py-2 bg-transparent border-none text-gray-700 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-hidden relative z-10">
        <div className="h-full overflow-y-auto custom-scrollbar p-2">
          {loading ? (
            <div className="space-y-3 p-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg p-3 animate-pulse shadow-sm">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-neutral-600 rounded"></div>
                    <div className="h-3 bg-gray-100 dark:bg-neutral-500 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center">
              <div className="bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg p-6 shadow-sm">
                <MessageSquare className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                <p className="text-gray-700 dark:text-neutral-200 mb-2">
                  {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
                </p>
                {!searchTerm && (
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    Inicie uma nova conversa para começar
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conversation, index) => (
                <div
                  key={conversation.id}
                  className={`group relative cursor-pointer transition-all duration-200`}
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className={`border rounded-lg p-3 m-1 transition-all duration-200 shadow-sm ${
                    currentConversationId === conversation.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 shadow-md'
                      : 'bg-white dark:bg-neutral-700 border-gray-200 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-600 hover:border-gray-300 dark:hover:border-neutral-500'
                  }`}>
                    
                    {/* Conversation Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-medium truncate ${
                          currentConversationId === conversation.id ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-neutral-200'
                        }`}>
                          {conversation.title || 'Conversa sem título'}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs text-gray-500 dark:text-neutral-400">
                             {formatTimestamp(conversation.updated_at || conversation.created_at || new Date().toISOString())}
                           </span>
                        </div>
                      </div>
                      
                      {/* Actions Menu */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpen(menuOpen === conversation.id ? null : conversation.id)
                          }}
                          className="h-6 w-6 p-0 text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200"
                        >
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Last Message Preview */}
                    <div className="space-y-2">
                      <p className={`text-xs line-clamp-2 ${
                        currentConversationId === conversation.id ? 'text-gray-600 dark:text-neutral-300' : 'text-gray-500 dark:text-neutral-400'
                      }`}>
                        {conversation.last_message || 'Sem mensagens'}
                      </p>
                      
                      {/* Conversation Stats */}
                      <div className="flex items-center justify-between">
                                                  <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              {conversation.message_count || 0}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-gray-400 dark:text-neutral-400" />
                            <span className="text-xs text-gray-400 dark:text-neutral-400">
                               {formatTimestamp(conversation.updated_at || conversation.created_at || new Date().toISOString())}
                             </span>
                          </div>
                        </div>
                        
                        {/* Active indicator */}
                        {currentConversationId === conversation.id && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </div>

                    {/* Dropdown Menu */}
                    {menuOpen === conversation.id && (
                      <div className="absolute right-2 top-12 z-20 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-lg min-w-[160px]">
                        <div className="py-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteConversation(conversation.id)
                            }}
                            disabled={deletingConversations.has(conversation.id)}
                            className="w-full px-3 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex items-center space-x-2 text-sm"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                    )}


                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Info Footer */}
      <div className="relative z-10 p-4 border-t border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        {user ? (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-500 rounded-full flex items-center justify-center shadow-sm">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-neutral-200 truncate">
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'}
              </p>
              <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <div className="text-xs text-gray-500 dark:text-neutral-400">
              {filteredConversations.length} conversas
            </div>
          </div>
        )}
      </div>

      {/* Click outside handler for menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setMenuOpen(null)}
        />
      )}
    </div>
  )
} 