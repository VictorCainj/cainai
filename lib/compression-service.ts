interface CompressionStats {
  originalSize: number
  compressedSize: number
  compressionRatio: number
  algorithm: string
}

interface CompressedData {
  data: string
  compressed: boolean
  algorithm: string
  originalSize: number
  compressedSize: number
}

class CompressionService {
  private config = {
    minSizeForCompression: 512, // bytes
    enableCompression: true,
    algorithm: 'lz-string' // ou 'gzip', 'deflate'
  }

  private stats = {
    totalOriginalBytes: 0,
    totalCompressedBytes: 0,
    compressionsSaved: 0,
    avgCompressionRatio: 0
  }

  // Configurar compressão
  configure(options: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...options }
  }

  // Verificar se deve comprimir baseado no tamanho
  private shouldCompress(data: string): boolean {
    if (!this.config.enableCompression) return false
    return new Blob([data]).size >= this.config.minSizeForCompression
  }

  // Comprimir dados usando algoritmo selecionado
  compress(data: string): CompressedData {
    const originalSize = new Blob([data]).size

    if (!this.shouldCompress(data)) {
      return {
        data,
        compressed: false,
        algorithm: 'none',
        originalSize,
        compressedSize: originalSize
      }
    }

    try {
      let compressed: string
      let algorithm: string

      // Implementação baseada no algoritmo configurado
      switch (this.config.algorithm) {
        case 'lz-string':
          compressed = this.compressLZString(data)
          algorithm = 'lz-string'
          break
        case 'simple':
          compressed = this.compressSimple(data)
          algorithm = 'simple'
          break
        default:
          compressed = data
          algorithm = 'none'
      }

      const compressedSize = new Blob([compressed]).size
      
      // Só usar compressão se realmente economizar espaço
      if (compressedSize >= originalSize * 0.9) {
        return {
          data,
          compressed: false,
          algorithm: 'none',
          originalSize,
          compressedSize: originalSize
        }
      }

      // Atualizar estatísticas
      this.updateStats(originalSize, compressedSize)

      return {
        data: compressed,
        compressed: true,
        algorithm,
        originalSize,
        compressedSize
      }

    } catch (error) {
      console.warn('Erro na compressão, usando dados originais:', error)
      return {
        data,
        compressed: false,
        algorithm: 'error',
        originalSize,
        compressedSize: originalSize
      }
    }
  }

  // Descomprimir dados
  decompress(compressedData: CompressedData): string {
    if (!compressedData.compressed) {
      return compressedData.data
    }

    try {
      switch (compressedData.algorithm) {
        case 'lz-string':
          return this.decompressLZString(compressedData.data)
        case 'simple':
          return this.decompressSimple(compressedData.data)
        default:
          return compressedData.data
      }
    } catch (error) {
      console.error('Erro na descompressão:', error)
      throw new Error('Falha ao descomprimir dados')
    }
  }

  // Implementação LZ-String (se disponível)
  private compressLZString(data: string): string {
    if (typeof window !== 'undefined' && (window as any).LZString) {
      return (window as any).LZString.compress(data)
    }
    
    // Fallback para compressão simples
    return this.compressSimple(data)
  }

  private decompressLZString(data: string): string {
    if (typeof window !== 'undefined' && (window as any).LZString) {
      return (window as any).LZString.decompress(data)
    }
    
    // Fallback para descompressão simples
    return this.decompressSimple(data)
  }

  // Compressão simples (apenas demonstrativa)
  private compressSimple(data: string): string {
    // Compressão muito básica - apenas para exemplo
    // Em produção seria melhor usar uma biblioteca real
    
    // Remover espaços duplos e quebras de linha desnecessárias
    let compressed = data
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim()

    // Substituir sequências comuns por códigos mais curtos
    const commonPatterns = [
      ['```', '§1§'],
      ['**', '§2§'],
      ['##', '§3§'],
      ['- ', '§4§'],
      ['\n', '§5§']
    ]

    commonPatterns.forEach(([pattern, code]) => {
      compressed = compressed.split(pattern).join(code)
    })

    return compressed
  }

  private decompressSimple(data: string): string {
    // Reverter a compressão simples
    let decompressed = data

    const commonPatterns = [
      ['§1§', '```'],
      ['§2§', '**'],
      ['§3§', '##'],
      ['§4§', '- '],
      ['§5§', '\n']
    ]

    commonPatterns.forEach(([code, pattern]) => {
      decompressed = decompressed.split(code).join(pattern)
    })

    return decompressed
  }

  // Atualizar estatísticas de compressão
  private updateStats(originalSize: number, compressedSize: number): void {
    this.stats.totalOriginalBytes += originalSize
    this.stats.totalCompressedBytes += compressedSize
    this.stats.compressionsSaved++
    
    this.stats.avgCompressionRatio = 
      (this.stats.totalCompressedSize / this.stats.totalOriginalBytes) * 100
  }

  // Obter estatísticas de performance
  getStats(): typeof this.stats & { 
    spaceSavedBytes: number
    spaceSavedPercentage: number
  } {
    const spaceSavedBytes = this.stats.totalOriginalBytes - this.stats.totalCompressedBytes
    const spaceSavedPercentage = this.stats.totalOriginalBytes > 0 
      ? (spaceSavedBytes / this.stats.totalOriginalBytes) * 100 
      : 0

    return {
      ...this.stats,
      spaceSavedBytes,
      spaceSavedPercentage: Math.round(spaceSavedPercentage * 100) / 100
    }
  }

  // Comprimir mensagem para armazenamento
  compressMessage(content: string, metadata?: any): CompressedData {
    const messageData = JSON.stringify({
      content,
      metadata: metadata || {}
    })

    return this.compress(messageData)
  }

  // Descomprimir mensagem
  decompressMessage(compressedData: CompressedData): { content: string, metadata?: any } {
    const decompressed = this.decompress(compressedData)
    
    try {
      const parsed = JSON.parse(decompressed)
      return {
        content: parsed.content,
        metadata: parsed.metadata
      }
    } catch (error) {
      // Se falhar na parse, assumir que é conteúdo simples
      return { content: decompressed }
    }
  }

  // Resetar estatísticas
  resetStats(): void {
    this.stats = {
      totalOriginalBytes: 0,
      totalCompressedBytes: 0,
      compressionsSaved: 0,
      avgCompressionRatio: 0
    }
  }
}

// Singleton
export const compressionService = new CompressionService()

// Funções utilitárias para uso direto
export function compressData(data: string): CompressedData {
  return compressionService.compress(data)
}

export function decompressData(compressedData: CompressedData): string {
  return compressionService.decompress(compressedData)
}