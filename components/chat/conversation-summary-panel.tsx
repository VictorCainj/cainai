import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageCircle, Brain, Sparkles, Calendar, Loader2, FileText, Zap, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConversationSummaryData {
  id: string
  conversationId: string
  summaryText: string
  timeline: Array<{
    time: string
    period: string
    action: string
  }>
  sentiment: 'positive' | 'neutral' | 'negative'
  generatedAt: string
}

interface ConversationSummaryPanelProps {
  isOpen: boolean
  onClose: () => void
  userId: string | null
  conversationId: string | null
  conversationTitle: string
}

export const ConversationSummaryPanel: React.FC<ConversationSummaryPanelProps> = ({
  isOpen,
  onClose,
  userId,
  conversationId,
  conversationTitle
}) => {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [summary, setSummary] = useState<ConversationSummaryData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Carregar resumo existente quando o painel abre
  useEffect(() => {
    if (isOpen && conversationId && userId) {
      loadExistingSummary()
    }
  }, [isOpen, conversationId, userId])

  const loadExistingSummary = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/summary?userId=${userId}`)
      const data = await response.json()
      
      if (data.success && data.summary) {
        setSummary(data.summary)
      } else {
        setSummary(null) // Não existe resumo ainda
      }
    } catch (error) {
      console.error('Erro ao carregar resumo:', error)
      setError('Erro ao carregar resumo existente')
    } finally {
      setLoading(false)
    }
  }

  const generateNewSummary = async () => {
    if (!conversationId || !userId) return
    
    setGenerating(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSummary(data.summary)
      } else {
        setError(data.error || 'Erro ao gerar resumo')
      }
    } catch (error) {
      console.error('Erro ao gerar resumo:', error)
      setError('Erro de conexão ao gerar resumo')
    } finally {
      setGenerating(false)
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-700 bg-green-50 border-green-200'
      case 'negative': return 'text-red-700 bg-red-50 border-red-200'
      default: return 'text-blue-700 bg-blue-50 border-blue-200'
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊'
      case 'negative': return '😔'
      default: return '😐'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              opacity: { duration: 0.2 }
            }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-white/95 backdrop-blur-xl border-l border-gray-200/50 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-white via-blue-50/30 to-indigo-50/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">Resumo da Conversa</h2>
                    <p className="text-sm text-gray-600 truncate max-w-48">
                      {conversationTitle || 'Conversa atual'}
                    </p>
                  </div>
                </div>
                <motion.button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-gray-100/80 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </motion.button>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <motion.button
                  onClick={generateNewSummary}
                  disabled={generating || !conversationId}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                    generating
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md'
                  }`}
                  whileHover={!generating ? { scale: 1.02 } : {}}
                  whileTap={!generating ? { scale: 0.98 } : {}}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gerando...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>{summary ? 'Atualizar' : 'Gerar'} Resumo</span>
                    </>
                  )}
                </motion.button>
                
                {summary && (
                  <motion.button
                    onClick={loadExistingSummary}
                    disabled={loading}
                    className="px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Recarregar"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                  <p className="text-gray-600 font-medium">Carregando resumo...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-red-600 font-medium mb-2">Erro</p>
                  <p className="text-sm text-gray-500 text-center mb-4">{error}</p>
                  <Button
                    onClick={loadExistingSummary}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : !summary ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center mb-4 border border-blue-200/30">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-gray-600 font-medium mb-2">Nenhum resumo encontrado</p>
                  <p className="text-sm text-gray-500 text-center mb-6">
                    Clique em "Gerar Resumo" para criar um resumo inteligente desta conversa
                  </p>
                  <motion.button
                    onClick={generateNewSummary}
                    disabled={!conversationId}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Zap className="w-4 h-4" />
                    <span>Gerar Resumo</span>
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-gray-800">Cronologia Gerada</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getSentimentColor(summary.sentiment)}`}>
                      {getSentimentIcon(summary.sentiment)} {summary.sentiment}
                    </div>
                  </div>

                  {/* Summary Text */}
                  <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl p-5 border border-gray-200/50">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                      <Brain className="w-4 h-4 text-blue-600" />
                      <span>Contexto</span>
                    </h3>
                    <p className="text-gray-700 leading-relaxed">{summary.summaryText}</p>
                  </div>

                  {/* Timeline */}
                  {summary.timeline && summary.timeline.length > 0 && (
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-gray-200/50">
                      <h3 className="font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span>Cronologia de Ações</span>
                      </h3>
                      <div className="space-y-4">
                        {summary.timeline.map((entry, index) => (
                          <div key={index} className="flex items-start space-x-4 p-3 bg-gradient-to-r from-purple-50/50 to-blue-50/50 rounded-xl border border-purple-100/30">
                            {/* Time Badge */}
                            <div className="flex flex-col items-center min-w-0 flex-shrink-0">
                              <div className="px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-xs font-bold">
                                {entry.time}
                              </div>
                              <div className="text-xs text-purple-600 font-medium mt-1 capitalize">
                                {entry.period}
                              </div>
                            </div>
                            
                            {/* Action */}
                            <div className="flex-1">
                              <p className="text-gray-700 text-sm leading-relaxed">{entry.action}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {summary && (
              <div className="p-6 border-t border-gray-200/50 bg-gradient-to-r from-white via-blue-50/20 to-indigo-50/20">
                <div className="flex items-center justify-center text-xs text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3 h-3" />
                    <span>Cronologia gerada em {formatDate(summary.generatedAt)}</span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}