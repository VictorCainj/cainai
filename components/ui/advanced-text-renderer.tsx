"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { advancedTextFormatter, FormattedTextElement, FormattingOptions } from '@/lib/advanced-text-formatter'
import { InlineCodePanel } from './inline-code-panel'
import { cn } from '@/lib/utils'

interface AdvancedTextRendererProps {
  content: string
  options?: FormattingOptions
  className?: string
  messageRole?: 'user' | 'assistant'
  onLinkClick?: (url: string) => void
  onMentionClick?: (username: string) => void
  onHashtagClick?: (tag: string) => void
  enableInteractions?: boolean
  showCopyButton?: boolean
}

export function AdvancedTextRenderer({
  content,
  options = {},
  className,
  messageRole = 'assistant',
  onLinkClick,
  onMentionClick,
  onHashtagClick,
  enableInteractions = true,
  showCopyButton = false
}: AdvancedTextRendererProps) {
  const [copiedElement, setCopiedElement] = useState<string | null>(null)
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<number>>(new Set())

  // Processar texto usando o formatador avançado (apenas negrito)
  const formattedElements = useMemo(() => {
    try {
      return advancedTextFormatter.formatText(content || '', {
        allowMarkdown: true,
        allowEmojis: false,
        ...options
      })
    } catch (error) {
      console.error('Erro no formatador:', error)
      return [{
        type: 'text' as const,
        content: content || '',
        className: '',
        metadata: {}
      }]
    }
  }, [content, options])

  // Copiar texto para clipboard
  const copyToClipboard = useCallback(async (text: string, elementId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedElement(elementId)
      setTimeout(() => setCopiedElement(null), 2000)
    } catch (error) {
      console.error('Erro ao copiar:', error)
    }
  }, [])

  // Revelar/ocultar spoiler
  const toggleSpoiler = useCallback((index: number) => {
    setRevealedSpoilers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }, [])

  // Renderizar elemento individual
  const renderElement = useCallback((element: FormattedTextElement, index: number) => {
    const elementId = `element-${index}`
    const isRevealed = revealedSpoilers.has(index)

    // Estilos base do elemento
    const baseStyles = advancedTextFormatter.getElementStyles(element)
    const roleStyles = messageRole === 'user' 
      ? { color: 'white' } 
      : {}

    switch (element.type) {
      case 'codeblock':
        return (
          <div key={index} className="my-3">
            <InlineCodePanel
              title={`Código ${element.metadata?.language?.toUpperCase() || 'TEXT'}`}
              language={element.metadata?.language || 'text'}
              code={element.content}
            />
          </div>
        )

      case 'link':
        return (
          <span
            key={index}
            className={cn(
              "inline-flex items-center gap-1 cursor-pointer hover:underline transition-colors",
              messageRole === 'user' ? 'text-blue-200' : 'text-blue-600',
              element.className
            )}
            onClick={() => {
              if (enableInteractions && onLinkClick) {
                onLinkClick(element.metadata?.url || element.content)
              }
            }}
            style={{ ...baseStyles, ...roleStyles }}
          >
            {element.content}
            {enableInteractions && (
              <ExternalLink className="w-3 h-3 opacity-70" />
            )}
          </span>
        )

      case 'mention':
        return (
          <span
            key={index}
            className={cn(
              "cursor-pointer hover:bg-opacity-20 px-1 rounded transition-colors",
              messageRole === 'user' 
                ? 'text-blue-200 bg-blue-500 bg-opacity-20' 
                : 'text-blue-600 bg-blue-50',
              element.className
            )}
            onClick={() => {
              if (enableInteractions && onMentionClick) {
                onMentionClick(element.metadata?.username || element.content.slice(1))
              }
            }}
            style={{ ...baseStyles, ...roleStyles }}
          >
            {element.content}
          </span>
        )

      case 'hashtag':
        return (
          <span
            key={index}
            className={cn(
              "cursor-pointer hover:underline font-medium transition-colors",
              messageRole === 'user' ? 'text-blue-200' : 'text-blue-600',
              element.className
            )}
            onClick={() => {
              if (enableInteractions && onHashtagClick) {
                onHashtagClick(element.metadata?.tag || element.content.slice(1))
              }
            }}
            style={{ ...baseStyles, ...roleStyles }}
          >
            {element.content}
          </span>
        )

      case 'spoiler':
        return (
          <span
            key={index}
            className={cn(
              "relative cursor-pointer select-none transition-all duration-200",
              isRevealed 
                ? 'bg-transparent' 
                : messageRole === 'user'
                  ? 'bg-white text-white hover:bg-gray-200'
                  : 'bg-gray-800 text-gray-800 hover:bg-gray-600',
              element.className
            )}
            onClick={() => toggleSpoiler(index)}
            style={{ 
              ...baseStyles, 
              ...roleStyles,
              borderRadius: '4px',
              padding: '1px 4px'
            }}
          >
            {isRevealed ? (
              <>
                <Eye className="inline w-3 h-3 mr-1 opacity-60" />
                {element.content}
              </>
            ) : (
              <>
                <EyeOff className="inline w-3 h-3 mr-1 opacity-60" />
                Clique para revelar
              </>
            )}
          </span>
        )

      case 'code':
        return (
          <code
            key={index}
            className={cn(
              "relative inline-block font-mono text-sm px-1 py-0.5 rounded",
              messageRole === 'user' 
                ? 'bg-white bg-opacity-20 text-white' 
                : 'bg-gray-100 text-gray-800',
              element.className
            )}
            style={{ ...baseStyles, ...roleStyles }}
          >
            {element.content}
            {showCopyButton && enableInteractions && (
              <button
                className="ml-1 opacity-0 hover:opacity-100 transition-opacity"
                onClick={() => copyToClipboard(element.content, elementId)}
              >
                {copiedElement === elementId ? (
                  <span className="text-green-500 text-xs">✓</span>
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            )}
          </code>
        )

      case 'emoji':
        return (
          <span
            key={index}
            className={cn("inline-block", element.className)}
            style={{ 
              ...baseStyles, 
              fontSize: '1.1em',
              lineHeight: '1.2'
            }}
          >
            {element.content}
          </span>
        )

      case 'bold':
        return (
          <strong
            key={index}
            className={cn(
              "font-semibold",
              messageRole === 'user' ? 'text-white' : 'text-gray-900',
              element.className
            )}
            style={{ ...baseStyles, ...roleStyles }}
          >
            {element.content}
          </strong>
        )

      case 'italic':
        return (
          <em
            key={index}
            className={cn(
              "italic",
              messageRole === 'user' ? 'text-white' : 'text-gray-800',
              element.className
            )}
            style={{ ...baseStyles, ...roleStyles }}
          >
            {element.content}
          </em>
        )

      case 'underline':
        return (
          <span
            key={index}
            className={cn(
              "underline",
              messageRole === 'user' ? 'text-white' : 'text-gray-800',
              element.className
            )}
            style={{ ...baseStyles, ...roleStyles }}
          >
            {element.content}
          </span>
        )

      case 'strikethrough':
        return (
          <span
            key={index}
            className={cn(
              "line-through opacity-75",
              messageRole === 'user' ? 'text-white' : 'text-gray-600',
              element.className
            )}
            style={{ ...baseStyles, ...roleStyles }}
          >
            {element.content}
          </span>
        )

      case 'text':
      default:
        // Processar quebras de linha no texto simples
        const lines = element.content.split('\n')
        return (
          <span
            key={index}
            className={cn(
              "whitespace-pre-wrap break-words",
              messageRole === 'user' ? 'text-white' : 'text-gray-700',
              element.className
            )}
            style={{ ...baseStyles, ...roleStyles }}
          >
            {lines.map((line, lineIndex) => (
              <React.Fragment key={lineIndex}>
                {line}
                {lineIndex < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </span>
        )
    }
  }, [
    messageRole, 
    enableInteractions, 
    showCopyButton, 
    onLinkClick, 
    onMentionClick, 
    onHashtagClick, 
    revealedSpoilers, 
    copiedElement, 
    copyToClipboard, 
    toggleSpoiler
  ])

  return (
    <div className={cn("leading-relaxed", className)}>
      <AnimatePresence mode="wait">
        {formattedElements.map((element, index) => (
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.2, 
              delay: messageRole === 'assistant' ? index * 0.02 : 0 
            }}
          >
            {renderElement(element, index)}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Componente simplificado para casos básicos
export function SimpleTextRenderer({ 
  content, 
  className 
}: { 
  content: string
  className?: string 
}) {
  return (
    <AdvancedTextRenderer
      content={content}
      className={className}
      enableInteractions={false}
      showCopyButton={false}
      options={{ 
        allowEmojis: true, 
        allowMarkdown: true,
        platform: 'universal'
      }}
    />
  )
}

export default AdvancedTextRenderer 