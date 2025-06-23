'use client'

import React from 'react'
import { Bot, Wifi, WifiOff, Activity, Zap } from 'lucide-react'
import { Context7Settings } from './context7-settings'
import { TTSVoiceSelector, useTTSSettings } from './tts-voice-selector'

interface ChatHeaderProps {
  conversationTitle: string
  isOnline: boolean
  lastSeen?: string
  context7Status?: {
    enabled: boolean
    librariesDetected: string[]
    tokensUsed: number
  }
  ttsSettings?: {
    isEnabled: boolean
    selectedVoice: string
    onVoiceChange: (voice: string) => void
    onToggle: () => void
  }
}

export function ChatHeader({ conversationTitle, isOnline, lastSeen, context7Status, ttsSettings }: ChatHeaderProps) {
  // Usar hook local como fallback
  const localTTSSettings = useTTSSettings()
  
  // Usar configurações passadas ou as locais como fallback
  const effectiveTTSSettings = ttsSettings || {
    isEnabled: localTTSSettings.isEnabled,
    selectedVoice: localTTSSettings.selectedVoice,
    onVoiceChange: localTTSSettings.changeVoice,
    onToggle: localTTSSettings.toggleEnabled
  }



  return (
    <header className="neutral-panel border-0 border-b border-border-primary bg-bg-secondary">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          
          {/* Left: Bot Info Ultra Compacto */}
          <div className="flex items-center space-x-2">
            {/* Avatar Micro */}
            <div className="relative">
              <div className="w-6 h-6 bg-accent-primary rounded-md flex items-center justify-center">
                <Bot className="w-3 h-3 text-white" />
              </div>
              
              {/* Status Dot */}
              <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${
                isOnline ? 'bg-success' : 'bg-error'
              }`} />
            </div>

            {/* Title Super Compacto */}
            <div className="flex items-center space-x-1.5">
              <h1 className="neutral-title text-text-primary">
                🤖 Assistente IA v2.0
              </h1>
              <div className={`flex items-center space-x-0.5 ${
                isOnline ? 'text-success' : 'text-error'
              }`}>
                {isOnline ? (
                  <Wifi className="w-2.5 h-2.5" />
                ) : (
                  <WifiOff className="w-2.5 h-2.5" />
                )}
                <span className="neutral-mono">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: TTS, Context7 e Status */}
          <div className="flex items-center space-x-3">
            {/* TTS Voice Selector */}
            <TTSVoiceSelector
              selectedVoice={effectiveTTSSettings.selectedVoice}
              onVoiceChange={effectiveTTSSettings.onVoiceChange}
              isEnabled={effectiveTTSSettings.isEnabled}
              onToggle={effectiveTTSSettings.onToggle}
            />
            
            <Context7Settings status={context7Status} />
            
            {/* Status Mínimo */}
            <div className="hidden sm:flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-success rounded-full" />
              <span className="neutral-mono text-text-muted">
                OK
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
} 