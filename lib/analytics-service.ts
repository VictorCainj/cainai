interface AnalyticsEvent {
  type: string
  data: Record<string, any>
  timestamp: number
  sessionId: string
  userId?: string
}

interface SessionMetrics {
  startTime: number
  endTime?: number
  messageCount: number
  conversationCount: number
  ttsUsage: number
  imageGeneration: number
  errors: number
}

interface PerformanceMetrics {
  chatResponseTime: number[]
  ttsGenerationTime: number[]
  imageGenerationTime: number[]
  conversationLoadTime: number[]
}

class AnalyticsService {
  private events: AnalyticsEvent[] = []
  private sessionId: string
  private sessionMetrics: SessionMetrics
  private performanceMetrics: PerformanceMetrics = {
    chatResponseTime: [],
    ttsGenerationTime: [],
    imageGenerationTime: [],
    conversationLoadTime: []
  }
  private userId?: string

  constructor() {
    this.sessionId = this.generateSessionId()
    this.sessionMetrics = {
      startTime: Date.now(),
      messageCount: 0,
      conversationCount: 0,
      ttsUsage: 0,
      imageGeneration: 0,
      errors: 0
    }

    // Enviar dados antes da página fechar
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.endSession()
        this.sendAnalytics()
      })
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  setUserId(userId: string) {
    this.userId = userId
    this.track('user_identified', { userId })
  }

  // Rastrear eventos
  track(eventType: string, data: Record<string, any> = {}) {
    const event: AnalyticsEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    }

    this.events.push(event)

    // Enviar automaticamente se tiver muitos eventos
    if (this.events.length >= 50) {
      this.sendAnalytics()
    }
  }

  // Métricas específicas
  trackMessageSent(conversationId: string, messageLength: number) {
    this.sessionMetrics.messageCount++
    this.track('message_sent', {
      conversationId,
      messageLength,
      totalMessages: this.sessionMetrics.messageCount
    })
  }

  trackMessageReceived(responseTime: number, tokenUsage?: number) {
    this.performanceMetrics.chatResponseTime.push(responseTime)
    this.track('message_received', {
      responseTime,
      tokenUsage,
      avgResponseTime: this.getAverageResponseTime()
    })
  }

  trackConversationCreated(conversationId: string) {
    this.sessionMetrics.conversationCount++
    this.track('conversation_created', {
      conversationId,
      totalConversations: this.sessionMetrics.conversationCount
    })
  }

  trackConversationLoaded(conversationId: string, loadTime: number, messageCount: number) {
    this.performanceMetrics.conversationLoadTime.push(loadTime)
    this.track('conversation_loaded', {
      conversationId,
      loadTime,
      messageCount,
      avgLoadTime: this.getAverageLoadTime()
    })
  }

  trackTTSUsage(messageId: string, textLength: number, generationTime: number) {
    this.sessionMetrics.ttsUsage++
    this.performanceMetrics.ttsGenerationTime.push(generationTime)
    this.track('tts_used', {
      messageId,
      textLength,
      generationTime,
      totalTTSUsage: this.sessionMetrics.ttsUsage
    })
  }

  trackImageGeneration(prompt: string, generationTime: number, success: boolean) {
    if (success) {
      this.sessionMetrics.imageGeneration++
    }
    this.performanceMetrics.imageGenerationTime.push(generationTime)
    this.track('image_generated', {
      promptLength: prompt.length,
      generationTime,
      success,
      totalImageGeneration: this.sessionMetrics.imageGeneration
    })
  }

  trackError(errorType: string, errorMessage: string, context?: any) {
    this.sessionMetrics.errors++
    this.track('error_occurred', {
      errorType,
      errorMessage,
      context,
      totalErrors: this.sessionMetrics.errors
    })
  }

  trackFeatureUsage(featureName: string, usage: Record<string, any> = {}) {
    this.track('feature_used', {
      featureName,
      ...usage
    })
  }

  // Métricas de performance
  private getAverageResponseTime(): number {
    const times = this.performanceMetrics.chatResponseTime
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
  }

  private getAverageLoadTime(): number {
    const times = this.performanceMetrics.conversationLoadTime
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
  }

  // Finalizar sessão
  endSession() {
    this.sessionMetrics.endTime = Date.now()
    const sessionDuration = this.sessionMetrics.endTime - this.sessionMetrics.startTime

    this.track('session_ended', {
      duration: sessionDuration,
      metrics: this.sessionMetrics,
      performance: {
        avgResponseTime: this.getAverageResponseTime(),
        avgLoadTime: this.getAverageLoadTime(),
        avgTTSTime: this.performanceMetrics.ttsGenerationTime.reduce((a, b) => a + b, 0) / this.performanceMetrics.ttsGenerationTime.length || 0,
        avgImageTime: this.performanceMetrics.imageGenerationTime.reduce((a, b) => a + b, 0) / this.performanceMetrics.imageGenerationTime.length || 0
      }
    })
  }

  // Obter resumo da sessão
  getSessionSummary() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      duration: Date.now() - this.sessionMetrics.startTime,
      metrics: this.sessionMetrics,
      performance: {
        avgResponseTime: this.getAverageResponseTime(),
        avgLoadTime: this.getAverageLoadTime(),
        totalEvents: this.events.length
      }
    }
  }

  // Enviar dados (mock - implementar com service real)
  private async sendAnalytics() {
    if (this.events.length === 0) return

    try {
      // Em produção, enviar para serviço de analytics
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Analytics Data:', {
          events: this.events,
          session: this.getSessionSummary()
        })
      }

      // Aqui você integraria com:
      // - Google Analytics
      // - Mixpanel
      // - PostHog
      // - Amplitude
      // - ou serviço próprio

      // Limpar eventos enviados
      this.events = []
    } catch (error) {
      console.error('Error sending analytics:', error)
    }
  }

  // Hook React para usar analytics
  useAnalytics() {
    return {
      track: this.track.bind(this),
      trackMessageSent: this.trackMessageSent.bind(this),
      trackMessageReceived: this.trackMessageReceived.bind(this),
      trackConversationCreated: this.trackConversationCreated.bind(this),
      trackConversationLoaded: this.trackConversationLoaded.bind(this),
      trackTTSUsage: this.trackTTSUsage.bind(this),
      trackImageGeneration: this.trackImageGeneration.bind(this),
      trackError: this.trackError.bind(this),
      trackFeatureUsage: this.trackFeatureUsage.bind(this),
      getSessionSummary: this.getSessionSummary.bind(this),
      setUserId: this.setUserId.bind(this)
    }
  }
}

// Instância singleton
export const analyticsService = new AnalyticsService()

// Hook React
export const useAnalytics = () => analyticsService.useAnalytics()

// Funções de conveniência
export const trackPageView = (page: string) => {
  analyticsService.track('page_view', { page })
}

export const trackButtonClick = (buttonName: string, location: string) => {
  analyticsService.track('button_click', { buttonName, location })
}

export const trackSearchQuery = (query: string, results: number) => {
  analyticsService.track('search_query', { query, results })
} 