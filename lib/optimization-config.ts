/**
 * Configuração para Testes Graduais de Otimização
 * 
 * Este arquivo controla quais componentes usam as otimizações
 * e permite rollback rápido se necessário
 */

// Configuração de feature flags para otimizações
export const OPTIMIZATION_CONFIG = {
  // Chat Principal
  OPTIMIZED_CONVERSATION_LOADING: true,  // ✅ ATIVO
  OPTIMIZED_MESSAGE_LOADING: true,       // ✅ ATIVO - FASE 1.2
  
  // Sidebar de Conversas
  OPTIMIZED_CONVERSATION_LIST: true,     // ✅ ATIVO - FASE 1.3
  OPTIMIZED_SEARCH: true,                // ✅ ATIVO - FASE 1.4
  
  // Configurações de fallback
  FALLBACK_TIMEOUT: 3000,               // 3s timeout para queries otimizadas
  ENABLE_PERFORMANCE_LOGS: true,        // Logs detalhados durante teste
  ENABLE_METRICS_COLLECTION: true,      // Coletar métricas durante teste
  
  // Configuração para different usuários (pode ser expandido)
  TEST_USER_PERCENTAGE: 100,             // % de usuários que recebem otimização
}

// Função para verificar se um feature está habilitado
export function isOptimizationEnabled(feature: keyof typeof OPTIMIZATION_CONFIG) {
  // Por enquanto, retorna sempre o valor direto
  // Pode ser expandido para incluir lógica baseada em usuário, data, etc.
  return OPTIMIZATION_CONFIG[feature]
}

// Função para log de performance durante testes
export function logOptimizationPerformance(
  component: string, 
  operation: string, 
  duration: number, 
  success: boolean, 
  metadata?: any
) {
  if (!OPTIMIZATION_CONFIG.ENABLE_PERFORMANCE_LOGS) return
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    component,
    operation,
    duration,
    success,
    metadata
  }
  
  console.log(`[OPTIMIZATION] ${component}.${operation}:`, logEntry)
  
  // Em produção, enviar para analytics
  if (typeof window !== 'undefined' && OPTIMIZATION_CONFIG.ENABLE_METRICS_COLLECTION) {
    // Salvar métricas localmente para análise
    const metrics = JSON.parse(localStorage.getItem('optimization_metrics') || '[]')
    metrics.push(logEntry)
    
    // Manter apenas últimas 100 métricas
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100)
    }
    
    localStorage.setItem('optimization_metrics', JSON.stringify(metrics))
  }
}

// Função para obter métricas coletadas
export function getOptimizationMetrics() {
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem('optimization_metrics') || '[]')
}

// Função para limpar métricas
export function clearOptimizationMetrics() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('optimization_metrics')
  }
} 