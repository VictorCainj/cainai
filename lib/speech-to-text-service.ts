interface STTConfig {
  language: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  sensitivity: 'low' | 'medium' | 'high'
  noiseReduction: boolean
  autoStop: boolean
  autoStopTimeout: number
}

interface VoiceCommand {
  command: string
  phrases: string[]
  action: (params?: any) => void | Promise<void>
  description: string
  category: 'navigation' | 'message' | 'control' | 'system'
}

interface STTResult {
  transcript: string
  confidence: number
  isFinal: boolean
  alternatives?: string[]
  timestamp: number
}

interface STTEventCallbacks {
  onResult?: (result: STTResult) => void
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: string) => void
  onCommand?: (command: VoiceCommand, params?: any) => void
  onVoiceDetected?: () => void
  onSilence?: () => void
}

class SpeechToTextService {
  private recognition: any = null
  private isListening = false
  private isSupported = false
  private callbacks: STTEventCallbacks = {}
  
  private config: STTConfig = {
    language: 'pt-BR',
    continuous: true,
    interimResults: true,
    maxAlternatives: 3,
    sensitivity: 'medium',
    noiseReduction: true,
    autoStop: true,
    autoStopTimeout: 3000
  }

  private voiceCommands: VoiceCommand[] = []
  private silenceTimer: NodeJS.Timeout | null = null
  private isHandsFreeMode = false
  private lastActivity = Date.now()

  constructor() {
    this.initializeRecognition()
    this.setupDefaultCommands()
  }

  private initializeRecognition() {
    if (typeof window === 'undefined') return

    // Verificar suporte do navegador
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition não é suportado neste navegador')
      return
    }

