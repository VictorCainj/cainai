"use client"

import React from 'react'
import { Message } from '../../../types/features/chat'
import { 
  Bot, User, Copy, CheckCircle2, Play, Pause, Download, Eye, 
  Volume2, VolumeX, Loader2 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatTimestamp } from '../../../utils/common'
import { cn } from '../../../utils/common'
import Image from 'next/image'

interface MessageItemProps {
  message: Message
  audioState?: {
    playing: boolean
    loading: boolean
    audio?: HTMLAudioElement
  }
  isCopied: boolean
  onCopy: () => void
  onPlayAudio: () => void
  onStopAudio: () => void
  onDownloadImage: (imageUrl: string, fileName?: string) => Promise<void>
  onOpenFullImage: (imageUrl: string) => void
}

export function MessageItem({
  message,
  audioState,
  isCopied,
  onCopy,
  onPlayAudio,
  onStopAudio,
  onDownloadImage,
  onOpenFullImage
}: MessageItemProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  const renderContent = (content: string) => {
    // Renderização básica de markdown
    const lines = content.split('\n')
    return lines.map((line, index) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <div key={index} className="font-semibold mb-2">
            {line.slice(2, -2)}
          </div>
        )
      }
      if (line.startsWith('• ')) {
        return (
          <div key={index} className="ml-4 mb-1">
            {line}
          </div>
        )
      }
      return (
        <div key={index} className={line.trim() ? 'mb-2' : 'mb-1'}>
          {line}
        </div>
      )
    })
  }

  return (
    <div className={cn(
      "flex gap-3 w-full",
      isUser ? "justify-end" : "justify-start"
    )}>
      {/* Avatar */}
      {isAssistant && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Message bubble */}
      <div className={cn(
        "relative max-w-[80%] rounded-lg px-4 py-3 shadow-sm",
        isUser 
          ? "bg-blue-500 text-white" 
          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      )}>
        {/* Message content */}
        <div className="text-sm">
          {renderContent(message.content)}
        </div>

        {/* Image if present */}
        {message.imageUrl && (
          <div className="mt-3 rounded-lg overflow-hidden">
            <div className="relative">
              <Image
                src={message.imageUrl}
                alt="Generated image"
                width={300}
                height={300}
                className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onOpenFullImage(message.imageUrl!)}
              />
              
              {/* Image controls */}
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  className="p-1 h-8 w-8"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    onOpenFullImage(message.imageUrl!)
                  }}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="p-1 h-8 w-8"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    onDownloadImage(message.imageUrl!)
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Message timestamp */}
        <div className={cn(
          "text-xs mt-2 opacity-70",
          isUser ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
        )}>
          {formatTimestamp(message.timestamp)}
        </div>

        {/* Message actions */}
        <div className="flex items-center gap-1 mt-2">
          {/* Copy button */}
          <Button
            size="sm"
            variant="ghost"
            className="p-1 h-6 w-6 opacity-70 hover:opacity-100"
            onClick={onCopy}
          >
            {isCopied ? (
              <CheckCircle2 className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>

          {/* Audio controls for assistant messages */}
          {isAssistant && (
            <Button
              size="sm"
              variant="ghost"
              className="p-1 h-6 w-6 opacity-70 hover:opacity-100"
              onClick={audioState?.playing ? onStopAudio : onPlayAudio}
              disabled={audioState?.loading}
            >
              {audioState?.loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : audioState?.playing ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
          <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </div>
      )}
    </div>
  )
} 