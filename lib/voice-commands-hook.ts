import { useEffect, useCallback, useState, useRef } from 'react'
import { speechToTextService, type VoiceCommand } from '@/lib/speech-to-text-service'
import { useTTSSettings } from '@/components/chat/tts-voice-selector'

interface VoiceControlActions {
  onSendMessage?: (text: string) => void
  onNewConversation?: () => void
  onClearChat?: () => void
  onToggleRecording?: () => void
  onNavigateToPage?: (page: string) => void
  onSelectConversation?: (id: string) => void
  onAdjustSettings?: (setting: string, value: any) => void
}

interface VoiceControlConfig {
  enableHandsFree?: boolean
  autoPlayResponses?: boolean
  language?: string
  sensitivity?: 'low' | 'medium' | 'high'
  noiseReduction?: boolean
  customCommands?: VoiceCommand[]
}

export function useVoiceCommands(actions: VoiceControlActions, config: VoiceControlConfig = {}) {
  const [isListening, setIsListening] = useState(false)
  const [isHandsFreeMode, setIsHandsFreeMode] = useState(config.enableHandsFree || false)
  const [lastCommand, setLastCommand] = useState<string | null>(null)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [isVoiceControlEnabled, setIsVoiceControlEnabled] = useState(true)
  
  const ttsSettings = useTTSSettings()
  const actionsRef = useRef(actions)
  const pendingResponseRef = useRef<string | null>(null)

  // Atualizar referência das actions
  useEffect(() => {
    actionsRef.current = actions
  }, [actions])

  // Configurar serviço STT
  useEffect(() => {
    if (config.language) {
      speechToTextService.configure({ language: config.language })
    }
    if (config.sensitivity) {
      speechToTextService.configure({ sensitivity: config.sensitivity })
    }
    if (config.noiseReduction !== undefined) {
      speechToTextService.configure({ noiseReduction: config.noiseReduction })
    }
  }, [config])

  // Adicionar comandos customizados
  useEffect(() => {
    if (config.customCommands) {
      config.customCommands.forEach(command => {
        speechToTextService.addCommand(command)
      })
    }

    return () => {
      // Cleanup: remover comandos customizados
      if (config.customCommands) {
        config.customCommands.forEach(command => {
          speechToTextService.removeCommand(command.command)
        })
      }
    }
  }, [config.customCommands])

  // Comandos específicos para interface de chat
  useEffect(() => {
    if (!isVoiceControlEnabled) return

    // Comando para responder a última mensagem da IA
    speechToTextService.addCommand({
      command: 'responder',
      phrases: ['responder [TEXTO]', 'resposta [TEXTO]', 'reply [TEXTO]'],
      action: (params) => {
        if (params?.text && actionsRef.current.onSendMessage) {
          actionsRef.current.onSendMessage(params.text)
          recordCommand('responder')
        }
      },
      description: 'Responder com texto específico',
      category: 'message'
    })

    // Comando para repetir última resposta
    speechToTextService.addCommand({
      command: 'repetir_resposta',
      phrases: ['repetir', 'repita', 'repeat', 'falar novamente'],
      action: () => {
        if (pendingResponseRef.current) {
          playTextToSpeech(pendingResponseRef.current)
          recordCommand('repetir_resposta')
        }
      },
      description: 'Repetir última resposta da IA',
      category: 'control'
    })

    // Comando para ajustar velocidade de voz
    speechToTextService.addCommand({
      command: 'velocidade_voz',
      phrases: ['velocidade normal', 'falar mais rápido', 'falar mais devagar', 'velocidade lenta', 'velocidade rápida'],
      action: (params) => {
        // Lógica para ajustar velocidade baseada no comando
        recordCommand('velocidade_voz')
      },
      description: 'Ajustar velocidade da voz',
      category: 'control'
    })

    // Comando para mudar voz
    speechToTextService.addCommand({
      command: 'mudar_voz',
      phrases: ['mudar voz', 'voz feminina', 'voz masculina', 'voz nova', 'change voice'],
      action: () => {
        if (actionsRef.current.onAdjustSettings) {
          // Ciclar entre vozes disponíveis
          const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
          const currentIndex = voices.indexOf(ttsSettings.voice || 'nova')
          const nextIndex = (currentIndex + 1) % voices.length
          actionsRef.current.onAdjustSettings('voice', voices[nextIndex])
          recordCommand('mudar_voz')
        }
      },
      description: 'Alternar entre vozes disponíveis',
      category: 'control'
    })

    // Comando para ativar/desativar modo silencioso
    speechToTextService.addCommand({
      command: 'modo_silencioso',
      phrases: ['modo silencioso', 'silenciar', 'sem áudio', 'quiet mode'],
      action: () => {
        if (actionsRef.current.onAdjustSettings) {
          actionsRef.current.onAdjustSettings('muted', true)
          recordCommand('modo_silencioso')
        }
      },
      description: 'Ativar modo silencioso',
      category: 'control'
    })

    speechToTextService.addCommand({
      command: 'ativar_audio',
      phrases: ['ativar áudio', 'com áudio', 'unmute', 'áudio ligado'],
      action: () => {
        if (actionsRef.current.onAdjustSettings) {
          actionsRef.current.onAdjustSettings('muted', false)
          recordCommand('ativar_audio')
        }
      },
      description: 'Reativar áudio',
      category: 'control'
    })

    // Comando para ajuda
    speechToTextService.addCommand({
      command: 'ajuda_comandos',
      phrases: ['ajuda', 'comandos disponíveis', 'help', 'o que posso falar'],
      action: () => {
        const commands = speechToTextService.getCommands()
        const helpText = `Comandos disponíveis: ${commands.map(cmd => cmd.description).join(', ')}`
        
        if (config.autoPlayResponses) {
          playTextToSpeech(helpText)
        }
        
        recordCommand('ajuda_comandos')
      },
      description: 'Mostrar comandos disponíveis',
      category: 'system'
    })

    return () => {
      // Cleanup dos comandos específicos
      const commandsToRemove = [
        'responder', 'repetir_resposta', 'velocidade_voz', 'mudar_voz',
        'modo_silencioso', 'ativar_audio', 'ajuda_comandos'
      ]
      commandsToRemove.forEach(cmd => speechToTextService.removeCommand(cmd))
    }
  }, [isVoiceControlEnabled, config.autoPlayResponses, ttsSettings.voice])

  // Configurar callbacks do serviço
  useEffect(() => {
    speechToTextService.setCallbacks({
      onStart: () => setIsListening(true),
      onEnd: () => setIsListening(false),
      onCommand: (command, params) => {
  
        setLastCommand(command.command)
      },
      onError: (error) => {
        console.error('❌ Erro no reconhecimento de voz:', error)
        setIsListening(false)
      }
    })
  }, [])

  // Listener para comandos via custom events
  useEffect(() => {
    const handleVoiceCommand = (event: CustomEvent) => {
      const { action, text, page, conversationId, setting, value } = event.detail

      switch (action) {
        case 'sendMessage':
          if (text && actionsRef.current.onSendMessage) {
            actionsRef.current.onSendMessage(text)
            recordCommand('sendMessage')
          }
          break

        case 'newConversation':
          if (actionsRef.current.onNewConversation) {
            actionsRef.current.onNewConversation()
            recordCommand('newConversation')
          }
          break

        case 'clearChat':
          if (actionsRef.current.onClearChat) {
            actionsRef.current.onClearChat()
            recordCommand('clearChat')
          }
          break

        case 'toggleRecording':
          if (actionsRef.current.onToggleRecording) {
            actionsRef.current.onToggleRecording()
            recordCommand('toggleRecording')
          }
          break

        case 'navigateToPage':
          if (page && actionsRef.current.onNavigateToPage) {
            actionsRef.current.onNavigateToPage(page)
            recordCommand('navigateToPage')
          }
          break

        case 'selectConversation':
          if (conversationId && actionsRef.current.onSelectConversation) {
            actionsRef.current.onSelectConversation(conversationId)
            recordCommand('selectConversation')
          }
          break

        case 'adjustSettings':
          if (setting && actionsRef.current.onAdjustSettings) {
            actionsRef.current.onAdjustSettings(setting, value)
            recordCommand('adjustSettings')
          }
          break
      }
    }

    window.addEventListener('voiceCommand', handleVoiceCommand as EventListener)
    return () => window.removeEventListener('voiceCommand', handleVoiceCommand as EventListener)
  }, [])

  const recordCommand = useCallback((command: string) => {
    setCommandHistory(prev => [command, ...prev.slice(0, 9)]) // Manter últimos 10
  }, [])

  const playTextToSpeech = useCallback(async (text: string) => {
    if (!config.autoPlayResponses || ttsSettings.muted) return

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: ttsSettings.voice || 'nova',
          speed: ttsSettings.speed || 1.1,
          model: 'tts-1-hd'
        }),
      })

      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        
        audio.onended = () => URL.revokeObjectURL(audioUrl)
        await audio.play()
      }
    } catch (error) {
      console.error('Erro no TTS:', error)
    }
  }, [config.autoPlayResponses, ttsSettings])

  const startListening = useCallback(async () => {
    if (!isVoiceControlEnabled) return
    
    try {
      await speechToTextService.startListening()
    } catch (error) {
      console.error('Erro ao iniciar escuta:', error)
    }
  }, [isVoiceControlEnabled])

  const stopListening = useCallback(() => {
    speechToTextService.stopListening()
  }, [])

  const enableHandsFreeMode = useCallback(() => {
    speechToTextService.enableHandsFreeMode()
    setIsHandsFreeMode(true)
  }, [])

  const disableHandsFreeMode = useCallback(() => {
    speechToTextService.disableHandsFreeMode()
    setIsHandsFreeMode(false)
  }, [])

  const toggleHandsFreeMode = useCallback(() => {
    if (isHandsFreeMode) {
      disableHandsFreeMode()
    } else {
      enableHandsFreeMode()
    }
  }, [isHandsFreeMode, enableHandsFreeMode, disableHandsFreeMode])

  const setResponseForTTS = useCallback((response: string) => {
    pendingResponseRef.current = response
    
    if (config.autoPlayResponses && isHandsFreeMode) {
      playTextToSpeech(response)
    }
  }, [config.autoPlayResponses, isHandsFreeMode, playTextToSpeech])

  const getVoiceCommands = useCallback(() => {
    return speechToTextService.getCommands()
  }, [])

  const addCustomCommand = useCallback((command: VoiceCommand) => {
    speechToTextService.addCommand(command)
  }, [])

  const removeCustomCommand = useCallback((commandName: string) => {
    speechToTextService.removeCommand(commandName)
  }, [])

  const getStatus = useCallback(() => {
    return {
      ...speechToTextService.getStatus(),
      lastCommand,
      commandHistory,
      isVoiceControlEnabled
    }
  }, [lastCommand, commandHistory, isVoiceControlEnabled])

  return {
    // Estado
    isListening,
    isHandsFreeMode,
    lastCommand,
    commandHistory,
    isVoiceControlEnabled,
    
    // Controles
    startListening,
    stopListening,
    enableHandsFreeMode,
    disableHandsFreeMode,
    toggleHandsFreeMode,
    setIsVoiceControlEnabled,
    
    // TTS Integration
    setResponseForTTS,
    playTextToSpeech,
    
    // Comandos
    getVoiceCommands,
    addCustomCommand,
    removeCustomCommand,
    
    // Status
    getStatus,
    isSupported: speechToTextService.isRecognitionSupported()
  }
}