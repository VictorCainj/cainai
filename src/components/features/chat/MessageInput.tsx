"use client"

import React, { useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Loader2, Mic, Plus, FileAudio } from 'lucide-react'
import { cn } from '../../../utils/common'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  loading?: boolean
  placeholder?: string
  showMic?: boolean
  onMicClick?: () => void
  showAttachment?: boolean
  onAttachmentClick?: () => void
  showAudioUpload?: boolean
  onAudioUploadClick?: () => void
}

export function MessageInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  loading = false,
  placeholder = "Digite sua mensagem...",
  showMic = false,
  onMicClick,
  showAttachment = false,
  onAttachmentClick,
  showAudioUpload = true,
  onAudioUploadClick
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const maxHeight = 120 // máximo de ~6 linhas
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px'
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && !loading && value.trim()) {
        onSubmit()
      }
    }
  }

  const handleSubmit = () => {
    if (!disabled && !loading && value.trim()) {
      onSubmit()
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        {/* Attachment button */}
        {showAttachment && (
          <Button
            size="sm"
            variant="ghost"
            className="p-2 h-10 w-10 shrink-0"
            onClick={onAttachmentClick}
            disabled={disabled || loading}
            title="Anexar arquivo"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}

        {/* Audio upload button */}
        {showAudioUpload && (
          <Button
            size="sm"
            variant="ghost"
            className="p-2 h-10 w-10 shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
            onClick={onAudioUploadClick}
            disabled={disabled || loading}
            title="Upload de áudio para transcrição"
          >
            <FileAudio className="w-4 h-4" />
          </Button>
        )}

        {/* Text input area */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || loading}
            className={cn(
              "w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600",
              "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
              "px-4 py-3 pr-12 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "placeholder-gray-500 dark:placeholder-gray-400",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "min-h-[44px] max-h-[120px]"
            )}
            style={{ height: '44px' }}
          />
          
          {/* Character count (optional) */}
          {value.length > 0 && (
            <div className="absolute bottom-1 left-2 text-xs text-gray-400">
              {value.length}
            </div>
          )}
        </div>

        {/* Microphone button */}
        {showMic && (
          <Button
            size="sm"
            variant="ghost"
            className="p-2 h-10 w-10 shrink-0"
            onClick={onMicClick}
            disabled={disabled || loading}
            title="Gravação de voz"
          >
            <Mic className="w-4 h-4" />
          </Button>
        )}

        {/* Send button */}
        <Button
          size="sm"
          className="p-2 h-10 w-10 shrink-0"
          onClick={handleSubmit}
          disabled={disabled || loading || !value.trim()}
          title="Enviar mensagem"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Status indicator */}
      {loading && (
        <div className="flex items-center justify-center mt-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Enviando mensagem...
        </div>
      )}
    </div>
  )
} 