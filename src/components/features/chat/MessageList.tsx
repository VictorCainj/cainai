"use client"

import React from 'react'
import { Message, AudioState } from '../../../types/features/chat'
import { MessageItem } from './MessageItem'
import { motion, AnimatePresence } from 'framer-motion'

interface MessageListProps {
  messages: Message[]
  audioState: AudioState
  copiedMessageId: string | null
  onCopyMessage: (content: string, messageId: string) => Promise<void>
  onPlayAudio: (messageId: string, content: string) => Promise<void>
  onStopAudio: (messageId: string) => void
  onDownloadImage: (imageUrl: string, fileName?: string) => Promise<void>
  onOpenFullImage: (imageUrl: string) => void
}

export function MessageList({
  messages,
  audioState,
  copiedMessageId,
  onCopyMessage,
  onPlayAudio,
  onStopAudio,
  onDownloadImage,
  onOpenFullImage
}: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <AnimatePresence initial={false}>
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <MessageItem
              message={message}
              audioState={audioState[message.id]}
              isCopied={copiedMessageId === message.id}
              onCopy={() => onCopyMessage(message.content, message.id)}
              onPlayAudio={() => onPlayAudio(message.id, message.content)}
              onStopAudio={() => onStopAudio(message.id)}
              onDownloadImage={onDownloadImage}
              onOpenFullImage={onOpenFullImage}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      
      {/* Elemento para scroll automático */}
      <div id="messages-end" />
    </div>
  )
} 