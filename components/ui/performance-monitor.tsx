'use client'

import React, { useState } from 'react'
import { BarChart3, Database, Zap, Clock, Activity, X, Eye, EyeOff } from 'lucide-react'
import { useSmartCache, useCompression, usePerformanceMonitor } from '@/lib/performance-hooks'
import { Button } from '@/components/ui/button'

interface PerformanceMonitorProps {
  className?: string
}

export function PerformanceMonitor({ className = '' }: PerformanceMonitorProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  
  const { cacheStats, clearCache } = useSmartCache()
  const { compressionStats, resetStats: resetCompressionStats } = useCompression()
  const { metrics, getAverageLoadTime } = usePerformanceMonitor()

  if (!isVisible) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-black/80 text-white border-gray-600 hover:bg-black/90"
        >
          <Activity className="w-4 h-4 mr-2" />
          Performance
        </Button>
      </div>
    )
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="bg-black/90 backdrop-blur-lg text-white rounded-lg border border-gray-600 shadow-xl max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-600">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">Performance</span>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-300 hover:text-white"
            >
              {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </Button>
            <Button
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-300 hover:text-white"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Métricas principais (sempre visíveis) */}
        <div className="p-3 space-y-2">
          {/* Cache Hit Rate */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-3 h-3 text-blue-400" />
              <span className="text-xs">Cache Hit</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                cacheStats.hitRate > 80 ? 'bg-green-400' : 
                cacheStats.hitRate > 50 ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-xs font-mono">{cacheStats.hitRate.toFixed(1)}%</span>
            </div>
          </div>

          {/* Compression */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-3 h-3 text-purple-400" />
              <span className="text-xs">Compressão</span>
            </div>
            <span className="text-xs font-mono">
              {compressionStats.spaceSavedPercentage.toFixed(1)}%
            </span>
          </div>

          {/* Average Load Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-3 h-3 text-orange-400" />
              <span className="text-xs">Tempo Médio</span>
            </div>
            <span className="text-xs font-mono">
              {formatTime(getAverageLoadTime())}
            </span>
          </div>
        </div>

        {/* Métricas detalhadas (expansíveis) */}
        {isExpanded && (
          <>
            <div className="border-t border-gray-600 p-3 space-y-3">
              {/* Cache Details */}
              <div>
                <h4 className="text-xs font-medium text-gray-300 mb-2 flex items-center">
                  <Database className="w-3 h-3 mr-1" />
                  Cache Details
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Itens:</span>
                    <span className="font-mono">{cacheStats.itemCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tamanho:</span>
                    <span className="font-mono">{formatBytes(cacheStats.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Hits:</span>
                    <span className="font-mono text-green-400">{cacheStats.hits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Misses:</span>
                    <span className="font-mono text-red-400">{cacheStats.misses}</span>
                  </div>
                </div>
              </div>

              {/* Compression Details */}
              <div>
                <h4 className="text-xs font-medium text-gray-300 mb-2 flex items-center">
                  <Zap className="w-3 h-3 mr-1" />
                  Compressão
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Economia:</span>
                    <span className="font-mono text-green-400">
                      {formatBytes(compressionStats.spaceSavedBytes)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Compressões:</span>
                    <span className="font-mono">{compressionStats.compressionsSaved}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Original:</span>
                    <span className="font-mono">{formatBytes(compressionStats.totalOriginalBytes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Comprimido:</span>
                    <span className="font-mono">{formatBytes(compressionStats.totalCompressedBytes)}</span>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h4 className="text-xs font-medium text-gray-300 mb-2 flex items-center">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Métricas
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Erros:</span>
                    <span className="font-mono text-red-400">{metrics.errorCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Operações:</span>
                    <span className="font-mono">{metrics.loadingTimes.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-600 p-3">
              <div className="flex space-x-2">
                <Button
                  onClick={clearCache}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Limpar Cache
                </Button>
                <Button
                  onClick={resetCompressionStats}
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Reset Stats
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Componente de notificação de performance
export function PerformanceNotification({ 
  type, 
  message, 
  onClose 
}: { 
  type: 'cache' | 'compression' | 'loading'
  message: string
  onClose: () => void 
}) {
  const getIcon = () => {
    switch (type) {
      case 'cache': return <Database className="w-4 h-4 text-blue-400" />
      case 'compression': return <Zap className="w-4 h-4 text-purple-400" />
      case 'loading': return <Clock className="w-4 h-4 text-orange-400" />
    }
  }

  const getBgColor = () => {
    switch (type) {
      case 'cache': return 'bg-blue-500/10 border-blue-500/20'
      case 'compression': return 'bg-purple-500/10 border-purple-500/20'
      case 'loading': return 'bg-orange-500/10 border-orange-500/20'
    }
  }

  return (
    <div className={`fixed top-4 right-4 z-50 p-3 rounded-lg border backdrop-blur-lg ${getBgColor()}`}>
      <div className="flex items-center space-x-3">
        {getIcon()}
        <span className="text-sm text-white">{message}</span>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-gray-300 hover:text-white"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}