// Sistema de Debug para Persistência de Conversas

export class DebugHelper {
  private static logs: Array<{
    timestamp: string
    level: 'info' | 'warning' | 'error'
    component: string
    message: string
    data?: any
  }> = []

  static log(level: 'info' | 'warning' | 'error', component: string, message: string, data?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data
    }
    
    this.logs.push(logEntry)
    
    // Manter apenas os últimos 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100)
    }
    
    // Console log com cores
    const colorMap = {
      info: '\x1b[36m',    // cyan
      warning: '\x1b[33m', // yellow
      error: '\x1b[31m'    // red
    }
    
    console.log(
      `${colorMap[level]}[${component}] ${message}\x1b[0m`,
      data ? data : ''
    )
  }

  static getLogs() {
    return [...this.logs]
  }

  static clearLogs() {
    this.logs = []
  }

  static async checkSupabaseConfig(): Promise<{
    hasUrl: boolean
    hasAnonKey: boolean
    hasServiceKey: boolean
    urlValid: boolean
  }> {
    const config = {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      urlValid: false
    }

    if (config.hasUrl) {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
        config.urlValid = url.startsWith('https://') && url.includes('.supabase.co')
      } catch (error) {
        config.urlValid = false
      }
    }

    this.log('info', 'CONFIG', 'Configuração do Supabase verificada', config)
    return config
  }

  static async testSupabaseConnection() {
    try {
      // Import dinâmico para evitar problemas no servidor
      const { supabase } = await import('./supabase')
      
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('id')
        .limit(1)

      if (error) {
        this.log('error', 'CONNECTION', 'Erro ao conectar com Supabase', error)
        return { success: false, error: error.message }
      }

      this.log('info', 'CONNECTION', 'Conexão com Supabase bem-sucedida')
      return { success: true, data }
    } catch (error) {
      this.log('error', 'CONNECTION', 'Erro crítico na conexão', error)
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  }

  static createDebugPanel() {
    if (typeof window === 'undefined') return null

    return {
      logs: this.getLogs(),
      clear: () => this.clearLogs(),
      test: () => this.testSupabaseConnection(),
      export: () => {
        const debugData = {
          timestamp: new Date().toISOString(),
          logs: this.getLogs(),
          userAgent: navigator.userAgent,
          url: window.location.href
        }
        
        const blob = new Blob([JSON.stringify(debugData, null, 2)], {
          type: 'application/json'
        })
        
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `debug-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    }
  }
}

// Hook para React
export function useDebug() {
  if (typeof window === 'undefined') {
    return { logs: [], clear: () => {}, test: () => Promise.resolve({ success: false }) }
  }

  return DebugHelper.createDebugPanel()
} 