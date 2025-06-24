import { AudioFile, AudioUploadConfig, TranscriptionResult } from '@/types/audio'

class AudioTranscriptionService {
  private config: AudioUploadConfig = {
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
    maxDurationMinutes: 30,
    supportedFormats: [
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'audio/m4a',
      'audio/ogg',
      'audio/flac',
      'audio/webm'
    ],
    autoSummarize: true,
    language: 'pt'
  }

  private cache = new Map<string, TranscriptionResult>()

  constructor() {
    this.loadCacheFromStorage()
  }

  // Validar arquivo de áudio
  validateAudioFile(file: File): { isValid: boolean; error?: string } {
    // Verificar tipo
    if (!this.config.supportedFormats.includes(file.type)) {
      return {
        isValid: false,
        error: `Formato não suportado. Use: ${this.getSupportedFormatsText()}`
      }
    }

    // Verificar tamanho
    if (file.size > this.config.maxSizeBytes) {
      const maxSizeMB = this.config.maxSizeBytes / (1024 * 1024)
      return {
        isValid: false,
        error: `Arquivo muito grande. Máximo: ${maxSizeMB}MB`
      }
    }

    return { isValid: true }
  }

  // Criar objeto AudioFile
  createAudioFile(file: File): AudioFile {
    return {
      file,
      id: this.generateId(),
      name: file.name,
      size: file.size,
      type: file.type
    }
  }

  // Obter duração do áudio
  async getAudioDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = document.createElement('audio')
      const url = URL.createObjectURL(file)
      
      audio.onloadedmetadata = () => {
        const duration = audio.duration
        URL.revokeObjectURL(url)
        
        if (duration > this.config.maxDurationMinutes * 60) {
          reject(new Error(`Áudio muito longo. Máximo: ${this.config.maxDurationMinutes} minutos`))
        } else {
          resolve(duration)
        }
      }
      
      audio.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Erro ao ler arquivo de áudio'))
      }
      
      audio.src = url
    })
  }

  // Transcrever áudio via API
  async transcribeAudio(audioFile: AudioFile): Promise<TranscriptionResult> {
    // Verificar cache primeiro
    const cacheKey = this.getCacheKey(audioFile)
    const cached = this.cache.get(cacheKey)
    if (cached) {
      console.log('🎯 Usando transcrição do cache:', audioFile.name)
      return cached
    }

    // Preparar FormData
    const formData = new FormData()
    formData.append('audio', audioFile.file)
    formData.append('language', this.config.language || 'pt')
    formData.append('autoSummarize', this.config.autoSummarize.toString())

    // Fazer requisição para API
    const response = await fetch('/api/audio/transcribe', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
      throw new Error(error.error || `Erro na transcrição: ${response.status}`)
    }

    const result: TranscriptionResult = await response.json()
    
    // Salvar no cache
    this.cache.set(cacheKey, result)
    this.saveCacheToStorage()

    return result
  }

  // Formatação de texto para exibição
  formatTranscriptionForDisplay(result: TranscriptionResult): {
    shortSummary: string
    fullText: string
    formattedDuration: string
  } {
    const shortSummary = result.summary.length > 150 
      ? result.summary.substring(0, 150) + '...'
      : result.summary

    const formattedDuration = this.formatDuration(result.duration)

    return {
      shortSummary,
      fullText: result.text,
      formattedDuration
    }
  }

  // Utilitários
  private generateId(): string {
    return `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getCacheKey(audioFile: AudioFile): string {
    // Usar nome + tamanho + tipo como chave única
    return `${audioFile.name}_${audioFile.size}_${audioFile.type}`
  }

  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  private getSupportedFormatsText(): string {
    const formats = this.config.supportedFormats
      .map(f => f.split('/')[1].toUpperCase())
      .join(', ')
    return formats
  }

  // Cache management
  private loadCacheFromStorage(): void {
    try {
      const cached = localStorage.getItem('audio_transcription_cache')
      if (cached) {
        const data = JSON.parse(cached)
        Object.entries(data).forEach(([key, value]) => {
          this.cache.set(key, value as TranscriptionResult)
        })
      }
    } catch (error) {
      console.warn('Erro ao carregar cache de transcrições:', error)
    }
  }

  private saveCacheToStorage(): void {
    try {
      const data = Object.fromEntries(this.cache.entries())
      localStorage.setItem('audio_transcription_cache', JSON.stringify(data))
    } catch (error) {
      console.warn('Erro ao salvar cache de transcrições:', error)
    }
  }

  // Configuração
  getConfig(): AudioUploadConfig {
    return { ...this.config }
  }

  updateConfig(newConfig: Partial<AudioUploadConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // Limpeza
  clearCache(): void {
    this.cache.clear()
    localStorage.removeItem('audio_transcription_cache')
  }

  getCacheSize(): number {
    return this.cache.size
  }
}

// Singleton
export const audioTranscriptionService = new AudioTranscriptionService()

// Utilitários exportados
export const AudioUtils = {
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  isAudioFile: (file: File): boolean => {
    return file.type.startsWith('audio/')
  },

  getFileExtension: (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }
} 