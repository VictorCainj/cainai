"use client";

import React, { useState, useRef, useEffect, useImperativeHandle, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Send, Bot, User, Loader2, Copy, CheckCircle2, AlertCircle, 
  Search, Mic, ArrowUp, Plus, FileText, Code, BookOpen, 
  PenTool, BrainCircuit, Play, Pause, Download, Eye, X, Volume2, VolumeX 
} from 'lucide-react'
import { sessionManager } from '@/lib/session'
import Image from 'next/image'
import { motion, AnimatePresence } from "framer-motion"
import { TextShimmer } from '@/components/ui/text-shimmer'
import { InlineCodePanel } from '@/components/ui/inline-code-panel'
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

type CodeBlock = {
  language: string
  code: string
  start: number
  end: number
}

export const AIAssistantInterface = React.forwardRef<
  { startNewConversation: () => void; loadConversation: (id: string) => void; conversationId: string | null }
>((props, ref) => {
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

  // Usar o session manager para obter userId
  const userId = sessionManager.getUserId()

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

  // Função para detectar blocos de código
  const detectCodeBlocks = (content: string): CodeBlock[] => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const blocks: CodeBlock[] = []
    let match

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
        start: match.index,
        end: match.index + match[0].length
      })
    }

    return blocks
  }

  // Função para detectar se a mensagem contém código
  const hasCodeContent = (content: string): boolean => {
    return detectCodeBlocks(content).length > 0 || 
           content.includes('```') || 
           /\b(function|const|let|var|class|import|export|def|public|private)\b/.test(content)
  }



  // Componente para renderizar código com destaque
  const CodeHighlight = ({ language, code, messageId }: { language: string, code: string, messageId: string }) => {
    return (
      <InlineCodePanel
        title={`Código ${language.toUpperCase()}`}
        language={language}
        code={code}
      />
    );
  }

  const renderMessage = (content: string, messageRole: 'user' | 'assistant' = 'assistant', messageId?: string) => {
    // Detectar blocos de código primeiro
    const codeBlocks = detectCodeBlocks(content)
    
    if (codeBlocks.length > 0) {
      const parts = []
      let lastIndex = 0
      
      codeBlocks.forEach((block, blockIndex) => {
        // Adicionar texto antes do bloco de código
        if (block.start > lastIndex) {
          const textBefore = content.slice(lastIndex, block.start)
          if (textBefore.trim()) {
            parts.push(
              <div key={`text-${blockIndex}`} className="mb-4">
                {renderTextContent(textBefore, messageRole)}
              </div>
            )
          }
        }
        
        // Adicionar bloco de código diretamente
        parts.push(
          <CodeHighlight 
            key={`code-${blockIndex}`}
            language={block.language}
            code={block.code}
            messageId={messageId || 'unknown'}
          />
        )
        
        lastIndex = block.end
      })
      
      // Adicionar texto após o último bloco
      if (lastIndex < content.length) {
        const textAfter = content.slice(lastIndex)
        if (textAfter.trim()) {
          parts.push(
            <div key="text-after" className="mt-4">
              {renderTextContent(textAfter, messageRole)}
            </div>
          )
        }
      }
      
      return parts
    }
    
    // Se não há código, renderizar normalmente
    return renderTextContent(content, messageRole)
  }

  const renderTextContent = (content: string, messageRole: 'user' | 'assistant' = 'assistant') => {
    // Remover blocos de código primeiro para não renderizá-los inline
    const contentWithoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '')
    
    return contentWithoutCodeBlocks
      .split('\n')
      .map((line, index) => {
        // Headers # ## ###
        if (line.match(/^#{1,6}\s/)) {
          const level = line.match(/^#+/)?.[0].length || 1
          const headerText = line.replace(/^#+\s/, '')
          const headerClass = messageRole === 'user' 
            ? `text-white font-bold my-2 ${level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm'}` 
            : `text-gray-800 font-bold my-2 ${level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm'}`
          
          return (
            <div key={index} className={headerClass}>
              {messageRole === 'assistant' ? (
                <TextShimmer duration={2.5} spread={1} className="font-bold">
                  {headerText}
                </TextShimmer>
              ) : (
                headerText
              )}
            </div>
          )
        }

        // Bullet points
        if (line.startsWith('• ') || line.startsWith('- ') || line.match(/^\s*[\*\-]\s/)) {
          const bulletText = line.replace(/^\s*[\*\-•]\s/, '')
          return (
            <div key={index} className="flex items-start space-x-2 my-1">
              <span className={messageRole === 'user' ? "text-white/80 mt-1" : "text-blue-600 mt-1"}>•</span>
              <span className={messageRole === 'user' ? "text-white" : "text-gray-700"}>
                {messageRole === 'assistant' ? (
                  <TextShimmer duration={3} spread={1.2}>
                    {bulletText}
                  </TextShimmer>
                ) : (
                  bulletText
                )}
              </span>
            </div>
          )
        }

        // Código inline `code`
        if (line.includes('`') && !line.includes('```')) {
          const codeInlineRegex = /`([^`]+)`/g
          const processedLine = line.replace(codeInlineRegex, (match, code) => {
            return `<code class="${messageRole === 'user' ? 'bg-white/20 text-white px-2 py-1 rounded text-sm font-mono' : 'bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono text-gray-800 dark:text-gray-200'}">${code}</code>`
          })
          
          return (
            <div key={index} className={`my-1 ${messageRole === 'user' ? 'text-white' : 'text-gray-700'}`}>
              <span 
                dangerouslySetInnerHTML={{ __html: processedLine }} 
                className={messageRole === 'user' ? 'text-white' : 'text-gray-700'}
              />
            </div>
          )
        }

        // Negrito **texto**
        const processedLine = line.replace(/\*\*(.*?)\*\*/g, `<strong class="${messageRole === 'user' ? 'text-white font-semibold' : 'text-gray-800 font-semibold'}">$1</strong>`)
        
        return line.trim() ? (
          <div key={index} className={`my-1 ${messageRole === 'user' ? 'text-white leading-relaxed' : 'text-gray-700'}`}>
            {messageRole === 'assistant' ? (
              <TextShimmer duration={3} spread={1.5}>
                {line.replace(/\*\*(.*?)\*\*/g, '$1')}
              </TextShimmer>
            ) : (
              <span 
                dangerouslySetInnerHTML={{ __html: processedLine }} 
                className={`whitespace-pre-wrap break-words ${messageRole === 'user' ? 'text-white' : 'text-gray-700'}`}
              />
            )}
          </div>
        ) : (
          <br key={index} />
        )
      })
  }

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white p-6">
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
          {/* Logo with animated gradient */}
          <div className="mb-8 w-20 h-20 relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 200 200"
              width="100%"
              height="100%"
              className="w-full h-full"
            >
              <g clipPath="url(#cs_clip_1_ellipse-12)">
                <mask
                  id="cs_mask_1_ellipse-12"
                  style={{ maskType: "alpha" }}
                  width="200"
                  height="200"
                  x="0"
                  y="0"
                  maskUnits="userSpaceOnUse"
                >
                  <path
                    fill="#fff"
                    fillRule="evenodd"
                    d="M100 150c27.614 0 50-22.386 50-50s-22.386-50-50-50-50 22.386-50 50 22.386 50 50 50zm0 50c55.228 0 100-44.772 100-100S155.228 0 100 0 0 44.772 0 100s44.772 100 100 100z"
                    clipRule="evenodd"
                  ></path>
                </mask>
                <g mask="url(#cs_mask_1_ellipse-12)">
                  <path fill="#fff" d="M200 0H0v200h200V0z"></path>
                  <path
                    fill="#0066FF"
                    fillOpacity="0.33"
                    d="M200 0H0v200h200V0z"
                  ></path>
                  <g
                    filter="url(#filter0_f_844_2811)"
                    className="animate-gradient"
                  >
                    <path fill="#0066FF" d="M110 32H18v68h92V32z"></path>
                    <path fill="#0044FF" d="M188-24H15v98h173v-98z"></path>
                    <path fill="#0099FF" d="M175 70H5v156h170V70z"></path>
                    <path fill="#00CCFF" d="M230 51H100v103h130V51z"></path>
                  </g>
                </g>
              </g>
              <defs>
                <filter
                  id="filter0_f_844_2811"
                  width="385"
                  height="410"
                  x="-75"
                  y="-104"
                  colorInterpolationFilters="sRGB"
                  filterUnits="userSpaceOnUse"
                >
                  <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>
                  <feBlend
                    in="SourceGraphic"
                    in2="BackgroundImageFix"
                    result="shape"
                  ></feBlend>
                  <feGaussianBlur
                    result="effect1_foregroundBlur_844_2811"
                    stdDeviation="40"
                  ></feGaussianBlur>
                </filter>
                <clipPath id="cs_clip_1_ellipse-12">
                  <path fill="#fff" d="M0 0H200V200H0z"></path>
                </clipPath>
              </defs>
            </svg>
          </div>

          {/* Welcome message */}
          <div className="mb-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 mb-2">
                Ready to assist you
              </h1>
              <p className="text-gray-500 max-w-md">
                Ask me anything or try one of the suggestions below
              </p>
            </motion.div>
          </div>

          {/* Input area with integrated functions */}
          <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-4">
            <div className="p-4">
              <textarea
                ref={inputRef}
                placeholder="Ask me anything..."
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
                className="w-full text-gray-700 text-base outline-none placeholder:text-gray-400 resize-none min-h-[24px] max-h-[120px] overflow-y-auto"
                rows={1}
                style={{ height: '24px' }}
              />
            </div>

            {/* Functions and actions */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSearchEnabled(!searchEnabled)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    searchEnabled
                      ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </button>
                <button
                  onClick={() => setDeepResearchEnabled(!deepResearchEnabled)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    deepResearchEnabled
                      ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  <BrainCircuit className="w-4 h-4" />
                  <span>Research</span>
                </button>
                <button
                  onClick={() => setReasonEnabled(!reasonEnabled)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    reasonEnabled
                      ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  <BrainCircuit className="w-4 h-4" />
                  <span>Reason</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isAnyLoading}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                    inputValue.trim() && !isAnyLoading
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {loadingState.sendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`flex max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                  
                  {/* Avatar */}
                  <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-3' : 'mr-3'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
                        : 'bg-gradient-to-r from-gray-100 to-gray-50 border-2 border-gray-200'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <Bot className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className={`relative ${message.role === 'user' ? 'mr-3' : 'ml-3'}`}>
                    <div className={`p-4 rounded-2xl border shadow-sm ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600 shadow-blue-200' 
                        : 'bg-white border-gray-200 shadow-gray-100'
                    }`}>
                      
                      {/* Message Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-semibold ${
                            message.role === 'user' ? 'text-white' : 'text-gray-700'
                          }`}>
                            {message.role === 'user' ? 'Você' : 'Assistente IA'}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            message.role === 'user' ? 'bg-white/20 text-white/80' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {formatTimestamp(message.timestamp)}
                          </span>
                        </div>
                        
                        {/* Message Actions */}
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {message.role === 'assistant' && (
                            <>
                              {/* TTS Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => playAudio(message.id, message.content, ttsSettings.selectedVoice)}
                                disabled={audioState[message.id]?.loading}
                                className={`h-8 px-2 text-xs transition-all duration-200 ${
                                  audioState[message.id]?.playing 
                                    ? 'bg-green-500 text-white hover:bg-green-600' 
                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                }`}
                                title={`${audioState[message.id]?.playing ? 'Pausar' : 'Ouvir'} com voz ${ttsSettings.selectedVoice}`}
                              >
                                {audioState[message.id]?.loading ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                    TTS
                                  </>
                                ) : audioState[message.id]?.playing ? (
                                  <>
                                    <Pause className="w-3 h-3 mr-1" />
                                    Pausar
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-3 h-3 mr-1" />
                                    Ouvir
                                  </>
                                )}
                              </Button>
                              
                              {/* Copy Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyMessage(message.content, message.id)}
                                className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                              >
                                {copiedMessageId === message.id ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Message Text */}
                      <div className={`message-content leading-relaxed ${
                        message.role === 'user' ? 'text-white whitespace-pre-wrap break-words' : 'text-gray-800'
                      }`}>
                        {message.id === 'thinking_temp' ? (
                          <div className="flex items-center space-x-4">
                            {/* Ícone de IA animado */}
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
                                <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              </div>
                              {/* Anel de carregamento */}
                              <div className="absolute -inset-1 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"></div>
                            </div>
                            
                            {/* Texto animado */}
                            <div className="flex flex-col space-y-1">
                              <TextShimmer 
                                duration={2} 
                                spread={2} 
                                className="text-blue-600 font-semibold text-base"
                                as="span"
                              >
                                🤖 Gerando resposta...
                              </TextShimmer>
                              <div className="flex items-center space-x-2">
                                <div className="flex space-x-1">
                                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
                                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                  <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                                </div>
                                <span className="text-xs text-gray-500 animate-pulse">Processando com IA</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          renderMessage(message.content, message.role, message.id)
                        )}
                      </div>

                      {/* Image Display Melhorada */}
                      {message.imageUrl && (
                        <div className="mt-4">
                          <div className="relative inline-block bg-gray-50 rounded-xl p-3 border border-gray-200">
                            <Image
                              src={message.imageUrl}
                              alt="Imagem gerada por IA"
                              width={400}
                              height={400}
                              className="rounded-lg max-w-full h-auto shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                              style={{ maxHeight: '400px', objectFit: 'contain' }}
                              onClick={() => openFullImageView(message.imageUrl!)}
                            />
                            
                            {/* Badges de Informação */}
                            <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium">
                              🎨 DALL-E 3
                            </div>
                            
                            {/* Image Controls Destacados */}
                            <div className="mt-3 flex justify-center space-x-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openFullImageView(message.imageUrl!)}
                                className="h-9 px-4 text-sm bg-white hover:bg-gray-50 border-gray-300 text-gray-700 transition-all duration-200"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadImage(message.imageUrl!, `dall-e-${Date.now()}.png`)}
                                className="h-9 px-4 text-sm bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 transition-all duration-200"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Baixar
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Removido indicador de carregamento duplicado - agora usa apenas a mensagem thinking_temp */}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-sm">
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
                  className="w-full bg-transparent text-gray-700 resize-none outline-none placeholder:text-gray-400 text-base min-h-[24px] max-h-[120px] overflow-y-auto"
                  rows={1}
                  disabled={isAnyLoading}
                  style={{ height: '24px' }}
                />
              </div>
            </div>
            

            
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isAnyLoading}
              className={`p-4 rounded-2xl transition-all duration-200 shadow-md ${
                inputValue.trim() && !isAnyLoading
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-blue-200"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              {loadingState.sendingMessage ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
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

