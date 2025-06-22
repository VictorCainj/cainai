'use client'

import React, { useState, useEffect } from 'react'
import { MessageCircle, Plus, Search, Clock, Check, CheckCheck, Trash2, MoreVertical, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { sessionManager } from '@/lib/session'
import { chatService } from '@/lib/chat-service'

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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [deletingConversations, setDeletingConversations] = useState<Set<string>>(new Set())
  const [notifications, setNotifications] = useState<{id: string, message: string, type: 'success' | 'error'}[]>([])
  const [orphanedConversations, setOrphanedConversations] = useState<any[]>([])
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false)
  const [migrating, setMigrating] = useState(false)

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
      setLastUpdated(new Date())
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

      // Tentar exclusão via API REST primeiro
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
          apiError = new Error(`API Error: ${result.error || `Status ${response.status}`}`)
          throw apiError
        }
        
        // Se chegou aqui, deu sucesso na API
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
        showNotification('Conversa excluída com sucesso!', 'success')
        
        return // Sair da função se sucesso

      } catch (error) {
        apiError = error
        
        // Fallback: tentar via chat-service diretamente
        try {
          const success = await chatService.deleteConversation(conversationId)
          
          if (!success) {
            chatServiceError = new Error('Chat-service retornou false')
            throw chatServiceError
          }
          
          // Se chegou aqui, deu sucesso no chat-service
          setConversations(prev => prev.filter(conv => conv.id !== conversationId))
          showNotification('Conversa excluída com sucesso!', 'success')
          
          return // Sair da função se sucesso
          
        } catch (chatError) {
          chatServiceError = chatError
        }
      }

      // Se chegou aqui, ambos falharam
      throw new Error(`API: ${apiError?.message || 'desconhecido'} | ChatService: ${chatServiceError?.message || 'desconhecido'}`)

    } catch (error) {
      // Recarregar lista para restaurar estado correto
      loadConversations()
      
      // Mostrar erro para o usuário
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      showNotification(`Erro ao excluir conversa: ${errorMessage}`, 'error')
      
      // Log apenas em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao excluir conversa:', error)
      }
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
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full relative">
      {/* Prompt de Migração */}
      {showMigrationPrompt && orphanedConversations.length > 0 && (
        <div className="p-4 bg-yellow-50 border-b border-yellow-200">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-yellow-800 mb-1">
                Conversas anteriores encontradas
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                Encontramos {orphanedConversations.length} conversa(s) anteriores que não estão aparecendo. 
                Deseja migrá-las para sua conta?
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={migrateOrphanedConversations}
                  disabled={migrating}
                  className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50 flex items-center space-x-1"
                >
                  {migrating && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{migrating ? 'Migrando...' : 'Migrar'}</span>
                </button>
                <button
                  onClick={() => setShowMigrationPrompt(false)}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                >
                  Ignorar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header da Sidebar */}
      <div className="p-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Conversas</h2>
          <div className="flex items-center space-x-2">
            {/* Botão de Refresh */}
            <button
              onClick={loadConversations}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200 disabled:opacity-50"
              title="Atualizar conversas"
            >
              <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            {/* Botão Nova Conversa */}
            <button
              onClick={onNewConversation}
              className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors duration-200 shadow-md hover:shadow-lg"
              title="Nova Conversa"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Pesquisa */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar conversas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      {/* Lista de Conversas - área rolável */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-6 text-center text-gray-500">
            <Loader2 className="w-12 h-12 mx-auto mb-3 text-gray-300 animate-spin" />
            <p>Carregando conversas...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isDeleting = deletingConversations.has(conv.id)
            
            return (
              <div
                key={conv.id}
                className={`relative p-4 border-b border-gray-50 cursor-pointer transition-all duration-200 hover:bg-gray-50 group ${
                  currentConversationId === conv.id ? 'bg-blue-50 border-r-2 border-r-blue-500' : ''
                } ${isDeleting ? 'opacity-50 pointer-events-none bg-red-50' : ''}`}
              >
                {/* Indicador de exclusão */}
                {isDeleting && (
                  <div className="absolute inset-0 bg-red-100 bg-opacity-75 flex items-center justify-center z-10">
                    <div className="flex items-center space-x-2 text-red-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium">Excluindo...</span>
                    </div>
                  </div>
                )}
              <div 
                onClick={() => onSelectConversation(conv.id)}
                className="flex items-start space-x-3"
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  {/* Indicador Online */}
                  {conv.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>

                {/* Conteúdo da Conversa */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-900 truncate">{conv.title}</h3>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(conv.status)}
                      <span className="text-xs text-gray-500">{conv.timestamp}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                    {conv.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-500 rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Menu de Opções - aparece ao hover */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowDeleteMenu(showDeleteMenu === conv.id ? null : conv.id)
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors duration-200"
                    title="Opções da conversa"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Menu de Exclusão */}
                  {showDeleteMenu === conv.id && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`Tem certeza que deseja excluir a conversa "${conv.title}"?\n\nEsta ação irá excluir permanentemente a conversa e todas as suas mensagens e não pode ser desfeita.`)) {
                            handleDeleteConversation(conv.id)
                          }
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )
          })
        )}
      </div>

      {/* Footer com Status do Usuário - Área fixa na parte inferior */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.email || 'Usuário'}
            </p>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-500">Online</span>
            </div>
          </div>
        </div>
        
        {/* Status da última atualização */}
        {lastUpdated && (
          <div className="text-xs text-gray-400 text-center">
            Atualizado {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* Notificações */}
      {notifications.length > 0 && (
        <div className="absolute top-4 left-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg shadow-lg border-l-4 flex items-center justify-between animate-slide-in ${
                notification.type === 'success' 
                  ? 'bg-green-50 border-green-400 text-green-800' 
                  : 'bg-red-50 border-red-400 text-red-800'
              }`}
            >
              <div className="flex items-center space-x-2">
                {notification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm font-medium">{notification.message}</span>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 