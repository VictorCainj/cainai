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
  const [typewriterText, setTypewriterText] = useState<string>('')
  const [typewriterMessageId, setTypewriterMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null)

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

  // Carregar conversas quando o componente monta (apenas uma vez)
  useEffect(() => {
    const initializeChat = async () => {
      // Carregar conversas apenas se o userId estiver disponível
      if (userId) {
        await loadConversations()
      }
      
      // Iniciar com mensagem de boas-vindas se não há conversa
      if (!conversationId && messages.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: '**Olá! Sou seu assistente com super memória, powered by GPT-4 Turbo.**\n\nMinhas novas capacidades incluem:\n\n🎯 **Memória Contextual**: Lembro de tudo que discutimos\n\n🔄 **Conexões Inteligentes**: Conecto informações passadas\n\n📋 **Acompanhamento**: Monitoro projetos em andamento\n\n🎓 **Aprendizado Contínuo**: Melhoro a cada interação\n\n🎨 **Geração de Imagens**: Posso criar imagens com DALL-E 3\n\n🎵 **Text-to-Speech Avançado**: Ouça minhas respostas com voz entusiasmada! Clique no botão ▶️\n\n**Para solicitar uma imagem, simplesmente peça:**\n*"Crie uma imagem de..." ou "Desenhe..." ou "Faça um logo..."*\n\n**Para ouvir minhas respostas:**\n*Clique no botão ▶️ que aparece nas minhas mensagens*\n\n**Como posso usar minha super memória, criatividade visual e voz para te ajudar hoje?**',
          timestamp: new Date()
        }])
      }
      setConnectionStatus('connected')
    }

    initializeChat()
  }, [userId]) // Dependência apenas do userId

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

    // Limpar typewriter se estiver ativo
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current)
      setTypewriterMessageId(null)
      setTypewriterText('')
    }

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

    // Limpar typewriter se estiver ativo
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current)
      setTypewriterMessageId(null)
      setTypewriterText('')
    }

    setConversationId(null)
    setConnectionStatus('connected')
    setRetryCount(0)
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '**Olá! Como posso te ajudar hoje?**\n\nSou seu assistente com super memória - posso lembrar de tudo que discutimos, gerar imagens e muito mais!\n\n✨ **Dica**: Digite sua pergunta ou peça para criar uma imagem',
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

  // Função para efeito typewriter
  const startTypewriter = (text: string, messageId: string) => {
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current)
    }
    
    setTypewriterMessageId(messageId)
    setTypewriterText('')
    
    let currentIndex = 0
    typewriterIntervalRef.current = setInterval(() => {
      if (currentIndex <= text.length) {
        setTypewriterText(text.slice(0, currentIndex))
        currentIndex++
        scrollToBottom()
      } else {
        clearInterval(typewriterIntervalRef.current!)
        setTypewriterMessageId(null)
        setTypewriterText('')
        
        // Atualizar a mensagem com o texto completo
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, content: text } : msg
        ))
      }
    }, 30) // Velocidade rápida - 30ms por letra
  }

  // Limpar áudios e typewriter quando componente desmonta
  useEffect(() => {
    return () => {
      stopAllAudio()
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current)
      }
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

      // Adicionar mensagem primeiro (vazia para começar o typewriter)
      setMessages(prev => [...prev, { ...assistantMessage, content: '' }])
      setConnectionStatus('connected')
      setRetryCount(0)
      
      // Iniciar efeito typewriter
      setTimeout(() => {
        startTypewriter(data.message, assistantMessage.id)
      }, 200) // Pequeno delay para suavidade
      
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
            ? "line-through text-white/70 opacity-75" 
            : "line-through text-gray-500 opacity-75"
          parts.push(
            <span key={keyIndex++} className={strikeClass}>
              {match[3].slice(2, -2)}
            </span>
          )
        } else if (match[4]) {
          // Negrito + Itálico ***texto***
          const boldItalicClass = messageRole === 'user' 
            ? "font-bold italic text-white" 
            : "font-bold italic text-gray-900"
          parts.push(
            <strong key={keyIndex++} className={boldItalicClass}>
              <em>{match[5]}</em>
            </strong>
          )
        } else if (match[6]) {
          // Negrito **texto**
          const boldClass = messageRole === 'user' 
            ? "font-semibold text-white" 
            : "font-semibold text-gray-900"
          parts.push(
            <strong key={keyIndex++} className={boldClass}>
              {match[7]}
            </strong>
          )
        } else if (match[8]) {
          // Negrito alternativo __texto__
          const boldClass = messageRole === 'user' 
            ? "font-semibold text-white" 
            : "font-semibold text-gray-900"
          parts.push(
            <strong key={keyIndex++} className={boldClass}>
              {match[9]}
            </strong>
          )
        } else if (match[10]) {
          // Itálico _texto_
          const italicClass = messageRole === 'user' 
            ? "italic text-white/90" 
            : "italic text-gray-700"
          parts.push(
            <em key={keyIndex++} className={italicClass}>
              {match[11]}
            </em>
          )
        } else if (match[12]) {
          // Itálico *texto*
          const italicClass = messageRole === 'user' 
            ? "italic text-white/90" 
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
            ? `text-white font-bold my-2 ${level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm'}` 
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
              <span className={messageRole === 'user' ? "text-white/80 mt-1" : "text-blue-400 mt-1"}>•</span>
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
                <span className={messageRole === 'user' ? "text-white/80 mt-1" : "text-blue-400 mt-1"}>{number}.</span>
                <span>{processInlineFormatting(listText)}</span>
              </div>
            )
          }
        }

        // Citações >
        if (line.startsWith('> ')) {
          const quoteClass = messageRole === 'user' 
            ? "border-l-4 border-white/30 pl-4 text-white/90 italic my-2" 
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
            ? "font-semibold text-white my-1" 
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
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 via-[#f7f7f8] to-gray-100 relative">
      {/* Loading Overlay */}
      {loadingState.loadingConversation && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl enhanced-shadow-xl border border-gray-200 p-6 flex items-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-gray-600" />
            <span className="text-gray-700 font-medium">Carregando conversa...</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">
        {/* Dica TTS */}
        {showTTSHint && (
          <div className="fixed top-24 right-8 z-50 animate-fade-in">
            <div className="bg-blue-500 text-white p-6 rounded-2xl enhanced-shadow-xl max-w-sm border border-blue-400/20">
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
        
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          {messages.map((message, index) => (
            <div 
              key={message.id} 
              className={`flex animate-fade-in ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`max-w-2xl ${
                message.role === 'user' 
                  ? 'bg-blue-500 text-white rounded-2xl px-6 py-4 enhanced-shadow-lg'
                  : 'bg-white rounded-2xl border border-gray-200 enhanced-shadow-lg px-6 py-4'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user' 
                      ? 'bg-white/20 text-white' 
                      : 'bg-green-500 text-white'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm leading-7 ${
                      message.role === 'user' ? 'text-white' : 'text-gray-800'
                    }`}>
                      {/* Mostrar typewriter text se esta mensagem está sendo "digitada" */}
                      {typewriterMessageId === message.id ? (
                        <>
                          {renderMessage(typewriterText, message.role)}
                          <span className="typewriter-cursor text-gray-400 font-mono">|</span>
                        </>
                      ) : (
                        renderMessage(message.content, message.role)
                      )}
                      {/* Exibir imagem se existir (mesmo durante typewriter) */}
                      {message.imageUrl && (
                        <div className="mt-6">
                          <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                            <Image
                              src={message.imageUrl} 
                              alt="Imagem gerada por DALL-E 3"
                              className="w-full max-w-md mx-auto block rounded-xl"
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
                        ? 'text-white/70' 
                        : 'text-gray-400'
                    }`}>
                      <span className="text-xs">
                        {formatTimestamp(message.timestamp)}
                      </span>
                      <div className="flex items-center space-x-2">
                        {/* Botão TTS - apenas para mensagens da IA */}
                        {message.role === 'assistant' && message.id !== 'welcome' && (
                          <button
                            onClick={() => playAudio(message.id, message.content)}
                            className={`opacity-60 hover:opacity-100 p-1.5 rounded-lg transition-all duration-200 hover:bg-gray-100 ${
                              audioState[message.id]?.loading || audioState[message.id]?.playing ? 'opacity-100 bg-gray-100' : ''
                            }`}
                            title={audioState[message.id]?.playing ? "⏸️ Pausar áudio" : "▶️ Reproduzir áudio"}
                            disabled={audioState[message.id]?.loading}
                          >
                            {audioState[message.id]?.loading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                            ) : audioState[message.id]?.playing ? (
                              <Pause className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <Play className="w-3.5 h-3.5 text-gray-600 hover:text-blue-500" />
                            )}
                          </button>
                        )}
                        
                        {/* Botão Copiar */}
                        <button
                          onClick={() => copyMessage(message.content, message.id)}
                          className={`opacity-60 hover:opacity-100 p-1.5 rounded-lg transition-all duration-200 ${
                            message.role === 'user' 
                              ? 'hover:bg-white/20' 
                              : 'hover:bg-gray-100'
                          } ${
                            copiedMessageId === message.id ? 'opacity-100' : ''
                          }`}
                          title="Copiar mensagem"
                        >
                          {copiedMessageId === message.id ? (
                            <CheckCircle2 className={`w-3.5 h-3.5 ${
                              message.role === 'user' ? 'text-white' : 'text-green-500'
                            }`} />
                          ) : (
                            <Copy className={`w-3.5 h-3.5 ${
                              message.role === 'user' 
                                ? 'text-white/80 hover:text-white' 
                                : 'text-gray-600 hover:text-blue-500'
                            }`} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {loadingState.sendingMessage && (
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex justify-start">
              <div className="max-w-2xl relative overflow-hidden rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 gentle-pulse">
                {/* Fundo animado */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-green-50 to-purple-50 thinking-background"></div>
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm"></div>
                
                {/* Conteúdo */}
                <div className="relative px-6 py-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 text-gray-700">
                        <span className="text-sm font-medium">🧠 Pensando</span>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-green-600 rounded-full thinking-dot shadow-sm"></div>
                          <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full thinking-dot shadow-sm"></div>
                          <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full thinking-dot shadow-sm"></div>
                          <div className="w-2 h-2 bg-gradient-to-r from-pink-400 to-pink-600 rounded-full thinking-dot shadow-sm"></div>
                          <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full thinking-dot shadow-sm"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 enhanced-shadow">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isAnyLoading ? "Aguarde..." : "Mensagem..."}
              className="flex-1 bg-white border border-gray-300 text-gray-800 placeholder-gray-500 focus:border-gray-400 focus:ring-0 focus:outline-none rounded-lg px-3 py-2 text-sm resize-none min-h-[36px] max-h-24 overflow-y-auto enhanced-shadow transition-all duration-200 focus:shadow-lg"
              disabled={isAnyLoading}
              rows={1}
              style={{
                height: 'auto',
                minHeight: '36px'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 96) + 'px'
              }}
            />
            <Button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isAnyLoading}
              size="icon"
              className="bg-black hover:bg-gray-800 text-white rounded-lg w-8 h-8 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 enhanced-shadow-lg hover:shadow-2xl transform hover:scale-105"
            >
              {loadingState.sendingMessage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
          {retryCount > 0 && (
            <div className="mt-3 text-xs text-amber-600 flex items-center justify-center">
              ⚠️ {retryCount} tentativas de reconexão
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

ChatInterface.displayName = 'ChatInterface' 