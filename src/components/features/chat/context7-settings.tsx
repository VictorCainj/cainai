'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Settings, BookOpen, CheckCircle2, XCircle, Info, Cpu, Clock } from 'lucide-react'

interface Context7Config {
  enabled: boolean
  maxTokens: number
  libraries: string[]
}

interface Context7Status {
  enabled: boolean
  librariesDetected: string[]
  tokensUsed: number
}

interface Context7SettingsProps {
  onConfigChange?: (config: Context7Config) => void
  status?: Context7Status
}

export function Context7Settings({ onConfigChange, status }: Context7SettingsProps) {
  const [config, setConfig] = useState<Context7Config>({
    enabled: true,
    maxTokens: 5000,
    libraries: []
  })
  
  const [isOpen, setIsOpen] = useState(false)
  const [lastActivity, setLastActivity] = useState<string>('')

  useEffect(() => {
    if (status?.librariesDetected && status.librariesDetected.length > 0) {
      setLastActivity(`Detectou: ${status.librariesDetected.join(', ')}`)
    } else if (status?.enabled) {
      setLastActivity('Aguardando bibliotecas...')
    } else {
      setLastActivity('Desabilitado')
    }
  }, [status])

  const handleToggleEnabled = () => {
    const newConfig = { ...config, enabled: !config.enabled }
    setConfig(newConfig)
    onConfigChange?.(newConfig)
  }

  const handleMaxTokensChange = (value: number) => {
    const newConfig = { ...config, maxTokens: value }
    setConfig(newConfig)
    onConfigChange?.(newConfig)
  }

  const getStatusIcon = () => {
    if (!config.enabled) {
      return <XCircle className="w-2.5 h-2.5 text-text-muted" />
    }
    
    if (status?.librariesDetected && status.librariesDetected.length > 0) {
      return <CheckCircle2 className="w-2.5 h-2.5 text-success" />
    }
    
    return <Clock className="w-2.5 h-2.5 text-info" />
  }

  const getStatusColor = () => {
    if (!config.enabled) return 'text-text-muted'
    if (status?.librariesDetected && status.librariesDetected.length > 0) return 'text-success'
    return 'text-info'
  }

  return (
    <div className="relative">
      {/* Botão principal ultra compacto */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`neutral-button h-6 px-2 ${getStatusColor()} hover:bg-bg-tertiary transition-colors`}
        title="Context7 MCP - Documentação atualizada"
      >
        <BookOpen className="w-2.5 h-2.5 mr-1" />
        {getStatusIcon()}
        <span className="ml-1 hidden sm:inline neutral-mono">Context7</span>
      </Button>

      {/* Modal/Dropdown compacto */}
      {isOpen && (
        <div className="absolute top-8 right-0 neutral-panel bg-bg-card p-3 w-72 z-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <BookOpen className="w-3 h-3 text-accent-primary mr-1" />
              <h3 className="neutral-title text-text-primary">Context7 MCP</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="neutral-button h-5 w-5 p-0"
            >
              ×
            </Button>
          </div>

          {/* Status atual */}
          <div className="mb-2 p-2 bg-bg-tertiary rounded">
            <div className="flex items-center mb-1">
              <Cpu className="w-2.5 h-2.5 mr-1 text-text-muted" />
              <span className="neutral-mono">Status:</span>
              <span className={`ml-1 neutral-mono ${getStatusColor()}`}>{lastActivity}</span>
            </div>
            {status?.tokensUsed && status.tokensUsed > 0 && (
              <div className="neutral-mono text-text-muted">
                Tokens: {status.tokensUsed}
              </div>
            )}
          </div>

          {/* Toggle principal */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="neutral-title text-text-primary">
                Context7 Ativo
              </label>
              <p className="neutral-mono text-text-muted">
                Buscar docs automaticamente
              </p>
            </div>
            <button
              onClick={handleToggleEnabled}
              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                config.enabled ? 'bg-accent-primary' : 'bg-border-primary'
              }`}
            >
              <span
                className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Configuração de tokens */}
          {config.enabled && (
            <div className="mb-2">
              <label className="neutral-title text-text-primary block mb-1">
                Máx. Tokens: {config.maxTokens}
              </label>
              <input
                type="range"
                min="1000"
                max="10000"
                step="500"
                value={config.maxTokens}
                onChange={(e) => handleMaxTokensChange(Number(e.target.value))}
                className="w-full h-1 bg-border-primary rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between neutral-mono text-text-muted mt-1">
                <span>1k</span>
                <span>5k</span>
                <span>10k</span>
              </div>
            </div>
          )}

          {/* Bibliotecas detectadas */}
          {config.enabled && status?.librariesDetected && status.librariesDetected.length > 0 && (
            <div className="mb-2">
              <label className="neutral-title text-text-primary block mb-1">
                Bibliotecas Detectadas:
              </label>
              <div className="flex flex-wrap gap-1">
                {status.librariesDetected.map((lib, index) => (
                  <span
                    key={index}
                    className="px-1.5 py-0.5 bg-accent-primary/10 text-accent-primary neutral-mono rounded"
                  >
                    {lib}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Informações */}
          <div className="border-t border-border-primary pt-2 mt-2">
            <div className="flex items-start neutral-mono text-text-muted">
              <Info className="w-2.5 h-2.5 mr-1 mt-0.5 flex-shrink-0" />
              <div>
                <p className="mb-1">
                  <strong>Context7 MCP</strong> busca docs atualizadas automaticamente.
                </p>
                <p>
                  Suporta: React, Next.js, Vue, Angular, Node.js, Python, Tailwind CSS, etc.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para fechar */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
} 