'use client'

import React, { useState, useRef, useEffect, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Bot, User, Loader2, Copy, CheckCircle2, AlertCircle, Sparkles, MessageSquare, Play, Pause, Volume2, VolumeX } from 'lucide-react'
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

type AudioState = {
  [messageId: string]: {
    playing: boolean
    loading: boolean
    audio?: HTMLAudioElement
  }
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
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [audioState, setAudioState] = useState<AudioState>({})
  const [showTTSHint, setShowTTSHint] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
        content: '🧠 **Olá! Sou seu assistente com super memória, powered by GPT-4 Turbo.**\n\nMinhas novas capacidades incluem:\n\n• 🎯 **Memória Contextual**: Lembro de tudo que discutimos\n• 🔄 **Conexões Inteligentes**: Conecto informações passadas\n• 📋 **Acompanhamento**: Monitoro projetos em andamento\n• 🎓 **Aprendizado Contínuo**: Melhoro a cada interação\n• 🎨 **Geração de Imagens**: Posso criar imagens com DALL-E 3\n• 🎵 **Text-to-Speech Avançado**: Ouça minhas respostas com voz entusiasmada! Clique no botão ▶️\n\n**Para solicitar uma imagem, simplesmente peça:**\n*"Crie uma imagem de..." ou "Desenhe..." ou "Faça um logo..."*\n\n**Para ouvir minhas respostas:**\n*Clique no botão ▶️ que aparece nas minhas mensagens*\n\n**Como posso usar minha super memória, criatividade visual e voz para te ajudar hoje?**',
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
      } else {
        setConversations([])
      }
    } catch (error) {
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
      setConnectionStatus('error')
    } finally {
      updateLoadingState('loadingConversation', false)
    }
  }

  const startNewConversation = () => {
    if (isAnyLoading) return

    setConversationId(null)
    setConnectionStatus('connected')
    setRetryCount(0)
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '🧠 **Olá! Sou seu assistente com super memória, powered by GPT-4 Turbo.**\n\nMinhas novas capacidades incluem:\n\n• 🎯 **Memória Contextual**: Lembro de tudo que discutimos\n• 🔄 **Conexões Inteligentes**: Conecto informações passadas\n• 📋 **Acompanhamento**: Monitoro projetos em andamento\n• 🎓 **Aprendizado Contínuo**: Melhoro a cada interação\n• 🎨 **Geração de Imagens**: Posso criar imagens com DALL-E 3\n• 🎵 **Text-to-Speech Avançado**: Ouça minhas respostas com voz entusiasmada! Clique no botão ▶️\n\n**Para solicitar uma imagem, simplesmente peça:**\n*"Crie uma imagem de..." ou "Desenhe..." ou "Faça um logo..."*\n\n**Para ouvir minhas respostas:**\n*Clique no botão ▶️ que aparece nas minhas mensagens*\n\n**Como posso usar minha super memória, criatividade visual e voz para te ajudar hoje?**',
      timestamp: new Date()
    }])
    
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
      // Silent fail
    }
  }

  // Funções de TTS
  const playAudio = async (messageId: string, content: string) => {
    try {
      // Verificar se já existe áudio para esta mensagem
      if (audioState[messageId]?.audio) {
        const audio = audioState[messageId].audio!
        
        if (audioState[messageId].playing) {
          // Pausar áudio
          audio.pause()
          setAudioState(prev => ({
            ...prev,
            [messageId]: { ...prev[messageId], playing: false }
          }))
        } else {
          // Retomar áudio
          audio.play()
          setAudioState(prev => ({
            ...prev,
            [messageId]: { ...prev[messageId], playing: true }
          }))
        }
        return
      }

      // Iniciar loading
      setAudioState(prev => ({
        ...prev,
        [messageId]: { playing: false, loading: true }
      }))

      // Limpar texto para TTS (remover markdown e preparar para voz ash)
      const cleanText = content
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove negrito
        .replace(/• /g, '') // Remove bullet points
        .replace(/🎯|🔄|📋|🎓|🎨|⚡|🧠|🌐|🔄|⚙️|❌/g, '') // Remove emojis
        .replace(/\n+/g, '. ') // Quebras de linha viram pausas
        .trim()

      if (!cleanText) {
        setAudioState(prev => ({
          ...prev,
          [messageId]: { playing: false, loading: false }
        }))
        return
      }

      // Fazer chamada para API de TTS
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: cleanText,
          voice: 'ash' // Voz energética e entusiasmada
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erro TTS: ${response.status} - ${errorText}`)
      }

      // Verificar se a resposta é realmente um áudio
      const contentType = response.headers.get('content-type')

      if (!contentType?.includes('audio')) {
        throw new Error('Resposta da API não é um arquivo de áudio')
      }

      // Criar blob de áudio
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      // Configurar eventos do áudio
      audio.onplay = () => {
        setAudioState(prev => ({
          ...prev,
          [messageId]: { ...prev[messageId], playing: true, loading: false }
        }))
      }

      audio.onpause = () => {
        setAudioState(prev => ({
          ...prev,
          [messageId]: { ...prev[messageId], playing: false }
        }))
      }

      audio.onended = () => {
        setAudioState(prev => ({
          ...prev,
          [messageId]: { ...prev[messageId], playing: false }
        }))
        URL.revokeObjectURL(audioUrl) // Limpar memória
      }

      audio.onerror = (e) => {
        setAudioState(prev => ({
          ...prev,
          [messageId]: { playing: false, loading: false }
        }))
        URL.revokeObjectURL(audioUrl)
      }

      // Salvar áudio no estado e reproduzir
      setAudioState(prev => ({
        ...prev,
        [messageId]: { playing: false, loading: false, audio }
      }))

      await audio.play()

    } catch (error) {
      setAudioState(prev => ({
        ...prev,
        [messageId]: { playing: false, loading: false }
      }))
      
      // Mostrar erro para o usuário
      alert(`Erro no TTS: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const stopAllAudio = () => {
    Object.values(audioState).forEach(state => {
      if (state.audio) {
        state.audio.pause()
        state.audio.currentTime = 0
      }
    })
    setAudioState({})
  }

  // Limpar áudios quando componente desmonta
  useEffect(() => {
    return () => {
      stopAllAudio()
    }
  }, [])

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
      
      // Mostrar dica TTS na primeira resposta real da IA
      if (messages.filter(m => m.role === 'assistant' && m.id !== 'welcome').length === 0) {
        setShowTTSHint(true)
        setTimeout(() => setShowTTSHint(false), 8000) // Esconder após 8 segundos
      }
      
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
        
        // Notificar que uma nova conversa foi criada
        const event = new CustomEvent('conversationCreated', {
          detail: {
            conversationId: data.conversationId,
            title: data.conversationTitle || 'Nova Conversa'
          }
        })
        window.dispatchEvent(event)
      }

      // Recarregar lista de conversas para atualizar
      setTimeout(() => {
        loadConversations()
      }, 500)

    } catch (error) {
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey) {
        // Ctrl+Enter: quebrar linha
        e.preventDefault()
        const textarea = e.currentTarget
        const { selectionStart, selectionEnd } = textarea
        const value = inputMessage
        const newValue = value.slice(0, selectionStart) + '\n' + value.slice(selectionEnd)
        setInputMessage(newValue)
        
        // Reposicionar cursor após a quebra de linha e ajustar altura
        setTimeout(() => {
          textarea.setSelectionRange(selectionStart + 1, selectionStart + 1)
          textarea.style.height = 'auto'
          textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px'
        }, 0)
      } else if (!e.shiftKey) {
        // Enter normal: enviar mensagem
        e.preventDefault()
        sendMessage()
      }
      // Shift+Enter: comportamento padrão do textarea (quebra linha)
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const renderMessage = (content: string, messageRole: 'user' | 'assistant' = 'assistant') => {
    // Função para processar formatação inline em uma linha
    const processInlineFormatting = (text: string) => {
      if (!text) return text

      // Dividir o texto em partes, identificando diferentes formatações
      const parts: (string | JSX.Element)[] = []
      let lastIndex = 0
      let keyIndex = 0

      // Regex mais robusto para capturar diferentes formatações
      // Ordem: código inline, negrito+itálico, negrito, itálico, tachado
      const formatRegex = /((`[^`]+`)|(~{2}[^~]+~{2})|(\*{3}([^*]+)\*{3})|(\*{2}([^*]+)\*{2})|(__([^_]+)__)|(_([^_]+)_)|(\*([^*]+)\*))/g
      let match

      while ((match = formatRegex.exec(text)) !== null) {
        // Adicionar texto antes da formatação
        if (match.index > lastIndex) {
          parts.push(text.slice(lastIndex, match.index))
        }

        // Determinar o tipo de formatação e aplicar estilo
        if (match[2]) {
          // Código inline `código`
          parts.push(
            <code key={keyIndex++} className="bg-gray-100 text-blue-600 px-2 py-1 rounded text-xs font-mono border">
              {match[2].slice(1, -1)}
            </code>
          )
        } else if (match[3]) {
          // Texto tachado ~~texto~~
          const strikeClass = messageRole === 'user' 
            ? "line-through text-blue-200 opacity-75" 
            : "line-through text-gray-500 opacity-75"
          parts.push(
            <span key={keyIndex++} className={strikeClass}>
              {match[3].slice(2, -2)}
            </span>
          )
        } else if (match[4]) {
          // Negrito + Itálico ***texto***
          const boldItalicClass = messageRole === 'user' 
            ? "font-bold italic text-blue-100" 
            : "font-bold italic text-gray-900"
          parts.push(
            <strong key={keyIndex++} className={boldItalicClass}>
              <em>{match[5]}</em>
            </strong>
          )
        } else if (match[6]) {
          // Negrito **texto**
          const boldClass = messageRole === 'user' 
            ? "font-semibold text-blue-100" 
            : "font-semibold text-gray-900"
          parts.push(
            <strong key={keyIndex++} className={boldClass}>
              {match[7]}
            </strong>
          )
        } else if (match[8]) {
          // Negrito alternativo __texto__
          const boldClass = messageRole === 'user' 
            ? "font-semibold text-blue-100" 
            : "font-semibold text-gray-900"
          parts.push(
            <strong key={keyIndex++} className={boldClass}>
              {match[9]}
            </strong>
          )
        } else if (match[10]) {
          // Itálico _texto_
          const italicClass = messageRole === 'user' 
            ? "italic text-blue-200" 
            : "italic text-gray-700"
          parts.push(
            <em key={keyIndex++} className={italicClass}>
              {match[11]}
            </em>
          )
        } else if (match[12]) {
          // Itálico *texto*
          const italicClass = messageRole === 'user' 
            ? "italic text-blue-200" 
            : "italic text-gray-700"
          parts.push(
            <em key={keyIndex++} className={italicClass}>
              {match[13]}
            </em>
          )
        }

        lastIndex = match.index + match[0].length
      }

      // Adicionar texto restante
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex))
      }

      return parts.length > 1 ? parts : text
    }

    // Renderizar markdown básico
    return content
      .split('\n')
      .map((line, index) => {
        // Headers # ## ###
        if (line.match(/^#{1,6}\s/)) {
          const level = line.match(/^#+/)?.[0].length || 1
          const headerText = line.replace(/^#+\s/, '')
          const headerClass = messageRole === 'user' 
            ? `text-blue-100 font-bold my-2 ${level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm'}` 
            : `text-gray-900 font-bold my-2 ${level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm'}`
          
          return (
            <div key={index} className={headerClass}>
              {processInlineFormatting(headerText)}
            </div>
          )
        }

        // Bullet points
        if (line.startsWith('• ') || line.startsWith('- ') || line.match(/^\s*[\*\-]\s/)) {
          const bulletText = line.replace(/^\s*[\*\-•]\s/, '')
          return (
            <div key={index} className="flex items-start space-x-2 my-1">
              <span className={messageRole === 'user' ? "text-blue-200 mt-1" : "text-blue-400 mt-1"}>•</span>
              <span>{processInlineFormatting(bulletText)}</span>
            </div>
          )
        }

        // Listas numeradas
        if (line.match(/^\s*\d+\.\s/)) {
          const numberMatch = line.match(/^\s*(\d+)\.\s(.*)/)
          if (numberMatch) {
            const [, number, listText] = numberMatch
            return (
              <div key={index} className="flex items-start space-x-2 my-1">
                <span className={messageRole === 'user' ? "text-blue-200 mt-1" : "text-blue-400 mt-1"}>{number}.</span>
                <span>{processInlineFormatting(listText)}</span>
              </div>
            )
          }
        }

        // Citações >
        if (line.startsWith('> ')) {
          const quoteClass = messageRole === 'user' 
            ? "border-l-4 border-blue-300 pl-4 text-blue-200 italic my-2" 
            : "border-l-4 border-blue-400 pl-4 text-gray-600 italic my-2"
          
          return (
            <div key={index} className={quoteClass}>
              {processInlineFormatting(line.slice(2))}
            </div>
          )
        }

        // Blocos de código ```
        if (line.startsWith('```')) {
          return (
            <div key={index} className="bg-gray-800 text-green-400 p-3 rounded-lg my-2 font-mono text-xs overflow-x-auto">
              <code>{line.slice(3)}</code>
            </div>
          )
        }
        
        // Linhas completamente em negrito (compatibilidade com código anterior)
        if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
          const boldClass = messageRole === 'user' 
            ? "font-semibold text-blue-100 my-1" 
            : "font-semibold text-gray-900 my-1"
          
          return (
            <div key={index} className={boldClass}>
              {processInlineFormatting(line.slice(2, -2))}
            </div>
          )
        }

        // Linha normal com formatação inline
        const processedLine = processInlineFormatting(line)
        
        return line ? (
          <div key={index} className="my-1">
            {processedLine}
          </div>
        ) : (
          <br key={index} />
        )
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
        return 'Online'
      case 'error':
        return retryCount > 0 ? `Erro (${retryCount} tentativas)` : 'Erro na conexão'
      default:
        return 'Status desconhecido'
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50 relative">
      {/* Loading Overlay */}
      {loadingState.loadingConversation && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 flex items-center space-x-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-gray-700 font-medium text-lg">Carregando conversa...</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
        {/* Dica TTS */}
        {showTTSHint && (
          <div className="fixed top-24 right-8 z-50 animate-fade-in">
            <div className="bg-blue-500 text-white p-6 rounded-2xl shadow-xl shadow-blue-500/25 max-w-sm border border-blue-400/20">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">🎵 Novo Recurso!</h3>
                  <p className="text-sm opacity-90 mb-3">
                    Clique no botão ▶️ nas respostas da IA para ouvi-las em áudio!
                  </p>
                  <button
                    onClick={() => setShowTTSHint(false)}
                    className="text-sm text-white/80 hover:text-white underline"
                  >
                    Entendi
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div 
            key={message.id} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className={`flex items-start space-x-4 max-w-4xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${
                message.role === 'user' 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                  : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div className={`rounded-2xl px-6 py-4 relative group shadow-sm ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white shadow-blue-500/20'
                  : 'bg-white text-gray-800 border border-gray-100 shadow-gray-200/50'
              }`}>
                <div className="text-sm leading-relaxed">
                  {renderMessage(message.content, message.role)}
                  {/* Exibir imagem se existir */}
                  {message.imageUrl && (
                    <div className="mt-6">
                      <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
                        <Image
                          src={message.imageUrl} 
                          alt="Imagem gerada por DALL-E 3"
                          className="w-full max-w-md mx-auto block rounded-2xl"
                          width={512}
                          height={512}
                          priority={true}
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkbHB0eH/xAAVAQEBAAAAAAAAAAAAAAAAAAAAAAABAv/EABRAQEAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKljhYa4NUv2EDaKAH/2Q=="
                          onLoad={() => scrollToBottom()}
                        />
                        <div className="absolute bottom-3 left-3 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium">
                          🎨 DALL-E 3
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className={`flex items-center justify-between mt-4 ${
                  message.role === 'user' 
                    ? 'text-blue-100' 
                    : 'text-gray-400'
                }`}>
                  <span className="text-xs font-medium">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  <div className="flex items-center space-x-2">
                    {/* Botão TTS - apenas para mensagens da IA */}
                    {message.role === 'assistant' && message.id !== 'welcome' && (
                      <button
                        onClick={() => playAudio(message.id, message.content)}
                        className={`opacity-70 hover:opacity-100 p-2 rounded-xl transition-all duration-200 hover:bg-gray-100 hover:scale-110 ${
                          audioState[message.id]?.loading || audioState[message.id]?.playing ? 'opacity-100 bg-gray-100' : ''
                        }`}
                        title={audioState[message.id]?.playing ? "⏸️ Pausar áudio" : "▶️ Reproduzir áudio"}
                        disabled={audioState[message.id]?.loading}
                      >
                        {audioState[message.id]?.loading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        ) : audioState[message.id]?.playing ? (
                          <Pause className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Play className="w-4 h-4 text-emerald-500 hover:text-emerald-600" />
                        )}
                      </button>
                    )}
                    
                    {/* Botão Copiar */}
                    <button
                      onClick={() => copyMessage(message.content, message.id)}
                      className={`opacity-70 hover:opacity-100 p-2 rounded-xl transition-all duration-200 hover:bg-gray-100 ${
                        copiedMessageId === message.id ? 'opacity-100 bg-gray-100' : ''
                      }`}
                      title="Copiar mensagem"
                    >
                      {copiedMessageId === message.id ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {loadingState.sendingMessage && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-4 max-w-4xl">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl px-6 py-4 shadow-sm">
                <div className="flex items-center space-x-3 text-gray-600">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                  <span className="text-sm font-medium">Processando com GPT-4 Turbo + DALL-E 3...</span>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white/90 backdrop-blur-md border-t border-gray-100/50 px-6 py-4">
        <div className="flex items-end space-x-4">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={isAnyLoading ? "Aguarde..." : "Digite sua mensagem ou peça uma imagem... ✨\n\nDica: Use Ctrl+Enter para quebrar linha"}
            className="flex-1 bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-3 text-sm shadow-sm resize-none min-h-[48px] max-h-32 overflow-y-auto"
            disabled={isAnyLoading}
            rows={1}
            style={{
              height: 'auto',
              minHeight: '48px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 128) + 'px'
            }}
          />
          <Button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isAnyLoading}
            size="icon"
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl w-12 h-12 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
          >
            {loadingState.sendingMessage ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <div className="mt-4 text-xs text-gray-500 flex items-center justify-between">
          <div className="flex flex-col space-y-1">
            <span className="font-medium">
              <strong>GPT-4 Turbo + DALL-E 3 + TTS:</strong> Respostas contextualizadas com super memória + geração de imagens + áudio
            </span>
            <span className="text-gray-400">
              💡 <strong>Enter</strong> envia • <strong>Ctrl+Enter</strong> quebra linha • <strong>Shift+Enter</strong> quebra linha • Suporte a **markdown**
            </span>
          </div>
          {retryCount > 0 && (
            <span className="text-amber-500 font-medium">
              ⚠️ {retryCount} tentativas de reconexão
            </span>
          )}
        </div>
      </div>
    </div>
  )
})

ChatInterface.displayName = 'ChatInterface' 