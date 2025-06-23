'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Volume2, VolumeX, Settings, User, Monitor } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTTSSettings } from '@/components/chat/tts-voice-selector'

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

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const ttsSettings = useTTSSettings()
  const [isTestingVoice, setIsTestingVoice] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'audio' | 'interface' | 'account'>('audio')

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

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Configurações
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex">
            {/* Sidebar de Tabs */}
            <div className="w-48 border-r border-gray-200 dark:border-gray-700 p-4">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('audio')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'audio'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Áudio & TTS</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('interface')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'interface'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>Interface</span>
                </button>
                
                <button
                  onClick={() => setActiveTab('account')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'account'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Conta</span>
                </button>
              </nav>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 p-6 overflow-y-auto max-h-[calc(85vh-5rem)]">
              {activeTab === 'audio' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Configurações de Áudio
                    </h3>
                    
                    {/* Toggle TTS */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <div className="flex items-center space-x-3">
                        {ttsSettings.isEnabled ? (
                          <Volume2 className="w-5 h-5 text-blue-600" />
                        ) : (
                          <VolumeX className="w-5 h-5 text-gray-400" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            Narração por IA (TTS)
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Reproduzir automaticamente as respostas da IA
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={ttsSettings.toggleEnabled}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          ttsSettings.isEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            ttsSettings.isEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Seleção de Voz */}
                    {ttsSettings.isEnabled && (
                      <div className="mt-6">
                        <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">
                          Escolha a Voz da IA
                        </h4>
                        
                        <div className="grid gap-3">
                          {TTS_VOICES.map((voice) => (
                            <div
                              key={voice.id}
                              className={`p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md ${
                                ttsSettings.selectedVoice === voice.id
                                  ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-600'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                              }`}
                              onClick={() => ttsSettings.changeVoice(voice.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3">
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {voice.name}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      voice.gender === 'feminina' 
                                        ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' 
                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    }`}>
                                      {voice.gender}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {voice.description}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                    Estilo: {voice.style}
                                  </p>
                                </div>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    testVoice(voice.id)
                                  }}
                                  disabled={isTestingVoice === voice.id}
                                  className="h-10 px-3 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                                >
                                  {isTestingVoice === voice.id ? (
                                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Volume2 className="w-4 h-4" />
                                  )}
                                  <span className="ml-2">Testar</span>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Velocidade de Fala */}
                        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                            Velocidade de Fala: {ttsSettings.speed}x
                          </label>
                          <input
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.1"
                            value={ttsSettings.speed}
                            onChange={(e) => ttsSettings.changeSpeed(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                          />
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                            <span>0.5x (Lenta)</span>
                            <span>1.0x (Normal)</span>
                            <span>2.0x (Rápida)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'interface' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Configurações de Interface
                    </h3>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <p className="text-gray-600 dark:text-gray-400">
                        🚧 Configurações de interface em desenvolvimento...
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Em breve: temas personalizados, tamanho da fonte, layout e mais!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                      Configurações da Conta
                    </h3>
                    
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <p className="text-gray-600 dark:text-gray-400">
                        🚧 Configurações de conta em desenvolvimento...
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        Em breve: perfil, preferências, privacidade e mais!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                ✨ Configurações salvas automaticamente
              </div>
              <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
                Concluído
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
