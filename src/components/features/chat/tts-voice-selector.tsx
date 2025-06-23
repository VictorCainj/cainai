'use client'

import React, { useState } from 'react'
import { Volume2, VolumeX, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TTSVoice {
  id: string
  name: string
  description: string
  gender: 'feminina' | 'masculina'
  style: string
}

const TTS_VOICES: TTSVoice[] = [
  {
    id: 'nova',
    name: 'Nova',
    description: 'Jovem, energética e amigável',
    gender: 'feminina',
    style: 'Casual e dinâmica'
  },
  {
    id: 'alloy',
    name: 'Alloy',
    description: 'Neutra e profissional',
    gender: 'feminina',
    style: 'Equilibrada e clara'
  },
  {
    id: 'echo',
    name: 'Echo',
    description: 'Masculina e autoritativa',
    gender: 'masculina',
    style: 'Profunda e confiante'
  },
  {
    id: 'fable',
    name: 'Fable',
    description: 'Suave e narrativa',
    gender: 'feminina',
    style: 'Calorosa e envolvente'
  },
  {
    id: 'onyx',
    name: 'Onyx',
    description: 'Masculina e robusta',
    gender: 'masculina',
    style: 'Forte e marcante'
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    description: 'Feminina e sofisticada',
    gender: 'feminina',
    style: 'Elegante e refinada'
  }
]

interface TTSVoiceSelectorProps {
  selectedVoice: string
  onVoiceChange: (voice: string) => void
  isEnabled: boolean
  onToggle: () => void
}

export const TTSVoiceSelector: React.FC<TTSVoiceSelectorProps> = ({
  selectedVoice,
  onVoiceChange,
  isEnabled,
  onToggle
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isTestingVoice, setIsTestingVoice] = useState<string | null>(null)

  const currentVoice = TTS_VOICES.find(v => v.id === selectedVoice) || TTS_VOICES[0]

  const testVoice = async (voiceId: string) => {
    setIsTestingVoice(voiceId)
    
    try {
      const testText = "Olá! Esta é a minha voz. Como você me acha?"
      
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testText,
          voice: voiceId,
          speed: 1.1,
          model: 'tts-1-hd'
        }),
      })

      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          setIsTestingVoice(null)
        }
        
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl)
          setIsTestingVoice(null)
        }
        
        await audio.play()
      }
    } catch (error) {
      console.error('Erro ao testar voz:', error)
      setIsTestingVoice(null)
    }
  }

  return (
    <div className="relative">
      {/* Toggle TTS */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => isEnabled ? setIsOpen(!isOpen) : onToggle()}
        className={`h-8 px-3 text-xs transition-all duration-200 ${
          isEnabled 
            ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
        }`}
        title={isEnabled ? 'TTS Ativado - Clique para configurar' : 'TTS Desativado - Clique para ativar'}
      >
        {isEnabled ? (
          <Volume2 className="w-3 h-3 mr-1" />
        ) : (
          <VolumeX className="w-3 h-3 mr-1" />
        )}
        {isEnabled ? currentVoice.name : 'TTS Off'}
        {isEnabled && <ChevronDown className="w-3 h-3 ml-1" />}
      </Button>

      {/* Voice Selector Dropdown */}
      {isEnabled && isOpen && (
        <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-3">
            <div className="text-sm font-medium text-gray-900 mb-3">
              🎵 Vozes TTS - OpenAI
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {TTS_VOICES.map((voice) => (
                <div
                  key={voice.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    selectedVoice === voice.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    onVoiceChange(voice.id)
                    setIsOpen(false)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm text-gray-900">
                          {voice.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          voice.gender === 'feminina' 
                            ? 'bg-pink-100 text-pink-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {voice.gender}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {voice.description}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Estilo: {voice.style}
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        testVoice(voice.id)
                      }}
                      disabled={isTestingVoice === voice.id}
                      className="h-8 px-2 text-xs text-blue-600 hover:bg-blue-50"
                    >
                      {isTestingVoice === voice.id ? (
                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Volume2 className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                ✨ Vozes humanas realistas da OpenAI<br />
                🎧 Clique no ícone de volume para testar
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para fechar dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

// Hook para gerenciar configurações de TTS
export const useTTSSettings = () => {
  const [isEnabled, setIsEnabled] = useState(true)
  const [selectedVoice, setSelectedVoice] = useState('nova')
  const [speed, setSpeed] = useState(1.1)

  // Carregar configurações do localStorage
  React.useEffect(() => {
    const savedSettings = localStorage.getItem('tts-settings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        setIsEnabled(settings.enabled ?? true)
        setSelectedVoice(settings.voice ?? 'nova')
        setSpeed(settings.speed ?? 1.1)
      } catch (error) {
        console.error('Erro ao carregar configurações TTS:', error)
      }
    }
  }, [])

  // Salvar configurações no localStorage
  const saveSettings = (enabled: boolean, voice: string, speed: number) => {
    const settings = { enabled, voice, speed }
    localStorage.setItem('tts-settings', JSON.stringify(settings))
  }

  const toggleEnabled = () => {
    const newEnabled = !isEnabled
    setIsEnabled(newEnabled)
    saveSettings(newEnabled, selectedVoice, speed)
  }

  const changeVoice = (voice: string) => {
    setSelectedVoice(voice)
    saveSettings(isEnabled, voice, speed)
  }

  const changeSpeed = (newSpeed: number) => {
    setSpeed(newSpeed)
    saveSettings(isEnabled, selectedVoice, newSpeed)
  }

  return {
    isEnabled,
    selectedVoice,
    speed,
    toggleEnabled,
    changeVoice,
    changeSpeed
  }
} 