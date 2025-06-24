"use client";

import React, { useState, useRef, useEffect, useImperativeHandle, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Send, Bot, User, Loader2, Copy, CheckCircle2, AlertCircle, 
  Search, Mic, ArrowUp, Plus, FileText, Code, BookOpen, 
  PenTool, BrainCircuit, Play, Pause, Download, Eye, X, Volume2, VolumeX, BarChart3, 
  Shield, LogIn 
} from 'lucide-react'
import { sessionManager } from '@/lib/session'
import { useAuth } from '@/lib/auth-context'
import Image from 'next/image'
import { motion, AnimatePresence } from "framer-motion"
import { TextShimmer } from '@/components/ui/text-shimmer'
import { InlineCodePanel } from '@/components/ui/inline-code-panel'
import { AdvancedTextRenderer } from '@/components/ui/advanced-text-renderer'
import { useTTSSettings } from '@/components/chat/tts-voice-selector'
import { ConversationLoading } from '@/components/ui/conversation-loading'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  created_at?: string
  imageUrl?: string
}

type LoadingState = {
  sendingMessage: boolean
  loadingConversation: boolean
  loadingHistory: boolean
  savingMessage: boolean
  thinking?: boolean
}

type AudioState = {
  [messageId: string]: {
    playing: boolean
    loading: boolean
    audio?: HTMLAudioElement
  }
}

// CodeBlock removido - agora definido internamente no AdvancedTextFormatter

interface AIAssistantInterfaceProps {
  onOpenSummaryPanel?: () => void
}

export const AIAssistantInterface = React.forwardRef<
  { startNewConversation: () => void; loadConversation: (id: string) => void; conversationId: string | null },
  AIAssistantInterfaceProps
