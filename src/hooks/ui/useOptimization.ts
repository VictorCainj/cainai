import { useCallback, useMemo } from 'react'
import { debounce, throttle, performanceTimer } from '../../utils/optimization'

/**
 * Hook para otimizações de performance
 */
export function useOptimization() {
  
  // Função debounced
  const useDebouncedCallback = useCallback((
    callback: Function, 
    delay: number, 
    deps: any[]
  ) => {
    return useMemo(
      () => debounce(callback, delay),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [...deps, delay]
    )
  }, [])

  // Função throttled
  const useThrottledCallback = useCallback((
    callback: Function, 
    limit: number, 
    deps: any[]
  ) => {
    return useMemo(
      () => throttle(callback, limit),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [...deps, limit]
    )
  }, [])

  // Timer de performance
  const measurePerformance = useCallback((name: string, fn: () => void) => {
    performanceTimer.start(name)
    fn()
    const duration = performanceTimer.end(name)
    
    if (process.env.NODE_ENV === 'development' && duration) {
      console.log(`⚡ Performance [${name}]: ${duration}ms`)
    }
    
    return duration
  }, [])

  return {
    useDebouncedCallback,
    useThrottledCallback,
    measurePerformance
  }
} 