    this.isSupported = true
    this.recognition = new SpeechRecognition()
    this.setupRecognition()
  }

  private setupRecognition() {
    if (!this.recognition) return

    // Configurar reconhecimento
    this.recognition.continuous = this.config.continuous
    this.recognition.interimResults = this.config.interimResults
    this.recognition.lang = this.config.language
    this.recognition.maxAlternatives = this.config.maxAlternatives

    // Event listeners
    this.recognition.onstart = () => {
      this.isListening = true
      this.lastActivity = Date.now()

      this.callbacks.onStart?.()
    }

    this.recognition.onend = () => {
      this.isListening = false

      this.callbacks.onEnd?.()
      
      // Reiniciar automaticamente em modo hands-free
      if (this.isHandsFreeMode) {
        setTimeout(() => this.startListening(), 1000)
      }
    }

    this.recognition.onerror = (event: any) => {
      console.error('❌ Erro no speech recognition:', event.error)
      this.callbacks.onError?.(event.error)
      
      // Tentar reconectar em caso de erro em modo hands-free
      if (this.isHandsFreeMode && event.error !== 'aborted') {
        setTimeout(() => this.startListening(), 2000)
      }
    }

    this.recognition.onresult = (event: any) => {
      this.lastActivity = Date.now()
      this.processResults(event)
    }

    // Detecção de áudio
    this.recognition.onspeechstart = () => {
      this.callbacks.onVoiceDetected?.()
      this.clearSilenceTimer()
    }

    this.recognition.onspeechend = () => {
      this.startSilenceTimer()
    }
  }

  private processResults(event: any) {
    const results = Array.from(event.results)
    
    for (let i = event.resultIndex; i < results.length; i++) {
      const result = results[i] as any
      const transcript = result[0].transcript.trim()
      const confidence = result[0].confidence || 0
      
      // Preparar alternatives
      const alternatives: string[] = []
      for (let j = 1; j < result.length; j++) {
        alternatives.push(result[j].transcript.trim())
      }

      const sttResult: STTResult = {
        transcript,
        confidence,
        isFinal: result.isFinal,
        alternatives,
        timestamp: Date.now()
      }

      // Callback do resultado
      this.callbacks.onResult?.(sttResult)

      // Processar comandos se o resultado for final
      if (result.isFinal) {
        this.processVoiceCommands(transcript, confidence)
      }
    }
  }

  private processVoiceCommands(transcript: string, confidence: number) {
    // Ignorar transcrições com baixa confiança
    if (confidence < 0.7) return

    const lowerTranscript = transcript.toLowerCase().trim()
    
    for (const command of this.voiceCommands) {
      for (const phrase of command.phrases) {
        if (this.matchesPhrase(lowerTranscript, phrase)) {
  
          
          // Extrair parâmetros se necessário
          const params = this.extractParameters(lowerTranscript, phrase)
          
          // Executar comando
          try {
            command.action(params)
            this.callbacks.onCommand?.(command, params)
          } catch (error) {
            console.error('Erro ao executar comando:', error)
          }
          
          return // Só executar o primeiro comando encontrado
        }
      }
    }
  }

  private matchesPhrase(transcript: string, phrase: string): boolean {
    const phraseWords = phrase.toLowerCase().split(' ')
    const transcriptWords = transcript.split(' ')
    
    // Busca flexível - permite palavras extras
    let phraseIndex = 0
    
    for (const word of transcriptWords) {
      if (phraseIndex < phraseWords.length && 
          this.wordsMatch(word, phraseWords[phraseIndex])) {
        phraseIndex++
      }
    }
    
    return phraseIndex === phraseWords.length
  }

  private wordsMatch(word1: string, word2: string): boolean {
    // Comparação flexível considerando variações
    const normalize = (w: string) => w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return normalize(word1) === normalize(word2)
  }

  private extractParameters(transcript: string, phrase: string): any {
    // Implementação básica para extrair parâmetros dos comandos
    const params: any = {}
    
    // Exemplo: "enviar mensagem [TEXTO]" -> extrair o texto
    if (phrase.includes('[TEXTO]')) {
      const beforeParam = phrase.split('[TEXTO]')[0].trim()
      const afterParam = phrase.split('[TEXTO]')[1]?.trim() || ''
      
      let text = transcript
      if (beforeParam) {
        text = text.replace(new RegExp(beforeParam, 'i'), '').trim()
      }
      if (afterParam) {
        text = text.replace(new RegExp(afterParam, 'i'), '').trim()
      }
      
      params.text = text
    }
    
    return params
  }

  private startSilenceTimer() {
    this.clearSilenceTimer()
    
    if (this.config.autoStop) {
      this.silenceTimer = setTimeout(() => {
        this.callbacks.onSilence?.()
        
        if (this.isListening && !this.isHandsFreeMode) {
          this.stopListening()
        }
      }, this.config.autoStopTimeout)
    }
  }

  private clearSilenceTimer() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
  }

  private setupDefaultCommands() {
    // Comandos de navegação
    this.addCommand({
      command: 'nova_conversa',
      phrases: ['nova conversa', 'criar conversa', 'começar conversa'],
      action: () => {
        const event = new CustomEvent('voiceCommand', {
          detail: { action: 'newConversation' }
        })
        window.dispatchEvent(event)
      },
      description: 'Iniciar uma nova conversa',
      category: 'navigation'
    })

    // Comandos de mensagem
    this.addCommand({
      command: 'enviar_mensagem',
      phrases: ['enviar [TEXTO]', 'mandar [TEXTO]', 'dizer [TEXTO]'],
      action: (params) => {
        if (params?.text) {
          const event = new CustomEvent('voiceCommand', {
            detail: { action: 'sendMessage', text: params.text }
          })
          window.dispatchEvent(event)
        }
      },
      description: 'Enviar uma mensagem',
      category: 'message'
    })

    // Comandos de controle
    this.addCommand({
      command: 'parar_gravacao',
      phrases: ['parar', 'pare', 'stop', 'parar gravação'],
      action: () => {
        this.stopListening()
      },
      description: 'Parar a gravação de voz',
      category: 'control'
    })

    this.addCommand({
      command: 'ativar_handsfree',
      phrases: ['modo hands-free', 'ativar hands-free', 'conversa contínua'],
      action: () => {
        this.enableHandsFreeMode()
      },
      description: 'Ativar modo hands-free',
      category: 'control'
    })

    this.addCommand({
      command: 'desativar_handsfree',
      phrases: ['desativar hands-free', 'sair do modo hands-free', 'parar conversa contínua'],
      action: () => {
        this.disableHandsFreeMode()
      },
      description: 'Desativar modo hands-free',
      category: 'control'
    })

    // Comandos do sistema
    this.addCommand({
      command: 'limpar_chat',
      phrases: ['limpar chat', 'apagar mensagens', 'limpar conversa'],
      action: () => {
        const event = new CustomEvent('voiceCommand', {
          detail: { action: 'clearChat' }
        })
        window.dispatchEvent(event)
      },
      description: 'Limpar o chat atual',
      category: 'system'
    })
  }

  // Métodos públicos
  isRecognitionSupported(): boolean {
    return this.isSupported
  }

  startListening(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject(new Error('Speech Recognition não é suportado'))
        return
      }

      if (this.isListening) {
        resolve()
        return
      }

      try {
        this.recognition.start()
        resolve()
      } catch (error) {
        reject(error)
      }
    })
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.clearSilenceTimer()
    }
  }

  enableHandsFreeMode(): void {
    this.isHandsFreeMode = true
    
    
    if (!this.isListening) {
      this.startListening()
    }
  }

  disableHandsFreeMode(): void {
    this.isHandsFreeMode = false
    
    
    if (this.isListening) {
      this.stopListening()
    }
  }

  setCallbacks(callbacks: STTEventCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  configure(newConfig: Partial<STTConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (this.recognition) {
      this.recognition.continuous = this.config.continuous
      this.recognition.interimResults = this.config.interimResults
      this.recognition.lang = this.config.language
      this.recognition.maxAlternatives = this.config.maxAlternatives
    }
  }

  addCommand(command: VoiceCommand): void {
    this.voiceCommands.push(command)
  }

  removeCommand(commandName: string): void {
    this.voiceCommands = this.voiceCommands.filter(cmd => cmd.command !== commandName)
  }

  getCommands(): VoiceCommand[] {
    return [...this.voiceCommands]
  }

  getStatus() {
    return {
      isSupported: this.isSupported,
      isListening: this.isListening,
      isHandsFreeMode: this.isHandsFreeMode,
      config: this.config,
      commandCount: this.voiceCommands.length,
      lastActivity: this.lastActivity
    }
  }
}

// Singleton
export const speechToTextService = new SpeechToTextService()

// Utilitários
export { type VoiceCommand, type STTResult, type STTConfig }