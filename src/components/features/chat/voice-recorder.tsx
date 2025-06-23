'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Mic, MicOff, Square, Play, Pause, Volume2, VolumeX, Bot, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { speechToTextService, type STTResult } from '@/lib/speech-to-text-service'
import { Button } from '@/components/ui/button'

interface VoiceRecorderProps {
  onTranscriptComplete?: (text: string) => void
  onTranscriptPartial?: (text: string) => void
  onVoiceCommand?: (command: string, params?: any) => void
  disabled?: boolean
  showTranscript?: boolean
  autoSend?: boolean
  className?: string
}

export function VoiceRecorder({
  onTranscriptComplete,
  onTranscriptPartial,
  onVoiceCommand,
  disabled = false,
  showTranscript = true,
  autoSend = false,
  className = ''
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isHandsFreeMode, setIsHandsFreeMode] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVoiceDetected, setIsVoiceDetected] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const finalTranscriptRef = useRef('')

  // Verificar suporte inicial
  useEffect(() => {
    setIsSupported(speechToTextService.isRecognitionSupported())
  }, [])

  // Configurar callbacks do serviço STT
  useEffect(() => {
    speechToTextService.setCallbacks({
      onResult: handleSTTResult,
      onStart: handleRecordingStart,
      onEnd: handleRecordingEnd,
      onError: handleSTTError,
      onCommand: handleVoiceCommand,
      onVoiceDetected: () => setIsVoiceDetected(true),
      onSilence: () => setIsVoiceDetected(false)
    })
  }, [])

  // Timer de duração da gravação
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setRecordingDuration(0)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRecording])

  const handleSTTResult = useCallback((result: STTResult) => {
    setConfidence(result.confidence)
    setError(null)

    if (result.isFinal) {
      // Resultado final
      finalTranscriptRef.current += ' ' + result.transcript
      const fullTranscript = finalTranscriptRef.current.trim()
      
      setFinalTranscript(fullTranscript)
      setCurrentTranscript('')
      
      onTranscriptComplete?.(fullTranscript)

      // Auto-send se habilitado
      if (autoSend && fullTranscript.length > 0) {
        onTranscriptComplete?.(fullTranscript)
        clearTranscripts()
      }
    } else {
      // Resultado parcial
      setCurrentTranscript(result.transcript)
      onTranscriptPartial?.(result.transcript)
    }
  }, [onTranscriptComplete, onTranscriptPartial, autoSend])

  const handleRecordingStart = useCallback(() => {
    setIsRecording(true)
    setError(null)
    setIsVoiceDetected(false)
  }, [])

  const handleRecordingEnd = useCallback(() => {
    setIsRecording(false)
    setIsVoiceDetected(false)
  }, [])

  const handleSTTError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    setIsRecording(false)
    setIsVoiceDetected(false)
  }, [])

  const handleVoiceCommand = useCallback((command: any, params?: any) => {
    onVoiceCommand?.(command.command, params)
  }, [onVoiceCommand])

  const startRecording = async () => {
    if (disabled || !isSupported) return

    try {
      clearTranscripts()
      await speechToTextService.startListening()
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error)
      setError('Erro ao iniciar gravação')
    }
  }

  const stopRecording = () => {
    speechToTextService.stopListening()
  }

  const toggleHandsFreeMode = () => {
    if (isHandsFreeMode) {
      speechToTextService.disableHandsFreeMode()
      setIsHandsFreeMode(false)
    } else {
      speechToTextService.enableHandsFreeMode()
      setIsHandsFreeMode(true)
    }
  }

  const clearTranscripts = () => {
    setCurrentTranscript('')
    setFinalTranscript('')
    finalTranscriptRef.current = ''
    setConfidence(0)
  }

  const sendCurrentTranscript = () => {
    const fullText = (finalTranscript + ' ' + currentTranscript).trim()
    if (fullText) {
      onTranscriptComplete?.(fullText)
      clearTranscripts()
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!isSupported) {
    return (
      <div className={`flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="text-center">
          <MicOff className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Reconhecimento de voz não suportado neste navegador
          </p>
        </div>
      </div>
    )
  }

  const displayTranscript = (finalTranscript + ' ' + currentTranscript).trim()

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controles principais */}
      <div className="flex items-center space-x-3">
        {/* Botão de gravação principal */}
        <div className="relative">
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled}
            className={`relative w-12 h-12 rounded-full p-0 transition-all duration-300 ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.div
                  key="recording"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center justify-center"
                >
                  <Square className="w-5 h-5 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex items-center justify-center"
                >
                  <Mic className="w-6 h-6 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          {/* Indicador de voz detectada */}
          <AnimatePresence>
            {isVoiceDetected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"
              />
            )}
          </AnimatePresence>

          {/* Indicador de gravação */}
          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Modo hands-free */}
        <Button
          onClick={toggleHandsFreeMode}
          variant={isHandsFreeMode ? "default" : "outline"}
          size="sm"
          className={`transition-all duration-300 ${
            isHandsFreeMode 
              ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/30' 
              : 'border-gray-300 text-gray-600 hover:border-purple-400 hover:text-purple-600'
          }`}
        >
          <Bot className="w-4 h-4 mr-2" />
          {isHandsFreeMode ? 'Hands-free ON' : 'Hands-free'}
          {isHandsFreeMode && <Zap className="w-3 h-3 ml-1 animate-pulse" />}
        </Button>

        {/* Enviar transcrição atual */}
        {displayTranscript && (
          <Button
            onClick={sendCurrentTranscript}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="w-4 h-4 mr-2" />
            Enviar
          </Button>
        )}

        {/* Limpar */}
        {displayTranscript && (
          <Button
            onClick={clearTranscripts}
            variant="outline"
            size="sm"
            className="border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600"
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Status da gravação */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center space-x-4 text-sm"
          >
            <div className="flex items-center space-x-2 text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="font-medium">Gravando</span>
            </div>
            
            <div className="text-gray-600 dark:text-gray-400">
              {formatDuration(recordingDuration)}
            </div>

            {confidence > 0 && (
              <div className="text-gray-600 dark:text-gray-400">
                Confiança: {Math.round(confidence * 100)}%
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modo hands-free ativo */}
      <AnimatePresence>
        {isHandsFreeMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-3"
          >
            <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-300">
              <Bot className="w-4 h-4" />
              <span className="text-sm font-medium">Modo Hands-free Ativo</span>
              <Zap className="w-3 h-3 animate-pulse" />
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Fale naturalmente. Diga "desativar hands-free" para sair.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcrição */}
      <AnimatePresence>
        {showTranscript && displayTranscript && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Transcrição
              </h4>
              {confidence > 0 && (
                <div className={`text-xs px-2 py-1 rounded-full ${
                  confidence > 0.8 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : confidence > 0.6 
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {Math.round(confidence * 100)}% confiança
                </div>
              )}
            </div>
            
            <div className="text-gray-800 dark:text-gray-200">
              {/* Texto final */}
              {finalTranscript && (
                <span className="font-medium">{finalTranscript}</span>
              )}
              
              {/* Texto parcial */}
              {currentTranscript && (
                <span className="text-gray-500 dark:text-gray-400 italic">
                  {finalTranscript ? ' ' : ''}{currentTranscript}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Erro */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3"
          >
            <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
              <MicOff className="w-4 h-4" />
              <span className="text-sm font-medium">Erro na gravação</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comandos de voz disponíveis */}
      {isHandsFreeMode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3"
        >
          <h5 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
            Comandos de voz disponíveis:
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-600 dark:text-blue-400">
            <div>"enviar [mensagem]" - Enviar mensagem</div>
            <div>"nova conversa" - Iniciar conversa</div>
            <div>"parar" - Parar gravação</div>
            <div>"limpar chat" - Limpar conversa</div>
          </div>
        </motion.div>
      )}
    </div>
  )
}