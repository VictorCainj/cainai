'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AIAssistantInterface } from '@/components/ui/ai-assistant-interface'
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar'
import { Sparkles, Loader2, Zap, Activity, MessageCircle, Settings, Home, Brain, History, LogOut, Plus, Clock, Trash2, Calendar } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { chatService } from '@/lib/chat-service'
import { sessionManager } from '@/lib/session'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface Conversation {
  id: string
  title: string
  last_message: string
  created_at: string
  updated_at: string
  message_count: number
}

interface NavigationLink {
  label: string
  href: string
  icon: React.ReactNode
  onClick?: () => void
}

export default function ChatbotPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [currentConversationTitle, setCurrentConversationTitle] = useState('Sistema J.A.R.V.I.S')
  const chatInterfaceRef = useRef<{ startNewConversation: () => void; loadConversation: (id: string) => void; conversationId: string | null }>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(false)
  
  // Obter userId
  const userId = sessionManager.getUserId() || user?.id

  const handleHistoryClick = () => {
    setShowHistory(!showHistory)
    if (!showHistory && conversations.length === 0) {
      loadConversations()
    }
  }

  const handleNewConversationClick = () => {
    handleNewConversation()
    setShowHistory(false)
  }

  // Carregar conversas do usuário
  const loadConversations = async () => {
    if (!userId) {
      setLoadingConversations(false)
      return
    }

    try {
      setLoadingConversations(true)
      const conversationsData = await chatService.getUserConversations(userId)
      
      if (conversationsData && conversationsData.length > 0) {
        const formattedConversations: Conversation[] = conversationsData.map((conv: any) => ({
          id: conv.id,
          title: conv.title || 'Conversa sem título',
          last_message: conv.last_message || 'Sem mensagens',
          created_at: conv.created_at,
          updated_at: conv.updated_at,
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
      setLoadingConversations(false)
    }
  }

  // Formatar timestamp
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

  // Deletar conversa
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await chatService.deleteConversation(conversationId)
      setConversations(prev => prev.filter(conv => conv.id !== conversationId))
      
      // Se a conversa excluída era a atual, limpar seleção
      if (currentConversationId === conversationId) {
        handleNewConversation()
      }
    } catch (error) {
      console.error('Erro ao excluir conversa:', error)
    }
  }

  const navigationLinks: NavigationLink[] = [
    {
      label: "Nova Conversa",
      href: "#",
      icon: <Plus className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      onClick: handleNewConversationClick
    },
    {
      label: "Histórico",
      href: "#",
      icon: <History className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
      onClick: handleHistoryClick
    },
    {
      label: "Configurações",
      href: "#",
      icon: <Settings className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    }
  ]

  const Logo = () => {
    return (
      <Link
        href="/chatbot"
        className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
      >
        <div className="h-5 w-6 bg-gradient-to-br from-blue-600 to-blue-400 rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-medium text-black dark:text-white whitespace-pre"
        >
          CDI Assistant
        </motion.span>
      </Link>
    )
  }

  const LogoIcon = () => {
    return (
      <Link
        href="/chatbot"
        className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
      >
        <div className="h-5 w-6 bg-gradient-to-br from-blue-600 to-blue-400 rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
      </Link>
    )
  }

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
          setCurrentConversationTitle(conversation.title || 'Sessão Neural Ativa')
        }
      }
    } catch (error) {
      console.error('Erro ao buscar título da conversa:', error)
      setCurrentConversationTitle('Sessão Neural')
    }

    // Carregar conversa no chat interface
    if (chatInterfaceRef.current) {
      chatInterfaceRef.current.loadConversation(id)
    }
  }

  const handleNewConversation = () => {
    setCurrentConversationId(null)
    setCurrentConversationTitle('Sistema J.A.R.V.I.S')
    
    // Iniciar nova conversa no chat interface
    if (chatInterfaceRef.current) {
      chatInterfaceRef.current.startNewConversation()
    }
  }

  // Recarregar conversas quando usuário muda
  useEffect(() => {
    if (userId && showHistory) {
      loadConversations()
    }
  }, [userId])

  // Atualizar título quando a conversa for criada
  useEffect(() => {
    const handleConversationCreated = (event: CustomEvent) => {
      const { conversationId, title } = event.detail
      setCurrentConversationId(conversationId)
      setCurrentConversationTitle(title || 'Nova Sessão Neural')
      
      // Recarregar lista de conversas se o histórico estiver visível
      if (showHistory) {
        loadConversations()
      }
    }

    window.addEventListener('conversationCreated', handleConversationCreated as EventListener)
    return () => {
      window.removeEventListener('conversationCreated', handleConversationCreated as EventListener)
    }
  }, [showHistory])

  if (loading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        {/* Loading Content with Modern Design */}
        <div className="w-full max-w-md mx-auto flex flex-col items-center p-6">
          {/* Modern Logo */}
          <div className="mb-8 w-16 h-16 relative">
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

          {/* Modern Loading Text */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400">
              Assistente IA
            </h1>
            <p className="text-gray-500">Inicializando sistema...</p>
            
            {/* Modern Loading Progress */}
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full w-1/3" style={{
                animation: 'gradient-flow 1.5s ease-in-out infinite'
              }}></div>
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
    <div className="h-screen bg-white dark:bg-neutral-900 flex overflow-hidden">
      {/* Sidebar Principal de Navegação */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {sidebarOpen ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {navigationLinks.map((link, idx) => (
                <div key={idx} onClick={link.onClick}>
                  <SidebarLink link={link} />
                </div>
              ))}
            </div>
            
            {/* Histórico de Conversas */}
            {showHistory && sidebarOpen && (
              <div className="mt-6 border-t border-neutral-200 dark:border-neutral-700 pt-4">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 px-2">
                  Histórico
                </h3>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {loadingConversations ? (
                    <div className="p-3 text-center">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto text-neutral-500" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
                      Nenhuma conversa encontrada
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          currentConversationId === conversation.id
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                        }`}
                        onClick={() => handleSelectConversation(conversation.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">
                            {conversation.title}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Calendar className="w-3 h-3 text-neutral-400" />
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {formatTimestamp(conversation.updated_at)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteConversation(conversation.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div>
            <SidebarLink
              link={{
                label: user?.user_metadata?.full_name || user?.email || "Usuário",
                href: "#",
                icon: (
                  <Image
                    src={user?.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face"}
                    className="h-7 w-7 flex-shrink-0 rounded-full"
                    width={50}
                    height={50}
                    alt="Avatar"
                  />
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Área de Chat - Layout Simplificado */}
      <div className="flex-1 flex flex-col min-w-0 relative bg-white dark:bg-neutral-900">
        <div className="flex-1 min-h-0 relative">
          <AIAssistantInterface ref={chatInterfaceRef} />
        </div>
      </div>
    </div>
  )
} 