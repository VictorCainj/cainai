// Optimization utilities

export function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle(func: Function, limit: number) {
  let inThrottle: boolean
  return (...args: any[]) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

export class PerformanceTimer {
  private timers: Map<string, number> = new Map()
  
  start(name: string): void {
    this.timers.set(name, performance.now())
  }
  
  end(name: string): number | null {
    const startTime = this.timers.get(name)
    if (!startTime) return null
    
    const duration = performance.now() - startTime
    this.timers.delete(name)
    
    return Math.round(duration * 100) / 100
  }
}

export const performanceTimer = new PerformanceTimer() 