>((props, ref) => {
  const { onOpenSummaryPanel } = props
  
  // Hook de autenticação
  const { user, isAuthenticated } = useAuth()
  
  // Estados do chatbot real
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [loadingState, setLoadingState] = useState<LoadingState>({
    sendingMessage: false,
    loadingConversation: false,
    loadingHistory: false,
    savingMessage: false
  })
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [audioState, setAudioState] = useState<AudioState>({})
  const [fullImageView, setFullImageView] = useState<string | null>(null)
  const [showConversationLoading, setShowConversationLoading] = useState(false)
  
  // Estados do design moderno
  const [searchEnabled, setSearchEnabled] = useState(false)
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(false)
  const [reasonEnabled, setReasonEnabled] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Usar o usuário autenticado ou fallback para session manager
  const userId = user?.id || sessionManager.getUserId()

  // Configurações de TTS
  const ttsSettings = useTTSSettings()

  // Estado de loading geral
  const isAnyLoading = Object.values(loadingState).some(loading => loading)

  // Função para auto-resize da textarea
  const adjustTextareaHeight = () => {
    const textarea = inputRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 120 // máximo de ~6 linhas
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px'
    }
  }

  // Auto-resize quando o valor muda
  useEffect(() => {
    adjustTextareaHeight()
  }, [inputValue])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Carregar mensagem inicial
  useEffect(() => {
    const initializeChat = async () => {
      if (!conversationId && messages.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: '**Olá! Como posso te ajudar hoje?**\n\nSou seu assistente com super memória - posso lembrar de tudo que discutimos, gerar imagens e muito mais!\n\n✨ **Dica**: Digite sua pergunta ou peça para criar uma imagem',
          timestamp: new Date()
        }])
      }
      setConnectionStatus('connected')
    }

    initializeChat()
  }, [])

  const updateLoadingState = (key: keyof LoadingState, value: boolean) => {
    setLoadingState(prev => ({ ...prev, [key]: value }))
  }

  const loadConversation = async (convId: string) => {
    if (loadingState.loadingConversation || loadingState.sendingMessage) return

    try {
      // Mostrar animação de loading imediatamente
      setShowConversationLoading(true)
      updateLoadingState('loadingConversation', true)
      setConnectionStatus('connecting')
      
      // Pequeno delay para dar tempo da animação aparecer
      await new Promise(resolve => setTimeout(resolve, 300))
      
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
        
        // Pequeno delay adicional para animação mais suave
        await new Promise(resolve => setTimeout(resolve, 500))
        
        setMessages(loadedMessages)
        setConnectionStatus('connected')
        
        // Esconder loading com delay para transição suave
        setTimeout(() => {
          setShowConversationLoading(false)
          // Focar no input após carregar
          setTimeout(() => inputRef.current?.focus(), 100)
        }, 200)
      }
    } catch (error) {
      setConnectionStatus('error')
      setShowConversationLoading(false)
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

  const sendMessage = async () => {
    if (!inputValue.trim() || loadingState.sendingMessage || isAnyLoading) return

    const userMessage: Message = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    const messageToSend = inputValue
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    
    // Reset textarea height
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.style.height = '24px'
      }
    }, 0)
    
    updateLoadingState('sendingMessage', true)
    updateLoadingState('thinking', true)
    setConnectionStatus('connecting')

    // Adicionar mensagem de "pensando" temporária
    const thinkingMessage: Message = {
      id: 'thinking_temp',
      role: 'assistant',
      content: '**Pensando...**',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, thinkingMessage])

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

      setConnectionStatus('connected')
      setRetryCount(0)
      updateLoadingState('thinking', false)
      
      // Remover mensagem de "pensando" e adicionar resposta real
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'thinking_temp')
        return [...filtered, assistantMessage]
      })
      
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
      updateLoadingState('thinking', false)
      
      const errorMessage: Message = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: `❌ **Erro na comunicação** (Tentativa ${retryCount + 1})\n\n${(error instanceof Error && (error.message.includes('network') || error.message.includes('fetch'))) ? 
          'Problema de conexão detectado.' : 
          'Erro no servidor.'}\n\n• 🔄 **Tente novamente** em alguns segundos\n• 🌐 **Verifique** sua conexão com a internet\n• ⚙️ **Se persistir**, verifique as configurações da API`,
        timestamp: new Date()
      }
      
      // Remover mensagem de "pensando" e adicionar erro
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== 'thinking_temp')
        return [...filtered, errorMessage]
      })
    } finally {
      updateLoadingState('sendingMessage', false)
      // Focar novamente no input
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const copyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      // Silent fail
    }
  }

  // Função para baixar imagem
  const downloadImage = async (imageUrl: string, fileName?: string) => {
    try {
      // Primeiro, tentar fetch direto
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = fileName || `dalle-image-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro no fetch direto, tentando método alternativo:', error)
      
      // Se o fetch direto falhar (CORS), usar método alternativo via proxy
      try {
        const response = await fetch('/api/download-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl })
        })
        
        if (!response.ok) {
          throw new Error(`Erro no servidor: ${response.status}`)
        }
        
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = fileName || `dalle-image-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        window.URL.revokeObjectURL(url)
      } catch (proxyError) {
        console.error('Erro no proxy também:', proxyError)
        
        // Como último recurso, abrir a imagem em nova aba
        const newWindow = window.open(imageUrl, '_blank')
        if (newWindow) {
          // Instruir o usuário a salvar manualmente
          alert('Por favor, clique com o botão direito na imagem que foi aberta e selecione "Salvar imagem como..."')
        } else {
          alert('Não foi possível baixar a imagem automaticamente. Verifique se o popup não foi bloqueado.')
        }
      }
    }
  }

  const openFullImageView = (imageUrl: string) => {
    setFullImageView(imageUrl)
  }

  const closeFullImageView = () => {
    setFullImageView(null)
  }

  // Funções de TTS com voz realista humana da OpenAI
  const playAudio = async (messageId: string, content: string, voice: string = 'nova') => {
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

              // Debug log removido
      const startTime = Date.now()

      // Fazer chamada para API de TTS melhorada
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: content,
          voice: voice, // Voz realista humana da OpenAI
          speed: 1.1,   // Velocidade ligeiramente acelerada
          model: 'tts-1-hd' // Modelo de alta qualidade
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(`TTS Error: ${response.status} - ${errorData.error || 'Erro do servidor'}`)
      }

      // Verificar se a resposta é realmente um áudio
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('audio')) {
        throw new Error('Resposta da API não é um arquivo de áudio')
      }

      // Obter métricas da resposta
      const generationTime = response.headers.get('X-Generation-Time')
      const textLength = response.headers.get('X-Text-Length')
      const voiceUsed = response.headers.get('X-Voice-Used')

                // Debug log removido

      // Criar blob de áudio
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      // Configurar eventos do áudio
      audio.onplay = () => {
        // Debug log removido
        setAudioState(prev => ({
          ...prev,
          [messageId]: { ...prev[messageId], playing: true, loading: false }
        }))
      }

      audio.onpause = () => {
        // Debug log removido
        setAudioState(prev => ({
          ...prev,
          [messageId]: { ...prev[messageId], playing: false }
        }))
      }

      audio.onended = () => {
        // Debug log removido
        setAudioState(prev => ({
          ...prev,
          [messageId]: { ...prev[messageId], playing: false }
        }))
        URL.revokeObjectURL(audioUrl) // Limpar memória
      }

      audio.onerror = (e) => {
        console.error(`❌ Erro no áudio para mensagem ${messageId}:`, e)
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
      
      const totalTime = Date.now() - startTime
      // Debug log removido

    } catch (error) {
      console.error('🎵 TTS Error:', error)
      setAudioState(prev => ({
        ...prev,
        [messageId]: { playing: false, loading: false }
      }))
      
      // Notificação mais suave para erros
      if (process.env.NODE_ENV === 'development') {
        console.error(`TTS Error: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      }
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

  // Fechar modal com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullImageView) {
        closeFullImageView()
      }
    }

    if (fullImageView) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [fullImageView])

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Funções de detecção de código removidas - agora integradas no AdvancedTextRenderer

  // Funções antigas de renderização removidas - agora usando AdvancedTextRenderer

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 p-8 relative overflow-hidden">
        {/* Animated Background Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-20"
              initial={{ 
                x: Math.random() * window.innerWidth, 
                y: Math.random() * window.innerHeight,
                scale: 0.5
              }}
              animate={{ 
                x: Math.random() * window.innerWidth, 
                y: Math.random() * window.innerHeight,
                scale: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          ))}
        </div>

        <div className="w-full max-w-4xl mx-auto flex flex-col items-center relative z-10">
          {/* Enhanced Logo with 3D Effects */}
          <motion.div 
            className="mb-12 w-24 h-24 relative"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl shadow-blue-500/30 animate-pulse"></div>
            <div className="relative w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-xl">
              <Bot className="w-12 h-12 text-white drop-shadow-lg" />
            </div>
          </motion.div>

          {/* Enhanced Welcome Message */}
          <div className="mb-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center space-y-4"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 bg-clip-text text-transparent mb-3">
                🤖 CDI Assistant
              </h1>
              <p className="text-gray-600 max-w-2xl text-lg leading-relaxed">
                Seu assistente inteligente com super memória. Posso lembrar de tudo que discutimos, 
                gerar imagens incríveis e muito mais!
              </p>
              <div className="flex items-center space-x-6 mt-6">
                <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full border border-blue-200/30">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-sm font-medium text-blue-700">Sistema Online</span>
                </div>
                <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-full border border-purple-200/30">
                  <span className="text-sm font-medium text-purple-700">✨ Powered by GPT-4o</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Enhanced Input Area with Modern Design */}
          <motion.div 
            className="w-full bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-3xl shadow-2xl shadow-gray-500/10 overflow-hidden mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="p-6">
              <textarea
                ref={inputRef}
                placeholder="💭 Como posso te ajudar hoje? Digite sua pergunta..."
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  setTimeout(adjustTextareaHeight, 0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                className="w-full text-gray-800 text-base outline-none placeholder:text-gray-500 resize-none min-h-[24px] max-h-[120px] overflow-y-auto font-medium leading-relaxed bg-transparent"
                rows={1}
                style={{ height: '24px' }}
              />
            </div>

            {/* Enhanced Functions and Actions */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100/50">
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={() => setSearchEnabled(!searchEnabled)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-300 ${
                    searchEnabled
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-md border border-blue-200/30"
                      : "bg-gradient-to-r from-gray-50 to-slate-50 text-gray-500 hover:from-gray-100 hover:to-slate-100 shadow-sm border border-gray-200/30"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </motion.button>
                <motion.button
                  onClick={() => setDeepResearchEnabled(!deepResearchEnabled)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-300 ${
                    deepResearchEnabled
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-md border border-blue-200/30"
                      : "bg-gradient-to-r from-gray-50 to-slate-50 text-gray-500 hover:from-gray-100 hover:to-slate-100 shadow-sm border border-gray-200/30"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <BrainCircuit className="w-4 h-4" />
                  <span>Research</span>
                </motion.button>
                <motion.button
                  onClick={() => setReasonEnabled(!reasonEnabled)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-300 ${
                    reasonEnabled
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 shadow-md border border-blue-200/30"
                      : "bg-gradient-to-r from-gray-50 to-slate-50 text-gray-500 hover:from-gray-100 hover:to-slate-100 shadow-sm border border-gray-200/30"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <BrainCircuit className="w-4 h-4" />
                  <span>Reason</span>
                </motion.button>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isAnyLoading}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                    inputValue.trim() && !isAnyLoading
                      ? "bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40"
                      : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 cursor-not-allowed shadow-sm"
                  }`}
                  whileHover={inputValue.trim() && !isAnyLoading ? { scale: 1.05, y: -2 } : {}}
                  whileTap={inputValue.trim() && !isAnyLoading ? { scale: 0.95 } : {}}
                >
                  {loadingState.sendingMessage ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowUp className="w-5 h-5" />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Suggestion Cards */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {[
              { icon: "🎨", title: "Gerar Imagem", desc: "Crie imagens incríveis com DALL-E", prompt: "Gere uma imagem de um robô futurista", gradient: "from-pink-500 to-rose-500" },
              { icon: "💡", title: "Brainstorm", desc: "Desenvolva ideias criativas", prompt: "Me ajude a fazer um brainstorm sobre inovação em IA", gradient: "from-yellow-500 to-orange-500" },
              { icon: "📊", title: "Análise", desc: "Analise dados e tendências", prompt: "Analise as tendências de IA para 2024", gradient: "from-green-500 to-emerald-500" },
              { icon: "🔍", title: "Pesquisar", desc: "Busque informações detalhadas", prompt: "Pesquise sobre as últimas novidades em tecnologia", gradient: "from-blue-500 to-cyan-500" },
              { icon: "🚀", title: "Produtividade", desc: "Otimize seu fluxo de trabalho", prompt: "Como posso ser mais produtivo no trabalho?", gradient: "from-purple-500 to-indigo-500" },
              { icon: "💬", title: "Conversa", desc: "Bate-papo casual e criativo", prompt: "Vamos ter uma conversa interessante sobre o futuro", gradient: "from-teal-500 to-blue-500" },
            ].map((suggestion, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  setInputValue(suggestion.prompt)
                  setTimeout(() => sendMessage(), 100)
                }}
                className="relative p-5 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 hover:bg-white/90 transition-all duration-300 text-left shadow-lg hover:shadow-xl group overflow-hidden"
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
              >
                {/* Gradient Border Effect */}
                <div className={`absolute inset-0 bg-gradient-to-r ${suggestion.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`} />
                
                <div className="relative z-10">
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{suggestion.icon}</div>
                  <h3 className="font-bold text-gray-800 mb-1.5 text-base">{suggestion.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{suggestion.desc}</p>
                </div>
                
                {/* Hover Arrow */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                  <ArrowUp className="w-4 h-4 text-gray-600 rotate-45" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Anonymous User Alert */}
      {!isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/50 px-6 py-4 shadow-sm"
        >
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-orange-800 font-medium text-sm">
                  ⚠️ <strong>Modo Anônimo:</strong> Suas conversas não estão sendo salvas permanentemente
                </p>
                <p className="text-orange-700 text-xs mt-0.5">
                  Faça login para salvar suas conversas e acessá-las em qualquer dispositivo
                </p>
              </div>
            </div>
            <motion.button
              onClick={() => {
                // Aqui você pode adicionar lógica para abrir modal de login
                console.log('Abrir modal de login')
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl text-sm font-medium hover:from-orange-700 hover:to-amber-700 transition-all duration-300 shadow-md hover:shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <LogIn className="w-4 h-4" />
              <span>Fazer Login</span>
            </motion.button>
          </div>
        </motion.div>
      )}
      
      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-8 py-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.4, 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 100,
                  damping: 10
                }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`flex max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
                  
                  {/* Avatar with Enhanced 3D Effect */}
                  <motion.div 
                    className={`flex-shrink-0 ${message.role === 'user' ? 'ml-4' : 'mr-4'}`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 shadow-blue-500/30 hover:shadow-blue-500/50' 
                        : 'bg-gradient-to-br from-white via-gray-50 to-blue-50 border-2 border-blue-200/50 shadow-gray-300/20 hover:shadow-blue-300/30'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-6 h-6 text-white drop-shadow-sm" />
                      ) : (
                        <Bot className="w-6 h-6 text-blue-600 drop-shadow-sm" />
                      )}
                    </div>
                  </motion.div>

                  {/* Message Content with Enhanced 3D Design */}
                  <motion.div 
                    className={`relative ${message.role === 'user' ? 'mr-4' : 'ml-4'}`}
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <div className={`p-6 rounded-3xl backdrop-blur-sm transition-all duration-300 ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 text-white shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/35 border border-blue-400/20' 
                        : 'bg-white/90 border border-gray-200/60 shadow-2xl shadow-gray-500/10 hover:shadow-gray-500/15 hover:bg-white'
                    }`}>
                      
                      {/* Message Header with Modern Design */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm font-bold tracking-wide ${
                            message.role === 'user' ? 'text-white/90' : 'text-gray-800'
                          }`}>
                            {message.role === 'user' ? '👤 Você' : '🤖 CDI Assistant'}
                          </span>
                          <span className={`text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur-sm ${
                            message.role === 'user' 
                              ? 'bg-white/20 text-white/80 border border-white/10' 
                              : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200/30'
                          }`}>
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        
                        {/* Enhanced Message Actions */}
                        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          {message.role === 'assistant' && (
                            <>
                              {/* Enhanced TTS Button */}
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => playAudio(message.id, message.content, ttsSettings.selectedVoice)}
                                  disabled={audioState[message.id]?.loading}
                                  className={`h-9 px-3 text-xs font-medium rounded-xl backdrop-blur-sm transition-all duration-300 ${
                                    audioState[message.id]?.playing 
                                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/40' 
                                      : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 shadow-md shadow-blue-500/10 border border-blue-200/30'
                                  }`}
                                  title={`${audioState[message.id]?.playing ? 'Pausar' : 'Ouvir'} com voz ${ttsSettings.selectedVoice}`}
                                >
                                  {audioState[message.id]?.loading ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                      TTS
                                    </>
                                  ) : audioState[message.id]?.playing ? (
                                    <>
                                      <Pause className="w-3.5 h-3.5 mr-1.5" />
                                      Pausar
                                    </>
                                  ) : (
                                    <>
                                      <Volume2 className="w-3.5 h-3.5 mr-1.5" />
                                      Ouvir
                                    </>
                                  )}
                                </Button>
                              </motion.div>
                              
                              {/* Enhanced Copy Button */}
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyMessage(message.content, message.id)}
                                  className="h-8 w-8 p-0 rounded-xl bg-gradient-to-r from-gray-50 to-slate-50 text-gray-600 hover:from-gray-100 hover:to-slate-100 hover:text-gray-800 shadow-md shadow-gray-500/10 border border-gray-200/30 transition-all duration-300"
                                >
                                  {copiedMessageId === message.id ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </Button>
                              </motion.div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Enhanced Message Text */}
                      <div className={`message-content leading-relaxed ${
                        message.role === 'user' ? 'text-white whitespace-pre-wrap break-words' : 'text-gray-800'
                      }`}>
                        {message.id === 'thinking_temp' ? (
                          <div className="flex items-center space-x-6">
                            {/* Enhanced AI Thinking Animation */}
                            <div className="relative">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              </div>
                              {/* Enhanced Loading Ring */}
                              <div className="absolute -inset-1.5 rounded-2xl border-3 border-transparent bg-gradient-to-r from-blue-400 to-purple-500 animate-spin" style={{ 
                                backgroundClip: 'padding-box',
                                WebkitBackgroundClip: 'padding-box'
                              }}></div>
                            </div>
                            
                            {/* Enhanced Animated Text */}
                            <div className="flex flex-col space-y-2">
                              <TextShimmer 
                                duration={2} 
                                spread={2} 
                                className="text-blue-700 font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                                as="span"
                              >
                                🧠 Processando com IA...
                              </TextShimmer>
                              <div className="flex items-center space-x-3">
                                <div className="flex space-x-1.5">
                                  <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0ms' }}></div>
                                  <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '100ms' }}></div>
                                  <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '200ms' }}></div>
                                  <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '300ms' }}></div>
                                  <div className="w-2 h-2 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '400ms' }}></div>
                                </div>
                                <span className="text-sm text-gray-600 animate-pulse font-medium">Analisando contexto</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <AdvancedTextRenderer
                            content={message.content}
                            messageRole={message.role}
                            enableInteractions={true}
                            options={{
                              allowEmojis: true,
                              allowMarkdown: true,
                              platform: 'universal'
                            }}
                            onLinkClick={(url) => window.open(url, '_blank')}
                            onMentionClick={(username) => console.log('Menção clicada:', username)}
                            onHashtagClick={(tag) => console.log('Hashtag clicada:', tag)}
                          />
                        )}
                      </div>

                      {/* Enhanced Image Display */}
                      {message.imageUrl && (
                        <motion.div 
                          className="mt-6"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                        >
                          <div className="relative inline-block bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl p-4 border border-gray-200/50 shadow-xl shadow-gray-500/10">
                            <Image
                              src={message.imageUrl}
                              alt="Imagem gerada por IA"
                              width={400}
                              height={400}
                              className="rounded-xl max-w-full h-auto shadow-2xl hover:shadow-3xl transition-all duration-500 cursor-pointer transform hover:scale-[1.02]"
                              style={{ maxHeight: '400px', objectFit: 'contain' }}
                              onClick={() => openFullImageView(message.imageUrl!)}
                            />
                            
                            {/* Enhanced Information Badges */}
                            <div className="absolute top-3 left-3 bg-gradient-to-r from-black/80 to-gray-900/80 text-white px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm border border-white/10">
                              ✨ DALL-E 3
                            </div>
                            
                            {/* Enhanced Image Controls */}
                            <div className="mt-4 flex justify-center space-x-4">
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openFullImageView(message.imageUrl!)}
                                  className="h-10 px-4 text-sm bg-white hover:bg-gray-50 border-gray-300 text-gray-700 transition-all duration-300 rounded-xl shadow-md hover:shadow-lg font-medium"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Visualizar
                                </Button>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadImage(message.imageUrl!, `dall-e-${Date.now()}.png`)}
                                  className="h-10 px-4 text-sm bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200 text-blue-700 transition-all duration-300 rounded-xl shadow-md hover:shadow-lg font-medium"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Baixar
                                </Button>
                              </motion.div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Enhanced Input Area */}
      <div className="border-t border-gray-200/50 bg-gradient-to-r from-white via-blue-50/20 to-indigo-50/20 backdrop-blur-sm p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end space-x-6">
            <div className="flex-1">
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-3xl p-5 shadow-2xl shadow-gray-500/10 hover:shadow-gray-500/15 transition-all duration-300">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value)
                    setTimeout(adjustTextareaHeight, 0)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Digite sua mensagem... (Shift+Enter para nova linha)"
                  className="w-full bg-transparent text-gray-800 resize-none outline-none placeholder:text-gray-500 text-base min-h-[24px] max-h-[120px] overflow-y-auto font-medium leading-relaxed"
                  rows={1}
                  disabled={isAnyLoading}
                  style={{ height: '24px' }}
                />
              </div>
            </div>
            
            <motion.button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isAnyLoading}
              className={`p-5 rounded-3xl transition-all duration-300 shadow-2xl font-medium ${
                inputValue.trim() && !isAnyLoading
                  ? "bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 text-white hover:from-blue-700 hover:via-blue-800 hover:to-purple-700 shadow-blue-500/30 hover:shadow-blue-500/40 border border-blue-400/20"
                  : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 cursor-not-allowed shadow-gray-500/10"
              }`}
              whileHover={inputValue.trim() && !isAnyLoading ? { scale: 1.05, y: -2 } : {}}
              whileTap={inputValue.trim() && !isAnyLoading ? { scale: 0.95 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              {loadingState.sendingMessage ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Full Image View Modal */}
      {fullImageView && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={closeFullImageView}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={fullImageView}
              alt="Visualização completa"
              width={800}
              height={800}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <Button
              onClick={closeFullImageView}
              className="absolute top-3 right-3 w-8 h-8 p-0 bg-white/90 text-gray-700 hover:bg-white"
            >
              <X className="w-4 h-4" />
            </Button>
            <div className="absolute bottom-3 right-3">
              <Button
                onClick={() => downloadImage(fullImageView)}
                className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2"
              >
                <Download className="w-3 h-3 mr-1" />
                Baixar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Summary Button */}
      {onOpenSummaryPanel && conversationId && (
        <motion.button
          onClick={onOpenSummaryPanel}
          className="fixed top-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white rounded-2xl shadow-2xl hover:shadow-blue-500/25 border border-blue-400/20 backdrop-blur-sm z-30 flex items-center justify-center group"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
          title="Ver Resumo da Conversa"
        >
          <BarChart3 className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
          <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
            <span className="text-xs font-bold text-white">AI</span>
          </div>
        </motion.button>
      )}

      {/* Conversation Loading Animation */}
      <ConversationLoading 
        isVisible={showConversationLoading}
        onAnimationComplete={() => {
          // Callback se necessário quando a animação completa
        }}
      />
    </div>
  )
})

AIAssistantInterface.displayName = 'AIAssistantInterface'

