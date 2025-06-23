'use client'

import React, { useState } from 'react'
import { Settings, Mic, Volume2, Languages, Gauge, Shield, Headphones, X } from 'lucide-react'
import { speechToTextService } from '@/lib/speech-to-text-service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface VoiceSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export function VoiceSettings({ isOpen, onClose }: VoiceSettingsProps) {
  const [config, setConfig] = useState(speechToTextService.getStatus().config)
  const [testingMic, setTestingMic] = useState(false)

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    speechToTextService.configure(newConfig)
  }

  const testMicrophone = async () => {
    setTestingMic(true)
    try {
      speechToTextService.setCallbacks({
        onResult: (result) => {
          if (result.isFinal) {
            // Debug log removido
            speechToTextService.stopListening()
            setTestingMic(false)
          }
        },
        onError: (error) => {
          console.error('❌ Erro no teste do microfone:', error)
          setTestingMic(false)
        }
      })
      
      await speechToTextService.startListening()
      
      // Auto-stop após 5 segundos
      setTimeout(() => {
        if (testingMic) {
          speechToTextService.stopListening()
          setTestingMic(false)
        }
      }, 5000)
    } catch (error) {
      console.error('Erro no teste:', error)
      setTestingMic(false)
    }
  }

  const languages = [
    { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
    { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
    { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' }
  ]

  const sensitivityLevels = [
    { value: 'low', name: 'Baixa', description: 'Menos sensível a ruídos' },
    { value: 'medium', name: 'Média', description: 'Balanceado' },
    { value: 'high', name: 'Alta', description: 'Mais sensível' }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Configurações de Voz
              </h2>
              <p className="text-sm text-gray-500">
                Ajuste o reconhecimento de fala e comandos de voz
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-8">
          {/* Teste do Microfone */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Mic className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Teste do Microfone</h3>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-4">
                Teste se o microfone está funcionando corretamente. Fale algo após clicar em "Testar".
              </p>
              
              <Button
                onClick={testMicrophone}
                disabled={testingMic}
                className={`${
                  testingMic 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                {testingMic ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Ouvindo... (5s)
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Testar Microfone
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Idioma */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Languages className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Idioma</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleConfigChange('language', lang.code)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    config.language === lang.code
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{lang.flag}</span>
                    <div>
                      <div className="font-medium">{lang.name}</div>
                      <div className="text-xs text-gray-500">{lang.code}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sensibilidade */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Gauge className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Sensibilidade</h3>
            </div>
            
            <div className="space-y-3">
              {sensitivityLevels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => handleConfigChange('sensitivity', level.value)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    config.sensitivity === level.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-medium ${
                        config.sensitivity === level.value ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {level.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {level.description}
                      </div>
                    </div>
                    {config.sensitivity === level.value && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Opções Avançadas */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Opções Avançadas</h3>
            </div>
            
            <div className="space-y-4">
              {/* Resultados Parciais */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Resultados Parciais</div>
                  <div className="text-sm text-gray-500">
                    Mostrar texto enquanto você fala
                  </div>
                </div>
                <button
                  onClick={() => handleConfigChange('interimResults', !config.interimResults)}
                  className={`w-12 h-6 rounded-full transition-all ${
                    config.interimResults ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    config.interimResults ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Modo Contínuo */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Modo Contínuo</div>
                  <div className="text-sm text-gray-500">
                    Manter escuta ativa por mais tempo
                  </div>
                </div>
                <button
                  onClick={() => handleConfigChange('continuous', !config.continuous)}
                  className={`w-12 h-6 rounded-full transition-all ${
                    config.continuous ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    config.continuous ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Redução de Ruído */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Redução de Ruído</div>
                  <div className="text-sm text-gray-500">
                    Filtrar ruídos de fundo
                  </div>
                </div>
                <button
                  onClick={() => handleConfigChange('noiseReduction', !config.noiseReduction)}
                  className={`w-12 h-6 rounded-full transition-all ${
                    config.noiseReduction ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    config.noiseReduction ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Auto Stop */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Parada Automática</div>
                  <div className="text-sm text-gray-500">
                    Parar automaticamente após silêncio
                  </div>
                </div>
                <button
                  onClick={() => handleConfigChange('autoStop', !config.autoStop)}
                  className={`w-12 h-6 rounded-full transition-all ${
                    config.autoStop ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    config.autoStop ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Timeout da Parada Automática */}
          {config.autoStop && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Headphones className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Timeout do Silêncio</h3>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {config.autoStopTimeout / 1000}s
                  </span>
                  <span className="text-xs text-gray-500">1s - 10s</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="10000"
                  step="500"
                  value={config.autoStopTimeout}
                  onChange={(e) => handleConfigChange('autoStopTimeout', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>
          )}

          {/* Status do Sistema */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Status do Sistema</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Suporte:</div>
                  <div className={`font-medium ${
                    speechToTextService.isRecognitionSupported() ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {speechToTextService.isRecognitionSupported() ? '✓ Disponível' : '✗ Não suportado'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Status:</div>
                  <div className={`font-medium ${
                    speechToTextService.getStatus().isListening ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {speechToTextService.getStatus().isListening ? '🎤 Ouvindo' : '💤 Inativo'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Hands-free:</div>
                  <div className={`font-medium ${
                    speechToTextService.getStatus().isHandsFreeMode ? 'text-purple-600' : 'text-gray-600'
                  }`}>
                    {speechToTextService.getStatus().isHandsFreeMode ? '🤖 Ativo' : '🔇 Desativo'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Comandos:</div>
                  <div className="font-medium text-blue-600">
                    {speechToTextService.getStatus().commandCount} disponíveis
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
          <div className="flex justify-end space-x-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="px-6"
            >
              Fechar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}