'use client'

import React, { useRef } from 'react'
import { ChatInterface } from '@/components/chat/chat-interface'
import { Sidebar } from '@/components/sidebar/sidebar'

export default function Home() {
  const chatRef = useRef<{
    startNewConversation: () => void
    loadConversation: (id: string) => void
    conversationId: string | null
  }>(null)

  const handleNewConversation = () => {
    chatRef.current?.startNewConversation()
  }

  const handleLoadConversation = (id: string) => {
    chatRef.current?.loadConversation(id)
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <Sidebar 
        onNewConversation={handleNewConversation}
        onLoadConversation={handleLoadConversation}
        currentConversationId={chatRef.current?.conversationId || null}
      />
      
      {/* Chat Principal */}
      <main className="flex-1 flex flex-col">
        <ChatInterface 
          ref={chatRef}
        />
      </main>
    </div>
  )
} 