'use client'

import React, { useState, useRef, useEffect, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Bot, User, Loader2, Copy, CheckCircle2, AlertCircle, Sparkles, MessageSquare } from 'lucide-react'
import { sessionManager } from '@/lib/session'
import Image from 'next/image'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  created_at?: string
  imageUrl?: string
}

type Conversation = {
  id: string
  title: string
  created_at: string
  updated_at: string
  last_message: string
  message_count: number
}

type LoadingState = {
  sendingMessage: boolean
  loadingConversation: boolean
  loadingHistory: boolean
  savingMessage: boolean
}

export const ChatInterface = React.forwardRef<
  { startNewConversation: () => void; loadConversation: (id: string) => void; conversationId: string | null }
>((props, ref) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loadingState, setLoadingState] = useState<LoadingState>({
    sendingMessage: false,
    loadingConversation: false,
    loadingHistory: false,
    savingMessage: false
  })
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationTitle, setCurrentConversationTitle] = useState('Nova Conversa')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Usar o session manager para obter userId
  const userId = sessionManager.getUserId()

  // Estado de loading geral
  const isAnyLoading = Object.values(loadingState).some(loading => loading)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Carregar conversas quando o componente monta
  useEffect(() => {
    loadConversations()
    // Iniciar com mensagem de boas-vindas se não há conversa
    if (!conversationId && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '🧠 **Olá! Sou seu assistente com super memória, powered by GPT-4 Turbo.**\n\nMinhas novas capacidades incluem:\n\n• 🎯 **Memória Contextual**: Lembro de tudo que discutimos\n• 🔄 **Conexões Inteligentes**: Conecto informações passadas\n• 📋 **Acompanhamento**: Monitoro projetos em andamento\n• 🎓 **Aprendizado Contínuo**: Melhoro a cada interação\n• 🎨 **Geração de Imagens**: Posso criar imagens com DALL-E 3\n\n**Para solicitar uma imagem, simplesmente peça:**\n*"Crie uma imagem de..." ou "Desenhe..." ou "Faça um logo..."*\n\n**Como posso usar minha super memória e criatividade visual para te ajudar hoje?**',
        timestamp: new Date()
      }])
    }
    setConnectionStatus('connected')
  }, [])

  const updateLoadingState = (key: keyof LoadingState, value: boolean) => {
    setLoadingState(prev => ({ ...prev, [key]: value }))
  }

  const loadConversations = async () => {
    updateLoadingState('loadingHistory', true)
    try {
      const response = await fetch(`/api/conversations?userId=${userId}`)
      const data = await response.json()
      
      if (data.success && data.conversations) {
        setConversations(data.conversations)
        console.log(`✅ Carregadas ${data.conversations.length} conversas`)
      } else {
        console.log('⚠️ Nenhuma conversa encontrada na API')
        setConversations([])
      }
    } catch (error) {
      console.error('❌ Erro ao carregar conversas:', error)
      setConversations([])
    } finally {
      updateLoadingState('loadingHistory', false)
    }
  }

  const loadConversation = async (convId: string) => {
    if (loadingState.loadingConversation || loadingState.sendingMessage) return

    try {
      updateLoadingState('loadingConversation', true)
      setConnectionStatus('connecting')
      
      const response = await fetch(`/api/conversations/${convId}/messages?userId=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setConversationId(convId)
        setCurrentConversationTitle(data.conversation.title)
        
        // Converter mensagens do banco para o formato do componente
        const loadedMessages: Message[] = data.messages.map((msg: any) => {
          // Extrair URL da imagem se existir no formato [IMAGE]:url
          const imageMatch = msg.content.match(/\[IMAGE\]:(.+)/)
          const imageUrl = imageMatch ? imageMatch[1] : undefined
          const content = imageUrl ? msg.content.replace(/\[IMAGE\]:.+/, '').trim() : msg.content
          
          return {
            id: msg.id,
            role: msg.role,
            content: content,
            timestamp: new Date(msg.created_at),
            created_at: msg.created_at,
            imageUrl: imageUrl
          }
        })
        
        setMessages(loadedMessages)
        setConnectionStatus('connected')
        
        // Focar no input após carregar
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    } catch (error) {
      console.error('Erro ao carregar conversa:', error)
      setConnectionStatus('error')
    } finally {
      updateLoadingState('loadingConversation', false)
    }
  }

  const startNewConversation = () => {
    if (isAnyLoading) return

    setConversationId(null)
    setCurrentConversationTitle('Nova Conversa')
    setConnectionStatus('connected')
    setRetryCount(0)
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '🧠 **Olá! Sou seu assistente com super memória, powered by GPT-4 Turbo.**\n\nMinhas novas capacidades incluem:\n\n• 🎯 **Memória Contextual**: Lembro de tudo que discutimos\n• 🔄 **Conexões Inteligentes**: Conecto informações passadas\n• 📋 **Acompanhamento**: Monitoro projetos em andamento\n• 🎓 **Aprendizado Contínuo**: Melhoro a cada interação\n• 🎨 **Geração de Imagens**: Posso criar imagens com DALL-E 3\n\n**Para solicitar uma imagem, simplesmente peça:**\n*"Crie uma imagem de..." ou "Desenhe..." ou "Faça um logo..."*\n\n**Como posso usar minha super memória e criatividade visual para te ajudar hoje?**',
      timestamp: new Date()
    }])
    
    // Focar no input
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // Expor funções para o componente pai
  useImperativeHandle(ref, () => ({
    startNewConversation,
    loadConversation,
    conversationId
  }))

  const copyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error('Erro ao copiar mensagem:', error)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || loadingState.sendingMessage || isAnyLoading) return

    const userMessage: Message = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    const messageToSend = inputMessage
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    updateLoadingState('sendingMessage', true)
    setConnectionStatus('connecting')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          conversationId,
          userId,
          // Incluir contexto completo da conversa para super memória
          fullContext: messages.filter(m => m.id !== 'welcome').map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
          }))
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        imageUrl: data.imageUrl // Adicionar URL da imagem se gerada
      }

      setMessages(prev => [...prev, assistantMessage])
      setConnectionStatus('connected')
      setRetryCount(0)
      
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
        setCurrentConversationTitle(messageToSend.slice(0, 50) + (messageToSend.length > 50 ? '...' : ''))
        console.log(`✅ Nova conversa criada: ${data.conversationId}`)
      }

      // Recarregar lista de conversas para atualizar
      setTimeout(() => {
        loadConversations()
      }, 500)

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
      setConnectionStatus('error')
      setRetryCount(prev => prev + 1)
      
      const errorMessage: Message = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: `❌ **Erro na comunicação** (Tentativa ${retryCount + 1})\n\n${(error instanceof Error && (error.message.includes('network') || error.message.includes('fetch'))) ? 
          'Problema de conexão detectado.' : 
          'Erro no servidor.'}\n\n• 🔄 **Tente novamente** em alguns segundos\n• 🌐 **Verifique** sua conexão com a internet\n• ⚙️ **Se persistir**, verifique as configurações da API`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      updateLoadingState('sendingMessage', false)
      // Focar novamente no input
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const renderMessage = (content: string) => {
    // Renderizar markdown básico
    return content
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <div key={index} className="flex items-start space-x-2 my-1">
              <span className="text-blue-400 mt-1">•</span>
              <span>{line.slice(2)}</span>
            </div>
          )
        }
        if (line.startsWith('**') && line.endsWith('**')) {
          return (
            <div key={index} className="font-semibold my-1">
              {line.slice(2, -2)}
            </div>
          )
        }
        return line ? <div key={index} className="my-1">{line}</div> : <br key={index} />
      })
  }

  const getStatusIcon = () => {
    if (isAnyLoading) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
    }
    switch (connectionStatus) {
      case 'connecting':
        return <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
      case 'connected':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    if (loadingState.sendingMessage) return 'Enviando mensagem...'
    if (loadingState.loadingConversation) return 'Carregando conversa...'
    if (loadingState.loadingHistory) return 'Carregando histórico...'
    if (loadingState.savingMessage) return 'Salvando...'
    
    switch (connectionStatus) {
      case 'connecting':
        return 'Conectando...'
              case 'connected':
          return 'Online • GPT-4 Turbo + DALL-E 3 + Super Memória'
      case 'error':
        return retryCount > 0 ? `Erro (${retryCount} tentativas)` : 'Erro na conexão'
      default:
        return 'Status desconhecido'
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 relative">
      {/* Loading Overlay */}
      {loadingState.loadingConversation && (
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-6 flex items-center space-x-3 border border-gray-700">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-white font-medium">Carregando conversa...</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            {loadingState.sendingMessage && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <Loader2 className="w-3 h-3 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white flex items-center space-x-2">
              <span>{currentConversationTitle}</span>
              {messages.length > 1 && (
                <span className="text-xs bg-blue-600 px-2 py-1 rounded-full">
                  {messages.length - 1} msgs
                </span>
              )}
            </h1>
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <p className="text-sm text-gray-400">{getStatusText()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((message, index) => (
          <div 
            key={message.id} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className={`flex items-start space-x-3 max-w-4xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' 
                  ? 'bg-blue-600' 
                  : 'bg-gradient-to-r from-purple-600 to-blue-600'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div className={`rounded-xl p-4 relative group ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-100 border border-gray-700'
              }`}>
                <div className="text-sm leading-relaxed">
                  {message.role === 'assistant' ? renderMessage(message.content) : message.content}
                  {/* Exibir imagem se existir */}
                  {message.imageUrl && (
                    <div className="mt-4">
                      <div className="relative rounded-lg overflow-hidden border border-gray-600 shadow-lg">
                        <Image
                          src={message.imageUrl} 
                          alt="Imagem gerada por DALL-E 3"
                          className="w-full max-w-md mx-auto block rounded-lg"
                          width={512}
                          height={512}
                          priority={true}
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkbHB0eH/xAAVAQEBAAAAAAAAAAAAAAAAAAAAAAABAv/EABRAQEAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKljhYa4NUv2EDaKAH/2Q=="
                          onLoad={() => scrollToBottom()}
                        />
                        <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                          🎨 DALL-E 3
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className={`flex items-center justify-between mt-3 ${
                  message.role === 'user' 
                    ? 'text-blue-200' 
                    : 'text-gray-500'
                }`}>
                  <span className="text-xs">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  <button
                    onClick={() => copyMessage(message.content, message.id)}
                    className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all hover:bg-gray-700 ${
                      copiedMessageId === message.id ? 'opacity-100' : ''
                    }`}
                    title="Copiar mensagem"
                  >
                    {copiedMessageId === message.id ? (
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {loadingState.sendingMessage && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-3 max-w-4xl">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center space-x-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Processando com GPT-4 Turbo + DALL-E 3...</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex space-x-3">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isAnyLoading ? "Aguarde..." : "Digite sua mensagem ou peça uma imagem... (GPT-4 Turbo + DALL-E 3)"}
            className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={isAnyLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isAnyLoading}
            size="icon"
            className="button-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {loadingState.sendingMessage ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
          <span>
            <strong>GPT-4 Turbo + DALL-E 3:</strong> Respostas contextualizadas com super memória + geração de imagens
          </span>
          {retryCount > 0 && (
            <span className="text-yellow-400">
              ⚠️ {retryCount} tentativas de reconexão
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

ChatInterface.displayName = 'ChatInterface' 