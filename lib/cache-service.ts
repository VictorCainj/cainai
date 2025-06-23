interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
  compressed?: boolean
  size: number
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  itemCount: number
}

interface CacheConfig {
  maxSize: number // em bytes
  defaultTTL: number // em ms
  compressionThreshold: number // em bytes
  enableCompression: boolean
}

class CacheService {
  private cache = new Map<string, CacheItem<any>>()
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, itemCount: 0 }
  private config: CacheConfig = {
    maxSize: 50 * 1024 * 1024, // 50MB
    defaultTTL: 5 * 60 * 1000, // 5 minutos
    compressionThreshold: 1024, // 1KB
    enableCompression: true
  }

  // Compressor simples usando JSON.stringify + LZ-string
  private compress(data: any): string {
    const jsonString = JSON.stringify(data)
    
    // Implementação simples de compressão (pode ser substituída por LZ-string)
    if (typeof window !== 'undefined' && (window as any).LZString) {
      return (window as any).LZString.compress(jsonString)
    }
    
    // Fallback: apenas retorna a string normal
    return jsonString
  }

  private decompress(compressed: string): any {
    if (typeof window !== 'undefined' && (window as any).LZString) {
      const decompressed = (window as any).LZString.decompress(compressed)
      return JSON.parse(decompressed)
    }
    
    return JSON.parse(compressed)
  }

  private getItemSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size
  }

  private evictOldest() {
    let oldestKey = ''
    let oldestTime = Date.now()

    Array.from(this.cache.entries()).forEach(([key, item]) => {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp
        oldestKey = key
      }
    })

    if (oldestKey) {
      this.delete(oldestKey)
    }
  }

  private cleanup() {
    const now = Date.now()
    const keysToDelete: string[] = []

    Array.from(this.cache.entries()).forEach(([key, item]) => {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.delete(key))

    // Verificar tamanho total
    while (this.stats.size > this.config.maxSize) {
      this.evictOldest()
    }
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const itemTTL = ttl || this.config.defaultTTL
    const size = this.getItemSize(data)
    
    // Limpar primeiro
    this.cleanup()

    let finalData: any = data
    let compressed = false

    // Comprimir se necessário e habilitado
    if (this.config.enableCompression && size > this.config.compressionThreshold) {
      try {
        finalData = this.compress(data)
        compressed = true
      } catch (error) {
        // Se falhar na compressão, usar dados originais
        finalData = data
      }
    }

    const item: CacheItem<T> = {
      data: finalData,
      timestamp: Date.now(),
      ttl: itemTTL,
      compressed,
      size
    }

    // Remover item existente se houver
    if (this.cache.has(key)) {
      this.delete(key)
    }

    this.cache.set(key, item)
    this.stats.size += size
    this.stats.itemCount++
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      this.stats.misses++
      return null
    }

    // Verificar se expirou
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key)
      this.stats.misses++
      return null
    }

    this.stats.hits++

    // Descomprimir se necessário
    if (item.compressed) {
      try {
        return this.decompress(item.data)
      } catch (error) {
        console.warn('Erro ao descomprimir cache:', error)
        this.delete(key)
        return null
      }
    }

    return item.data
  }

  delete(key: string): boolean {
    const item = this.cache.get(key)
    
    if (item) {
      this.stats.size -= item.size
      this.stats.itemCount--
      this.cache.delete(key)
      return true
    }
    
    return false
  }

  invalidatePattern(pattern: RegExp): number {
    let count = 0
    const keysToDelete: string[] = []

    Array.from(this.cache.keys()).forEach(key => {
      if (pattern.test(key)) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => {
      this.delete(key)
      count++
    })

    return count
  }

  // Invalidar caches relacionados a conversas
  invalidateConversation(conversationId: string): void {
    this.invalidatePattern(new RegExp(`conversation_${conversationId}|messages_${conversationId}`))
  }

  // Invalidar caches de lista de conversas para um usuário
  invalidateUserConversations(userId: string): void {
    this.invalidatePattern(new RegExp(`user_conversations_${userId}`))
  }

  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, size: 0, itemCount: 0 }
  }

  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    }
  }

  configure(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // Métodos específicos para o sistema de chat
  async cacheConversations(userId: string, conversations: any[], ttl?: number): Promise<void> {
    const key = `user_conversations_${userId}`
    this.set(key, conversations, ttl)
  }

  async getCachedConversations(userId: string): Promise<any[] | null> {
    const key = `user_conversations_${userId}`
    return this.get(key)
  }

  async cacheMessages(conversationId: string, messages: any[], ttl?: number): Promise<void> {
    const key = `messages_${conversationId}`
    this.set(key, messages, ttl)
  }

  async getCachedMessages(conversationId: string): Promise<any[] | null> {
    const key = `messages_${conversationId}`
    return this.get(key)
  }

  async cacheConversationMeta(conversationId: string, meta: any, ttl?: number): Promise<void> {
    const key = `conversation_${conversationId}`
    this.set(key, meta, ttl)
  }

  async getCachedConversationMeta(conversationId: string): Promise<any | null> {
    const key = `conversation_${conversationId}`
    return this.get(key)
  }
}

// Singleton
export const cacheService = new CacheService()

// Auto-limpeza a cada 2 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    cacheService['cleanup']()
  }, 2 * 60 * 1000)
} 