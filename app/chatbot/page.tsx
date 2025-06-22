'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChatInterface } from '@/components/chat/chat-interface'
import { ConversationSidebar } from '@/components/conversations/conversation-sidebar'
import { ChatHeader } from '@/components/chat/chat-header'
import { Sparkles, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function ChatbotPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [currentConversationTitle, setCurrentConversationTitle] = useState('Nova Conversa')
  const chatInterfaceRef = useRef<{ startNewConversation: () => void; loadConversation: (id: string) => void; conversationId: string | null }>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/')
    }
  }, [user, loading, router])

  const handleSelectConversation = async (id: string) => {
    setCurrentConversationId(id)
    
    // Buscar título real da conversa
    try {
      const response = await fetch(`/api/conversations?userId=${user?.id}`)
      const data = await response.json()
      
      if (data.success && data.conversations) {
        const conversation = data.conversations.find((conv: any) => conv.id === id)
        if (conversation) {
          setCurrentConversationTitle(conversation.title || 'Conversa sem título')
        }
      }
    } catch (error) {
      console.error('Erro ao buscar título da conversa:', error)
      setCurrentConversationTitle('Conversa')
    }

    // Carregar conversa no chat interface
    if (chatInterfaceRef.current) {
      chatInterfaceRef.current.loadConversation(id)
    }
  }

  const handleNewConversation = () => {
    setCurrentConversationId(null)
    setCurrentConversationTitle('Nova Conversa')
    
    // Iniciar nova conversa no chat interface
    if (chatInterfaceRef.current) {
      chatInterfaceRef.current.startNewConversation()
    }
  }

  // Atualizar título quando a conversa for criada
  useEffect(() => {
    const handleConversationCreated = (event: CustomEvent) => {
      const { conversationId, title } = event.detail
      setCurrentConversationId(conversationId)
      setCurrentConversationTitle(title || 'Nova Conversa')
    }

    window.addEventListener('conversationCreated', handleConversationCreated as EventListener)
    return () => {
      window.removeEventListener('conversationCreated', handleConversationCreated as EventListener)
    }
  }, [])

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md mx-4">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Carregando Chat</h3>
              <p className="text-sm text-gray-500 mt-1">Conectando ao servidor...</p>
            </div>
            <div className="text-xs text-gray-400">
              Se demorar mais que o esperado, recarregue a página
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Layout Principal - Removido header redundante para maximizar espaço do chat */}
        {/* Sidebar de Conversas */}
        <ConversationSidebar
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
        />

        {/* Área de Chat */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header do Chat */}
          <ChatHeader
            conversationTitle={currentConversationTitle}
            isOnline={true}
            lastSeen="agora"
          />

          {/* Interface de Chat */}
          <div className="flex-1 bg-gray-50 min-h-0">
            <ChatInterface ref={chatInterfaceRef} />
          </div>
        </div>
    </div>
  )
} 