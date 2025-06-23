"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { 
  Message, 
  LoadingState, 
  AudioState, 
  Conversation,
  ChatState,
  ChatActions
} from '../../types/features/chat'
import { generateId } from '../../utils/common'

interface UseChatStateProps {
  userId: string | null
  onConversationChange?: (conversationId: string | null) => void
}

export function useChatState({ userId, onConversationChange }: UseChatStateProps) {
  // Estados principais
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [loadingState, setLoadingState] = useState<LoadingState>({
    sendingMessage: false,
    loadingConversation: false,
    loadingHistory: false,
    savingMessage: false,
    generatingTTS: false,
    generatingImage: false
  })
  const [audioState, setAudioState] = useState<AudioState>({})
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Refs para controle
  const abortControllerRef = useRef<AbortController | null>(null)

  // Inicialização
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '**Olá! Como posso te ajudar hoje?**\n\nSou seu assistente com super memória - posso lembrar de tudo que discutimos, gerar imagens e muito mais!\n\n✨ **Dica**: Digite sua pergunta ou peça para criar uma imagem',
        timestamp: new Date()
      }])
    }
    setConnectionStatus('connected')
  }, [messages.length])

  // Funções auxiliares
  const updateLoadingState = useCallback((key: keyof LoadingState, value: boolean) => {
    setLoadingState(prev => ({ ...prev, [key]: value }))
  }, [])

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message])
  }, [])

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ))
  }, [])

  const deleteMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id))
  }, [])

  const removeThinkingMessage = useCallback(() => {
    setMessages(prev => prev.filter(msg => msg.id !== 'thinking_temp'))
  }, [])

  // Carregar conversa
  const loadConversation = useCallback(async (convId: string) => {
    if (loadingState.loadingConversation || loadingState.sendingMessage || !userId) return

    try {
      updateLoadingState('loadingConversation', true)
      setConnectionStatus('connecting')
      
      const response = await fetch(`/api/conversations/${convId}/messages?userId=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setConversationId(convId)
        onConversationChange?.(convId)
        
        // Converter mensagens do banco para o formato do componente
        const loadedMessages: Message[] = data.messages.map((msg: any) => {
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
        setRetryCount(0)
      }
    } catch (error) {
      setConnectionStatus('error')
      console.error('Erro ao carregar conversa:', error)
    } finally {
      updateLoadingState('loadingConversation', false)
    }
  }, [loadingState.loadingConversation, loadingState.sendingMessage, userId, onConversationChange, updateLoadingState])

  // Iniciar nova conversa
  const startNewConversation = useCallback(() => {
    if (loadingState.sendingMessage || loadingState.loadingConversation) return

    setConversationId(null)
    onConversationChange?.(null)
    setConnectionStatus('connected')
    setRetryCount(0)
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '**Olá! Como posso te ajudar hoje?**\n\nSou seu assistente com super memória - posso lembrar de tudo que discutimos, gerar imagens e muito mais!\n\n✨ **Dica**: Digite sua pergunta ou peça para criar uma imagem',
      timestamp: new Date()
    }])
  }, [loadingState.sendingMessage, loadingState.loadingConversation, onConversationChange])

  // Enviar mensagem
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loadingState.sendingMessage || !userId) return

    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    addMessage(userMessage)
    updateLoadingState('sendingMessage', true)
    updateLoadingState('thinking', true)
    setConnectionStatus('connecting')

    // Adicionar mensagem de "pensando"
    const thinkingMessage: Message = {
      id: 'thinking_temp',
      role: 'assistant',
      content: '**Pensando...**',
      timestamp: new Date()
    }
    addMessage(thinkingMessage)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          conversationId,
          userId,
          fullContext: messages.filter(m => m.id !== 'welcome').map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
          }))
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        imageUrl: data.imageUrl
      }

      setConnectionStatus('connected')
      setRetryCount(0)
      updateLoadingState('thinking', false)
      
      removeThinkingMessage()
      addMessage(assistantMessage)
      
      // Atualizar ID da conversa se necessário
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
        onConversationChange?.(data.conversationId)
        
        // Disparar evento de nova conversa
        const event = new CustomEvent('conversationCreated', {
          detail: {
            conversationId: data.conversationId,
            title: data.conversationTitle || 'Nova Conversa'
          }
        })
        window.dispatchEvent(event)
      }

    } catch (error: any) {
      if (error.name === 'AbortError') return // Requisição cancelada

      setConnectionStatus('error')
      setRetryCount(prev => prev + 1)
      updateLoadingState('thinking', false)
      
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `❌ **Erro na comunicação** (Tentativa ${retryCount + 1})\n\n${error.message.includes('network') || error.message.includes('fetch') ? 
          'Problema de conexão detectado.' : 
          'Erro no servidor.'}\n\n• 🔄 **Tente novamente** em alguns segundos\n• 🌐 **Verifique** sua conexão com a internet\n• ⚙️ **Se persistir**, verifique as configurações da API`,
        timestamp: new Date()
      }
      
      removeThinkingMessage()
      addMessage(errorMessage)
    } finally {
      updateLoadingState('sendingMessage', false)
      abortControllerRef.current = null
    }
  }, [loadingState.sendingMessage, userId, conversationId, messages, addMessage, updateLoadingState, removeThinkingMessage, retryCount, onConversationChange])

  // Copiar mensagem
  const copyMessage = useCallback(async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error('Erro ao copiar:', error)
    }
  }, [])

  // Controles de áudio
  const playAudio = useCallback(async (messageId: string, content: string) => {
    // Implementação do TTS será adicionada depois
    console.log('Play audio:', messageId, content)
  }, [])

  const stopAudio = useCallback((messageId: string) => {
    const audio = audioState[messageId]?.audio
    if (audio) {
      audio.pause()
      setAudioState(prev => ({
        ...prev,
        [messageId]: { ...prev[messageId], playing: false }
      }))
    }
  }, [audioState])

  // Estado combinado
  const chatState: ChatState = {
    messages,
    currentConversation: conversationId ? { id: conversationId } as Conversation : null,
    loadingState,
    connectionStatus,
    error: null,
    audioState
  }

  // Ações combinadas
  const chatActions: ChatActions = {
    sendMessage,
    loadConversation,
    startNewConversation,
    addMessage,
    updateMessage,
    deleteMessage,
    playAudio,
    stopAudio,
    copyMessage
  }

  return {
    // Estados
    ...chatState,
    copiedMessageId,
    retryCount,
    
    // Ações
    ...chatActions,
    
    // Funções auxiliares
    updateLoadingState,
    
    // Computed values
    isAnyLoading: Object.values(loadingState).some(loading => loading)
  }
} 