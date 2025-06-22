interface Context7Config {
  enabled: boolean
  maxTokens: number
  libraries: string[]
}

interface LibraryDocumentation {
  libraryId: string
  libraryName: string
  documentation: string
  version?: string
  relevantTopics?: string[]
}

interface Context7Response {
  success: boolean
  documentation?: LibraryDocumentation[]
  error?: string
  tokensUsed?: number
}

class Context7Service {
  private static instance: Context7Service
  private config: Context7Config = {
    enabled: true,
    maxTokens: 5000,
    libraries: []
  }

  public static getInstance(): Context7Service {
    if (!Context7Service.instance) {
      Context7Service.instance = new Context7Service()
    }
    return Context7Service.instance
  }

  /**
   * Detecta bibliotecas/frameworks mencionados na mensagem do usuário
   */
  private detectLibraries(message: string): string[] {
    const commonLibraries = [
      'react', 'nextjs', 'next.js', 'vue', 'angular', 'express', 'fastapi',
      'django', 'flask', 'spring', 'laravel', 'rails', 'mongodb', 'postgresql',
      'mysql', 'redis', 'docker', 'kubernetes', 'typescript', 'javascript',
      'python', 'java', 'go', 'rust', 'php', 'nodejs', 'node.js',
      'tailwind', 'bootstrap', 'material-ui', 'antd', 'chakra-ui',
      'prisma', 'mongoose', 'sequelize', 'typeorm', 'supabase',
      'firebase', 'aws', 'azure', 'gcp', 'vercel', 'netlify'
    ]

    const detectedLibraries: string[] = []
    const lowerMessage = message.toLowerCase()

    for (const lib of commonLibraries) {
      if (lowerMessage.includes(lib)) {
        detectedLibraries.push(lib)
      }
    }

    // Detecção adicional de padrões como "como usar X" ou "problemas com Y"
    const patterns = [
      /como usar ([a-zA-Z0-9\-.]+)/gi,
      /problemas? com ([a-zA-Z0-9\-.]+)/gi,
      /erro no? ([a-zA-Z0-9\-.]+)/gi,
      /configurar ([a-zA-Z0-9\-.]+)/gi,
      /instalar ([a-zA-Z0-9\-.]+)/gi,
      /implementar ([a-zA-Z0-9\-.]+)/gi,
      /integrar ([a-zA-Z0-9\-.]+)/gi
    ]

    for (const pattern of patterns) {
      const matches = Array.from(message.matchAll(pattern))
      for (const match of matches) {
        if (match[1] && match[1].length > 2) {
          detectedLibraries.push(match[1].toLowerCase())
        }
      }
    }

    return Array.from(new Set(detectedLibraries)) // Remove duplicatas
  }

