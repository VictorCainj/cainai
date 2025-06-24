'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Upload, FileAudio, X, Play, Pause, RotateCcw, Check, AlertCircle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAudioUpload } from '@/hooks/useAudioUpload'
import { TranscriptionResult } from '@/types/audio'
import { AudioUtils } from '@/lib/audio-transcription-service'

interface AudioUploaderProps {
  onTranscriptionComplete?: (result: TranscriptionResult) => void
  onError?: (error: string) => void
  className?: string
  autoSubmitToChat?: boolean
  maxFiles?: number
  showResults?: boolean
}

export function AudioUploader({
  onTranscriptionComplete,
  onError,
  className = '',
  autoSubmitToChat = false,
  maxFiles = 3,
  showResults = true
}: AudioUploaderProps) {
  // Estados locais
  const [isDragOver, setIsDragOver] = useState(false)
  const [showUploadArea, setShowUploadArea] = useState(true)
  
  // Ref para input file
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Hook de upload
  const {
    uploads,
    isProcessing,
    currentStatus,
    globalError,
    uploadFiles,
    cancelUpload,
    clearUpload,
    retryUpload,
    clearAllUploads,
    getStats,
    getConfig
  } = useAudioUpload({
    onTranscriptionComplete: (result) => {
      onTranscriptionComplete?.(result)
      if (autoSubmitToChat) {
        setShowUploadArea(false)
      }
    },
    onError,
    maxConcurrentUploads: maxFiles
  })

  const config = getConfig()
  const stats = getStats()

  // Handlers para drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      uploadFiles(files)
    }
  }, [uploadFiles])

  // Handler para seleção de arquivos
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadFiles(files)
    }
    // Resetar input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [uploadFiles])

  // Abrir seletor de arquivos
  const openFileSelector = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Formatar tamanho de arquivo
  const formatFileSize = (bytes: number) => AudioUtils.formatFileSize(bytes)

  // Obter ícone de status
  const getStatusIcon = (upload: any) => {
    if (upload.isTranscribing) {
      return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
    }
    if (upload.error) {
      return <AlertCircle className="w-4 h-4 text-red-500" />
    }
    if (upload.result) {
      return <Check className="w-4 h-4 text-green-500" />
    }
    return <FileAudio className="w-4 h-4 text-gray-400" />
  }

  // Renderizar área de upload
  const renderUploadArea = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
        isDragOver
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
      } ${isProcessing ? 'pointer-events-none opacity-75' : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
            isDragOver
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
          }`}>
            {isProcessing ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {isProcessing ? 'Processando áudios...' : 'Envie seus arquivos de áudio'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Arraste e solte aqui ou clique para selecionar
          </p>
          
          <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
            <div>Formatos: {config.supportedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')}</div>
            <div>Tamanho máximo: {Math.round(config.maxSizeBytes / 1024 / 1024)}MB por arquivo</div>
            <div>Duração máxima: {config.maxDurationMinutes} minutos</div>
          </div>
        </div>

        <Button
          onClick={openFileSelector}
          disabled={isProcessing}
          className="w-full max-w-xs"
        >
          <FileAudio className="w-4 h-4 mr-2" />
          Selecionar Arquivos
        </Button>
      </div>

      {/* Input file escondido */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </motion.div>
  )

  // Renderizar lista de uploads
  const renderUploadsList = () => {
    if (uploads.size === 0) return null

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Uploads ({stats.completed}/{stats.total})
          </h4>
          
          {stats.total > 0 && (
            <Button
              onClick={clearAllUploads}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Limpar todos
            </Button>
          )}
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {Array.from(uploads.entries()).map(([uploadId, upload]) => (
            <Card key={uploadId} className="border">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getStatusIcon(upload)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        Arquivo de áudio
                      </p>
                      
                      <div className="flex space-x-1">
                        {upload.error && (
                          <Button
                            onClick={() => retryUpload(uploadId)}
                            variant="outline"
                            size="sm"
                            className="p-1 h-6 w-6"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => upload.isTranscribing ? cancelUpload(uploadId) : clearUpload(uploadId)}
                          variant="outline"
                          size="sm"
                          className="p-1 h-6 w-6"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {upload.isTranscribing && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                        <motion.div
                          className="bg-blue-500 h-2 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${upload.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}

                    {/* Status/Error */}
                    {upload.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                        {upload.error}
                      </p>
                    )}

                    {/* Resultado */}
                    {upload.result && showResults && (
                      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-green-700 dark:text-green-300">
                            Transcrição Concluída
                          </span>
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {(upload.result.duration / 60).toFixed(1)}min
                          </span>
                        </div>
                        
                        <div className="text-sm text-green-800 dark:text-green-200 mb-2">
                          <strong>Resumo:</strong> {upload.result.summary}
                        </div>
                        
                        <details className="text-xs">
                          <summary className="cursor-pointer text-green-700 dark:text-green-300 font-medium">
                            Ver transcrição completa
                          </summary>
                          <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border text-gray-700 dark:text-gray-300">
                            {upload.result.text}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Erro global */}
      <AnimatePresence>
        {globalError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4"
          >
            <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Erro</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {globalError}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Área de upload */}
      <AnimatePresence>
        {showUploadArea && renderUploadArea()}
      </AnimatePresence>

      {/* Lista de uploads */}
      {renderUploadsList()}

      {/* Status global */}
      {isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center space-x-2 text-sm text-blue-600 dark:text-blue-400"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Processando {stats.inProgress} arquivo(s)...</span>
        </motion.div>
      )}

      {/* Controles adicionais */}
      {!showUploadArea && stats.total === 0 && (
        <div className="text-center">
          <Button
            onClick={() => setShowUploadArea(true)}
            variant="outline"
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            Enviar mais áudios
          </Button>
        </div>
      )}
    </div>
  )
} 