'use client'

import React from 'react'
import { MessageCircle, MoreVertical } from 'lucide-react'
import { UserMenu } from '@/components/auth/user-menu'

interface ChatHeaderProps {
  conversationTitle: string
  isOnline: boolean
  lastSeen?: string
}

export function ChatHeader({ conversationTitle, isOnline, lastSeen }: ChatHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Informações da Conversa */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
          </div>
          
          <div>
            <h1 className="text-base font-semibold text-gray-900">{conversationTitle}</h1>
            <div className="flex items-center space-x-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-xs text-gray-500">
                {isOnline ? 'Online' : lastSeen ? `Visto ${lastSeen}` : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Ações do Chat e Menu do Usuário */}
        <div className="flex items-center space-x-2">
          <button 
            className="p-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors duration-200"
            title="Mais opções"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {/* Menu do Usuário */}
          <UserMenu variant="light" />
        </div>
      </div>
    </div>
  )
} 