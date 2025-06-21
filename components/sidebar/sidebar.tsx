'use client'

import React, { useEffect, useState } from 'react'
import { MessageSquare, Settings, Plus, Clock, Loader2, Trash2, RefreshCw, Bug, AlertTriangle, Search, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sessionManager } from '@/lib/session'
import { chatService } from '@/lib/chat-service'
import { DebugHelper } from '@/lib/debug-helper'

type Conversation = {
  id: string
  title: string
  created_at: string
  updated_at: string
  last_message: string
  message_count: number
}

type SidebarProps = {
  onNewConversation?: () => void
  onLoadConversation?: (id: string) => void
  currentConversationId?: string | null
}

export function Sidebar({ onNewConversation, onLoadConversation, currentConversationId }: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [serviceHealthy, setServiceHealthy] = useState(true)
  const [showDebug, setShowDebug] = useState(false)
  const [debugLogs, setDebugLogs] = useState<any[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'testing' | 'connected' | 'failed'>('unknown')
  const [searchTerm, setSearchTerm] = useState('')
  const [loadingConversation, setLoadingConversation] = useState<string | null>(null)

  // Estado de loading geral
  const isAnyLoading = isLoading || isDeleting !== null || loadingConversation !== null

  useEffect(() => {
    loadConversations()
    checkServiceHealth()
  }, [])

  const checkServiceHealth = async () => {
    try {
      const isHealthy = await chatService.healthCheck()
      setServiceHealthy(isHealthy)
      setConnectionStatus(isHealthy ? 'connected' : 'failed')
    } catch (error) {
      console.log('Erro ao verificar saúde do serviço:', error)
      setServiceHealthy(false)
      setConnectionStatus('failed')
    }
  }

  const testConnection = async () => {
    setConnectionStatus('testing')
    try {
      const result = await DebugHelper.testSupabaseConnection()
      setConnectionStatus(result.success ? 'connected' : 'failed')
      setServiceHealthy(result.success)
      
      if (!result.success) {
        alert(`Erro na conexão: ${result.error}`)
      } else {
        alert('Conexão com Supabase funcionando!')
      }
    } catch (error) {
      setConnectionStatus('failed')
      setServiceHealthy(false)
      alert('Erro ao testar conexão')
    }
  }

  const refreshDebugLogs = () => {
    const logs = DebugHelper.getLogs()
    setDebugLogs(logs)
  }

  const exportDebugData = () => {
    const debugPanel = DebugHelper.createDebugPanel()
    if (debugPanel) {
      debugPanel.export()
    }
  }

  const exportConversation = (conversation: Conversation) => {
    const conversationData = {
      title: conversation.title,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      message_count: conversation.message_count,
      last_message: conversation.last_message
    }
    
    const dataStr = JSON.stringify(conversationData, null, 2)
    const dataBlob = new Blob([dataStr], {type: 'application/json'})
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `conversa-${conversation.title.slice(0, 30)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const loadConversations = async () => {
    setIsLoading(true)
    try {
      const userId = sessionManager.getUserId()
      
      if (serviceHealthy) {
        // Usar o serviço de chat diretamente
        const conversationsData = await chatService.getUserConversations(userId)
        // Garantir que last_message sempre tenha um valor
        const normalizedConversations = conversationsData.map(conv => ({
          ...conv,
          last_message: conv.last_message || 'Sem mensagens'
        }))
        setConversations(normalizedConversations)
      } else {
        // Fallback: usar API REST
        const response = await fetch(`/api/conversations?userId=${userId}`)
        const data = await response.json()
        
        if (data.success) {
          setConversations(data.conversations || [])
        } else {
          console.error('Erro na API:', data.error)
          setConversations([])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
      setConversations([])
    } finally {
      setIsLoading(false)
    }
  }

  const deleteConversation = async (conversationId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    if (isAnyLoading) return
    
    if (!confirm('Tem certeza que deseja deletar esta conversa?')) {
      return
    }

    setIsDeleting(conversationId)
    try {
      const success = await chatService.deleteConversation(conversationId)
      
      if (success) {
        setConversations(prev => prev.filter(conv => conv.id !== conversationId))
        
        // Se a conversa deletada é a atual, criar nova conversa
        if (currentConversationId === conversationId) {
          onNewConversation?.()
        }
      } else {
        alert('Erro ao deletar conversa. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao deletar conversa:', error)
      alert('Erro ao deletar conversa. Tente novamente.')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleLoadConversation = (conversationId: string) => {
    if (isAnyLoading || loadingConversation === conversationId) return
    
    setLoadingConversation(conversationId)
    onLoadConversation?.(conversationId)
    
    // Reset loading state após um tempo
    setTimeout(() => setLoadingConversation(null), 3000)
  }

  const handleNewConversation = () => {
    if (isAnyLoading) return
    onNewConversation?.()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 48) {
      return 'Ontem'
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }
  }

  // Filtrar conversas baseado no termo de busca
  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.last_message.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-lg">Chat Assistant</h2>
            <p className="text-sm text-gray-400">Seu assistente de produtividade</p>
          </div>
        </div>

        {/* Nova Conversa */}
        <Button 
          onClick={handleNewConversation}
          disabled={isAnyLoading}
          className="w-full justify-start button-primary disabled:opacity-50"
          size="lg"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
          ) : (
            <Plus className="w-5 h-5 mr-3" />
          )}
          Nova Conversa
        </Button>
      </div>

      {/* Busca */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar conversas..."
            className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Histórico de Conversas */}
      <div className="flex-1 overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
              Histórico de Conversas
            </h3>
            <div className="flex items-center space-x-1">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              <button
                onClick={loadConversations}
                className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                title="Atualizar conversas"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Listagem de conversas */}
          <div className="space-y-2">
            {isLoading ? (
              // Loading skeleton
              <>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-gray-700 rounded"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa anterior'}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                  >
                    Limpar busca
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-full overflow-y-auto custom-scrollbar">
                {filteredConversations.map((conv, index) => (
                  <div
                    key={conv.id}
                    className={`relative group rounded-lg border transition-all duration-200 hover-lift animate-fade-in ${
                      currentConversationId === conv.id
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500 card-shadow'
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <button
                      onClick={() => handleLoadConversation(conv.id)}
                      disabled={isAnyLoading}
                      className="w-full text-left p-3 disabled:opacity-50"
                    >
                                          <div className="flex items-start space-x-3">
                          {loadingConversation === conv.id ? (
                            <Loader2 className="w-4 h-4 mt-1 flex-shrink-0 animate-spin text-blue-400" />
                          ) : (
                            <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0" />
                          )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-sm mb-1">{conv.title}</div>
                          <div className={`text-xs truncate mb-2 ${
                            currentConversationId === conv.id ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            {conv.last_message}
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span className="text-xs">{formatDate(conv.updated_at)}</span>
                            </div>
                            <span className="text-xs">• {conv.message_count} msgs</span>
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    {/* Ações da conversa */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          exportConversation(conv)
                        }}
                        className="p-1 hover:bg-blue-600 rounded text-gray-400 hover:text-white transition-all"
                        title="Exportar conversa"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      
                      {!conv.id.startsWith('temp') && (
                        <button
                          onClick={(e) => deleteConversation(conv.id, e)}
                          disabled={isDeleting === conv.id}
                          className="p-1 hover:bg-red-600 rounded text-gray-400 hover:text-white transition-all"
                          title="Deletar conversa"
                        >
                          {isDeleting === conv.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
          <Settings className="w-4 h-4" />
          <span>Configurações</span>
        </button>
        
        <div className="mt-3 p-3 bg-gray-700 rounded-lg">
          <div className="text-xs text-gray-400 mb-2 flex items-center justify-between">
            Status do Sistema
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-gray-400 hover:text-white"
              title="Debug"
            >
              <Bug className="w-3 h-3" />
            </button>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'testing' ? 'bg-yellow-500' : 
                connectionStatus === 'failed' ? 'bg-red-500' : 'bg-gray-500'
              }`}></div>
              <span className="text-xs text-gray-300">
                {connectionStatus === 'connected' ? 'Conectado' : 
                 connectionStatus === 'testing' ? 'Testando...' :
                 connectionStatus === 'failed' ? 'Modo Local' : 'Desconhecido'}
              </span>
              {connectionStatus === 'failed' && (
                <AlertTriangle className="w-3 h-3 text-yellow-500" />
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-300">
                {conversations.length} conversas
              </span>
            </div>

            {showDebug && (
              <div className="mt-2 pt-2 border-t border-gray-600">
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={testConnection}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                    disabled={connectionStatus === 'testing'}
                  >
                    {connectionStatus === 'testing' ? 'Testando...' : 'Testar'}
                  </button>
                  
                  <button
                    onClick={() => {
                      refreshDebugLogs()
                      const logs = DebugHelper.getLogs()
                      console.table(logs.slice(-10))
                      alert(`${logs.length} logs no console`)
                    }}
                    className="text-xs bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded"
                  >
                    Logs ({DebugHelper.getLogs().length})
                  </button>
                  
                  <button
                    onClick={exportDebugData}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                  >
                    Exportar
                  </button>

                  <button
                    onClick={() => {
                      DebugHelper.clearLogs()
                      alert('Logs limpos!')
                    }}
                    className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 