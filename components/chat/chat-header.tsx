'use client'

import React from 'react'
import { MessageCircle, MoreVertical } from 'lucide-react'

interface ChatHeaderProps {
  conversationTitle: string
  isOnline: boolean
  lastSeen?: string
}

export function ChatHeader({ conversationTitle, isOnline, lastSeen }: ChatHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Informações da Conversa */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            {isOnline && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{conversationTitle}</h1>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-500">
                {isOnline ? 'Online' : lastSeen ? `Visto ${lastSeen}` : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Ações do Chat */}
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors duration-200"
            title="Mais opções"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
} 