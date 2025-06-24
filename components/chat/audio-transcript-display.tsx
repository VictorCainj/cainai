'use client'

import React, { useState, useRef } from 'react'
import { Play, Pause, Volume2, FileAudio, Copy, Check, RotateCcw, Clock, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { TranscriptionResult } from '@/types/audio'
import { audioTranscriptionService } from '@/lib/audio-transcription-service'

interface AudioTranscriptDisplayProps {
  result: TranscriptionResult
  showFullTranscript?: boolean
  allowCopy?: boolean
  allowRegenerate?: boolean
  onRegenerate?: () => void
  className?: string
}

export function AudioTranscriptDisplay({
  result,
  showFullTranscript = false,
  allowCopy = true,
  allowRegenerate = false,
  onRegenerate,
  className = ''
}: AudioTranscriptDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(showFullTranscript)
  const [copiedText, setCopiedText] = useState<'summary' | 'full' | null>(null)
  
  const { shortSummary, fullText, formattedDuration } = audioTranscriptionService.formatTranscriptionForDisplay(result)

  // Copiar texto para clipboard
  const copyToClipboard = async (text: string, type: 'summary' | 'full') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(type)
      setTimeout(() => setCopiedText(null), 2000)
    } catch (error) {
      console.error('Erro ao copiar:', error)
    }
  }

  // Formatear confiança como porcentagem
  const confidencePercentage = Math.round(result.confidence * 100)
  const confidenceColor = confidencePercentage > 80 
    ? 'text-green-600 dark:text-green-400'
    : confidencePercentage > 60 
    ? 'text-yellow-600 dark:text-yellow-400'
    : 'text-red-600 dark:text-red-400'

  return (
    <Card className={`border shadow-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FileAudio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Transcrição de Áudio
              </h3>
              <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formattedDuration}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Zap className="w-3 h-3" />
                  <span className={confidenceColor}>{confidencePercentage}% confiança</span>
                </div>
                {result.language && (
                  <span className="uppercase font-mono">{result.language}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            {allowRegenerate && (
              <Button
                onClick={onRegenerate}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reprocessar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Resumo */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Resumo
              </h4>
              {allowCopy && (
                <Button
                  onClick={() => copyToClipboard(result.summary, 'summary')}
                  variant="ghost"
                  size="sm"
                  className="text-xs p-1 h-6"
                >
                  {copiedText === 'summary' ? (
                    <Check className="w-3 h-3 text-green-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              )}
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
              <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
                {isExpanded ? result.summary : shortSummary}
              </p>
            </div>
          </div>

          {/* Transcrição completa (expandível) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Transcrição Completa
              </h4>
              <div className="flex space-x-2">
                {allowCopy && (
                  <Button
                    onClick={() => copyToClipboard(fullText, 'full')}
                    variant="ghost"
                    size="sm"
                    className="text-xs p-1 h-6"
                  >
                    {copiedText === 'full' ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </Button>
                )}
                
                <Button
                  onClick={() => setIsExpanded(!isExpanded)}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  {isExpanded ? 'Recolher' : 'Expandir'}
                </Button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {isExpanded ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-64 overflow-y-auto"
                >
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {fullText}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                >
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                    {fullText.length > 200 ? fullText.substring(0, 200) + '...' : fullText}
                  </p>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                    Clique em "Expandir" para ver o texto completo ({fullText.length} caracteres)
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Segments com timestamps (se disponível) */}
          {result.segments && result.segments.length > 0 && isExpanded && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Segmentos com Timestamps
              </h4>
              
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-48 overflow-y-auto">
                <div className="space-y-2">
                  {result.segments.slice(0, 10).map((segment, index) => (
                    <div key={index} className="text-xs">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-blue-600 dark:text-blue-400 font-mono">
                          {Math.floor(segment.start / 60).toString().padStart(2, '0')}:
                          {Math.floor(segment.start % 60).toString().padStart(2, '0')}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-blue-600 dark:text-blue-400 font-mono">
                          {Math.floor(segment.end / 60).toString().padStart(2, '0')}:
                          {Math.floor(segment.end % 60).toString().padStart(2, '0')}
                        </span>
                        <span className={`text-xs px-1 py-0.5 rounded ${
                          segment.confidence > 0.8 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : segment.confidence > 0.6
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {Math.round(segment.confidence * 100)}%
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 ml-4">
                        {segment.text}
                      </p>
                    </div>
                  ))}
                  
                  {result.segments.length > 10 && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 text-center pt-2 border-t border-gray-200 dark:border-gray-600">
                      Mostrando 10 de {result.segments.length} segmentos
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Metadados */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
              <div>
                <span className="font-medium">Processado em:</span><br />
                {result.timestamp.toLocaleString('pt-BR')}
              </div>
              <div>
                <span className="font-medium">ID:</span><br />
                <span className="font-mono text-xs">{result.id.split('_').pop()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Componente simplificado para uso inline
export function AudioTranscriptInline({
  result,
  maxLength = 100,
  className = ''
}: {
  result: TranscriptionResult
  maxLength?: number
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(result.summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Erro ao copiar:', error)
    }
  }

  const truncatedSummary = result.summary.length > maxLength 
    ? result.summary.substring(0, maxLength) + '...'
    : result.summary

  return (
    <div className={`inline-flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 ${className}`}>
      <FileAudio className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
      <span className="text-sm text-blue-900 dark:text-blue-100 flex-1">
        {truncatedSummary}
      </span>
      <Button
        onClick={copyToClipboard}
        variant="ghost"
        size="sm"
        className="p-1 h-6 w-6 flex-shrink-0"
      >
        {copied ? (
          <Check className="w-3 h-3 text-green-500" />
        ) : (
          <Copy className="w-3 h-3 text-blue-600 dark:text-blue-400" />
        )}
      </Button>
    </div>
  )
} 