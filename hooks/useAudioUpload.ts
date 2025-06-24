import { useState, useCallback, useRef } from 'react'
import { AudioFile, AudioUploadState, AudioUploadStatus, TranscriptionResult } from '@/types/audio'
import { audioTranscriptionService, AudioUtils } from '@/lib/audio-transcription-service'

interface UseAudioUploadOptions {
  onTranscriptionComplete?: (result: TranscriptionResult) => void
  onError?: (error: string) => void
  autoSubmitToChat?: boolean
  maxConcurrentUploads?: number
}

export function useAudioUpload(options: UseAudioUploadOptions = {}) {
  const {
    onTranscriptionComplete,
    onError,
    autoSubmitToChat = false,
    maxConcurrentUploads = 3
  } = options

  // Estados principais
  const [uploads, setUploads] = useState<Map<string, AudioUploadState>>(new Map())
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<AudioUploadStatus>('idle')
  const [globalError, setGlobalError] = useState<string | null>(null)

  // Ref para controlar uploads ativos
  const activeUploadsRef = useRef<Map<string, AbortController>>(new Map())

  // Validar e preparar arquivos
  const validateFiles = useCallback((files: FileList | File[]): {
    validFiles: AudioFile[]
    errors: string[]
  } => {
    const validFiles: AudioFile[] = []
    const errors: string[] = []

    Array.from(files).forEach(file => {
      // Verificar se é áudio
      if (!AudioUtils.isAudioFile(file)) {
        errors.push(`${file.name}: Não é um arquivo de áudio`)
        return
      }

      // Validar com o service
      const validation = audioTranscriptionService.validateAudioFile(file)
      if (!validation.isValid) {
        errors.push(`${file.name}: ${validation.error}`)
        return
      }

      // Criar AudioFile
      const audioFile = audioTranscriptionService.createAudioFile(file)
      validFiles.push(audioFile)
    })

    return { validFiles, errors }
  }, [])

  // Iniciar upload único
  const uploadSingleFile = useCallback(async (audioFile: AudioFile): Promise<TranscriptionResult | null> => {
    const uploadId = audioFile.id

    try {
      // Criar AbortController para este upload
      const abortController = new AbortController()
      activeUploadsRef.current.set(uploadId, abortController)

      // Atualizar estado inicial
      setUploads(prev => new Map(prev.set(uploadId, {
        isUploading: false,
        isTranscribing: true,
        progress: 0,
        error: null,
        result: null
      })))

      // Verificar duração do áudio (opcional)
      let duration: number | undefined
      try {
        duration = await audioTranscriptionService.getAudioDuration(audioFile.file)
        audioFile.duration = duration
      } catch (durationError) {
        console.warn('Não foi possível obter duração do áudio:', durationError)
      }

      // Simular progresso durante upload/processamento
      const progressInterval = setInterval(() => {
        setUploads(prev => {
          const current = prev.get(uploadId)
          if (current && current.progress < 90) {
            const newState = { ...current, progress: current.progress + 10 }
            return new Map(prev.set(uploadId, newState))
          }
          return prev
        })
      }, 500)

      // Transcrever áudio
      const result = await audioTranscriptionService.transcribeAudio(audioFile)

      // Limpar intervalo
      clearInterval(progressInterval)

      // Atualizar estado final de sucesso
      setUploads(prev => new Map(prev.set(uploadId, {
        isUploading: false,
        isTranscribing: false,
        progress: 100,
        error: null,
        result
      })))

      // Callback de sucesso
      onTranscriptionComplete?.(result)

      // Limpar AbortController
      activeUploadsRef.current.delete(uploadId)

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      
      // Atualizar estado de erro
      setUploads(prev => new Map(prev.set(uploadId, {
        isUploading: false,
        isTranscribing: false,
        progress: 0,
        error: errorMessage,
        result: null
      })))

      // Callback de erro
      onError?.(errorMessage)

      // Limpar AbortController
      activeUploadsRef.current.delete(uploadId)

      return null
    }
  }, [onTranscriptionComplete, onError])

  // Upload múltiplos arquivos
  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    setGlobalError(null)
    setIsProcessing(true)
    setCurrentStatus('validating')

    try {
      // Validar arquivos
      const { validFiles, errors } = validateFiles(files)

      if (errors.length > 0) {
        setGlobalError(`Erros de validação: ${errors.join(', ')}`)
        setIsProcessing(false)
        setCurrentStatus('error')
        return
      }

      if (validFiles.length === 0) {
        setGlobalError('Nenhum arquivo válido encontrado')
        setIsProcessing(false)
        setCurrentStatus('error')
        return
      }

      // Verificar limite de uploads simultâneos
      if (validFiles.length > maxConcurrentUploads) {
        setGlobalError(`Máximo ${maxConcurrentUploads} arquivos por vez`)
        setIsProcessing(false)
        setCurrentStatus('error')
        return
      }

      setCurrentStatus('uploading')

      // Processar arquivos em paralelo (com limite)
      const results = await Promise.allSettled(
        validFiles.map(file => uploadSingleFile(file))
      )

      // Analisar resultados
      const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null)
      const failed = results.filter(r => r.status === 'rejected' || r.value === null)

      if (failed.length > 0) {
        console.warn(`${failed.length} uploads falharam`)
      }

      setCurrentStatus(successful.length > 0 ? 'completed' : 'error')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro no upload'
      setGlobalError(errorMessage)
      setCurrentStatus('error')
      onError?.(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [validateFiles, uploadSingleFile, maxConcurrentUploads, onError])

  // Upload arquivo único (wrapper)
  const uploadSingleFileWrapper = useCallback(async (file: File) => {
    const { validFiles, errors } = validateFiles([file])
    
    if (errors.length > 0) {
      setGlobalError(errors[0])
      onError?.(errors[0])
      return null
    }

    if (validFiles.length === 0) {
      setGlobalError('Arquivo inválido')
      onError?.('Arquivo inválido')
      return null
    }

    return await uploadSingleFile(validFiles[0])
  }, [validateFiles, uploadSingleFile, onError])

  // Cancelar upload específico
  const cancelUpload = useCallback((uploadId: string) => {
    const abortController = activeUploadsRef.current.get(uploadId)
    if (abortController) {
      abortController.abort()
      activeUploadsRef.current.delete(uploadId)
    }

    // Remover do estado
    setUploads(prev => {
      const newMap = new Map(prev)
      newMap.delete(uploadId)
      return newMap
    })
  }, [])

  // Cancelar todos os uploads
  const cancelAllUploads = useCallback(() => {
    activeUploadsRef.current.forEach(controller => controller.abort())
    activeUploadsRef.current.clear()
    setUploads(new Map())
    setIsProcessing(false)
    setCurrentStatus('idle')
    setGlobalError(null)
  }, [])

  // Limpar upload específico do estado
  const clearUpload = useCallback((uploadId: string) => {
    setUploads(prev => {
      const newMap = new Map(prev)
      newMap.delete(uploadId)
      return newMap
    })
  }, [])

  // Limpar todos os uploads do estado
  const clearAllUploads = useCallback(() => {
    setUploads(new Map())
    setGlobalError(null)
    setCurrentStatus('idle')
  }, [])

  // Retry upload
  const retryUpload = useCallback(async (uploadId: string) => {
    const upload = uploads.get(uploadId)
    if (!upload || !upload.error) return

    // Encontrar o arquivo original (isso seria melhor com um estado mais complexo)
    // Por agora, vamos apenas limpar o erro e permitir novo upload
    clearUpload(uploadId)
  }, [uploads, clearUpload])

  // Obter estatísticas
  const getStats = useCallback(() => {
    const uploadsArray = Array.from(uploads.values())
    return {
      total: uploadsArray.length,
      completed: uploadsArray.filter(u => u.result !== null).length,
      failed: uploadsArray.filter(u => u.error !== null).length,
      inProgress: uploadsArray.filter(u => u.isTranscribing || u.isUploading).length,
      cacheSize: audioTranscriptionService.getCacheSize()
    }
  }, [uploads])

  // Obter configuração do service
  const getConfig = useCallback(() => {
    return audioTranscriptionService.getConfig()
  }, [])

  return {
    // Estados
    uploads,
    isProcessing,
    currentStatus,
    globalError,
    
    // Ações principais
    uploadFiles,
    uploadSingleFile: uploadSingleFileWrapper,
    
    // Controle
    cancelUpload,
    cancelAllUploads,
    clearUpload,
    clearAllUploads,
    retryUpload,
    
    // Utilitários
    validateFiles,
    getStats,
    getConfig,
    
    // Helpers
    AudioUtils
  }
} 