  /**
   * Busca documentação usando Context7 MCP
   */
  async getLibraryDocumentation(
    libraries: string[], 
    topic?: string
  ): Promise<Context7Response> {
    if (!this.config.enabled || libraries.length === 0) {
      return { success: false, error: 'Context7 desabilitado ou nenhuma biblioteca detectada' }
    }

    try {
      const documentationResults: LibraryDocumentation[] = []
      let totalTokensUsed = 0

      // Simular chamadas para Context7 MCP (na implementação real, usaria a biblioteca oficial)
      for (const library of libraries) {
        try {
          // Esta seria a chamada real para Context7
          const docs = await this.fetchLibraryDocs(library, topic)
          if (docs) {
            documentationResults.push(docs)
            totalTokensUsed += docs.documentation.length * 0.25 // Estimativa de tokens
            
            // Limitar tokens para não sobrecarregar o contexto
            if (totalTokensUsed > this.config.maxTokens) {
              break
            }
          }
        } catch (error) {
          console.warn(`Erro ao buscar docs para ${library}:`, error)
          continue
        }
      }

      return {
        success: true,
        documentation: documentationResults,
        tokensUsed: totalTokensUsed
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }

  /**
   * Simula a busca de documentação (substituir pela implementação real do Context7)
   */
  private async fetchLibraryDocs(
    library: string, 
    topic?: string
  ): Promise<LibraryDocumentation | null> {
    // Simulação - na implementação real, seria algo assim:
    // const context7 = new Context7Client()
    // const docs = await context7.getLibraryDocs(library, { topic, tokens: 1000 })
    
    // Por enquanto, retornamos documentação básica para bibliotecas conhecidas
    const knownLibraries: Record<string, LibraryDocumentation> = {
      'react': {
        libraryId: 'react',
        libraryName: 'React',
        documentation: `React é uma biblioteca JavaScript para construir interfaces de usuário.

**Conceitos principais:**
- Componentes funcionais e hooks
- State management com useState
- Efeitos com useEffect
- Props e children

**Exemplo básico:**
\`\`\`jsx
import React, { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  
  return (
    <div>
      <p>Você clicou {count} vezes</p>
      <button onClick={() => setCount(count + 1)}>
        Clique aqui
      </button>
    </div>
  )
}
\`\`\`

**Boas práticas:**
- Use componentes funcionais com hooks
- Mantenha o estado local quando possível
- Use memo() para otimização quando necessário`,
        version: '18.x'
      },
      'nextjs': {
        libraryId: 'nextjs',
        libraryName: 'Next.js',
        documentation: `Next.js é um framework React para produção.

**Recursos principais:**
- Roteamento baseado em arquivos
- Renderização server-side (SSR)
- Geração estática (SSG)
- API Routes
- Otimização automática

**Estrutura de projeto:**
\`\`\`
app/
  page.tsx      # Página inicial
  layout.tsx    # Layout raiz
  globals.css   # Estilos globais
  api/         # API routes
pages/         # Roteamento (legacy)
\`\`\`

**App Router (recomendado):**
\`\`\`tsx
// app/page.tsx
export default function Home() {
  return <h1>Página inicial</h1>
}

// app/about/page.tsx
export default function About() {
  return <h1>Sobre nós</h1>
}
\`\`\``,
        version: '14.x'
      },
      'tailwind': {
        libraryId: 'tailwindcss',
        libraryName: 'Tailwind CSS',
        documentation: `Tailwind CSS é um framework CSS utility-first.

**Conceitos principais:**
- Classes utilitárias
- Responsive design
- Dark mode
- Customização via config

**Exemplos comuns:**
\`\`\`html
<!-- Layout -->
<div class="flex items-center justify-center min-h-screen">
  <div class="bg-white p-6 rounded-lg shadow-lg">
    <h1 class="text-2xl font-bold text-gray-800 mb-4">Título</h1>
    <p class="text-gray-600">Conteúdo aqui</p>
  </div>
</div>

<!-- Botão -->
<button class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition">
  Clique aqui
</button>

<!-- Responsive -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- Grid responsivo -->
</div>
\`\`\``,
        version: '3.x'
      }
    }

    const normalizedLibrary = library.toLowerCase().replace(/[.\-]/g, '')
    return knownLibraries[normalizedLibrary] || null
  }

  /**
   * Formatar documentação para incluir no contexto do chat
   */
  formatDocumentationForContext(documentation: LibraryDocumentation[]): string {
    if (documentation.length === 0) {
      return ''
    }

    let context = '\n\n**📚 DOCUMENTAÇÃO CONTEXT7 ATUALIZADA:**\n\n'
    
    for (const doc of documentation) {
      context += `**${doc.libraryName}** ${doc.version ? `(v${doc.version})` : ''}:\n`
      context += doc.documentation + '\n\n'
    }

    context += '---\n\nUse estas informações atualizadas para fornecer respostas precisas e exemplos de código corretos.\n\n'
    
    return context
  }

  /**
   * Verifica se uma mensagem pode se beneficiar do Context7
   */
  shouldUseContext7(message: string): boolean {
    if (!this.config.enabled) return false

    const codeRelatedKeywords = [
      'como', 'implementar', 'criar', 'configurar', 'instalar', 'usar',
      'problema', 'erro', 'bug', 'não funciona', 'como fazer',
      'tutorial', 'exemplo', 'código', 'programar', 'desenvolver',
      'api', 'função', 'método', 'biblioteca', 'framework', 'package'
    ]

    const lowerMessage = message.toLowerCase()
    return codeRelatedKeywords.some(keyword => lowerMessage.includes(keyword))
  }

  /**
   * Configurações do Context7
   */
  updateConfig(newConfig: Partial<Context7Config>): void {
    this.config = { ...this.config, ...newConfig }
  }

  getConfig(): Context7Config {
    return { ...this.config }
  }

  /**
   * Processo principal: analisar mensagem e buscar documentação relevante
   */
  async processMessage(message: string): Promise<{
    documentation: string
    librariesDetected: string[]
    tokensUsed: number
  }> {
    if (!this.shouldUseContext7(message)) {
      return { documentation: '', librariesDetected: [], tokensUsed: 0 }
    }

    const libraries = this.detectLibraries(message)
    if (libraries.length === 0) {
      return { documentation: '', librariesDetected: libraries, tokensUsed: 0 }
    }

    const result = await this.getLibraryDocumentation(libraries)
    
    if (!result.success || !result.documentation) {
      return { documentation: '', librariesDetected: libraries, tokensUsed: 0 }
    }

    const formattedDocs = this.formatDocumentationForContext(result.documentation)
    
    return {
      documentation: formattedDocs,
      librariesDetected: libraries,
      tokensUsed: result.tokensUsed || 0
    }
  }
}

export const context7Service = Context7Service.getInstance() 