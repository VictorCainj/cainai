import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface ConversationData {
  id: string
  title: string
  created_at: string
  updated_at: string
  messages: Array<{
    role: string
    content: string
    created_at: string
  }>
}

interface ThemeGroup {
  theme: string
  count: number
  conversations: Array<{
    id: string
    title: string
    mainTheme: string
    topics: string[]
    date: string
    messageCount: number
    keywords: string[]
    sentiment: 'positive' | 'neutral' | 'negative'
  }>
  trend: 'up' | 'down' | 'stable'
  color: string
}

// Cores para os temas
const themeColors = [
  '#3B82F6', '#8B5CF6', '#EF4444', '#10B981', '#F59E0B',
  '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#84CC16'
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const period = searchParams.get('period') || '30d'

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId é obrigatório' 
      }, { status: 400 })
    }

    // Calcular data limite baseada no período
    const now = new Date()
    let dateLimit = new Date()
    
    switch (period) {
      case '7d':
        dateLimit.setDate(now.getDate() - 7)
        break
      case '30d':
        dateLimit.setDate(now.getDate() - 30)
        break
      case '90d':
        dateLimit.setDate(now.getDate() - 90)
        break
      case 'all':
        dateLimit = new Date('2020-01-01') // Data muito antiga para pegar todas
        break
      default:
        dateLimit.setDate(now.getDate() - 30)
    }

    // Buscar conversas do período
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        messages (
          role,
          content,
          created_at
        )
      `)
      .eq('user_id', userId)
      .gte('updated_at', dateLimit.toISOString())
      .order('updated_at', { ascending: false })
      .limit(50) // Limitar a 50 conversas para análise

    if (conversationsError) {
      console.error('Erro ao buscar conversas:', conversationsError)
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao buscar conversas' 
      }, { status: 500 })
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        success: true,
        themeGroups: [],
        totalConversations: 0
      })
    }

    // Analisar conversas e extrair temas
    const themeGroups = await analyzeConversationsForThemes(conversations as ConversationData[])

    return NextResponse.json({
      success: true,
      themeGroups,
      totalConversations: conversations.length
    })

  } catch (error) {
    console.error('Erro na API de resumo:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

async function analyzeConversationsForThemes(conversations: ConversationData[]): Promise<ThemeGroup[]> {
  try {
    // Preparar dados para análise
    const conversationTexts = conversations.map(conv => {
      const userMessages = conv.messages
        ?.filter(msg => msg.role === 'user')
        ?.map(msg => msg.content)
        ?.join(' ') || ''
      
      return {
        id: conv.id,
        title: conv.title,
        text: userMessages,
        date: new Date(conv.updated_at).toLocaleDateString('pt-BR'),
        messageCount: conv.messages?.length || 0,
        created_at: conv.created_at
      }
    }).filter(conv => conv.text.length > 10) // Filtrar conversas muito pequenas

    if (conversationTexts.length === 0) {
      return []
    }

    // Análise simples de temas baseada em palavras-chave comuns
    const themes = extractThemesFromTexts(conversationTexts)
    
    // Agrupar conversas por temas
    const themeGroups: ThemeGroup[] = []
    let colorIndex = 0

    for (const [theme, convList] of Object.entries(themes)) {
      if (convList.length > 0) {
        const conversationSummaries = convList.map(conv => ({
          id: conv.id,
          title: conv.title || 'Conversa sem título',
          mainTheme: theme,
          topics: extractTopicsFromText(conv.text),
          date: conv.date,
          messageCount: conv.messageCount,
          keywords: extractKeywordsFromText(conv.text),
          sentiment: analyzeSentiment(conv.text)
        }))

        themeGroups.push({
          theme,
          count: convList.length,
          conversations: conversationSummaries,
          trend: calculateTrend(convList), // Análise de tendência baseada em datas
          color: themeColors[colorIndex % themeColors.length]
        })

        colorIndex++
      }
    }

    // Ordenar por número de conversas (mais relevantes primeiro)
    return themeGroups.sort((a, b) => b.count - a.count).slice(0, 8) // Máximo 8 temas

  } catch (error) {
    console.error('Erro na análise de temas:', error)
    return []
  }
}

function extractThemesFromTexts(conversations: any[]): Record<string, any[]> {
  const themes: Record<string, any[]> = {}

  // Palavras-chave para diferentes temas
  const themeKeywords = {
    'Programação & Desenvolvimento': ['código', 'programação', 'desenvolvimento', 'javascript', 'python', 'react', 'api', 'função', 'bug', 'algoritmo', 'database', 'frontend', 'backend'],
    'Design & UI/UX': ['design', 'interface', 'ux', 'ui', 'layout', 'cores', 'tipografia', 'usuário', 'experiência', 'prototipo', 'figma'],
    'Inteligência Artificial': ['ia', 'inteligência artificial', 'machine learning', 'gpt', 'chatbot', 'automação', 'neural', 'modelo', 'treinamento'],
    'Negócios & Estratégia': ['negócio', 'estratégia', 'marketing', 'vendas', 'cliente', 'mercado', 'produto', 'empresa', 'lucro', 'crescimento'],
    'Tecnologia & Infraestrutura': ['servidor', 'cloud', 'aws', 'docker', 'kubernetes', 'deploy', 'infraestrutura', 'banco de dados', 'performance'],
    'Educação & Aprendizado': ['aprender', 'estudar', 'curso', 'tutorial', 'ensinar', 'explicar', 'conceito', 'conhecimento', 'skill'],
    'Criatividade & Conteúdo': ['criar', 'conteúdo', 'criativo', 'ideia', 'brainstorm', 'inovação', 'artístico', 'escrita', 'storytelling'],
    'Análise & Dados': ['dados', 'análise', 'relatório', 'estatística', 'métrica', 'dashboard', 'insight', 'tendência', 'gráfico'],
    'Problemas & Soluções': ['problema', 'solução', 'erro', 'ajuda', 'resolver', 'corrigir', 'dúvida', 'suporte', 'troubleshoot'],
    'Geral & Conversas': ['como', 'qual', 'quando', 'onde', 'porque', 'explicar', 'diferença', 'melhor', 'recomendação']
  }

  conversations.forEach(conv => {
    const text = conv.text.toLowerCase()
    let bestMatch = 'Geral & Conversas'
    let maxScore = 0

    // Encontrar o tema com mais matches
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      const score = keywords.reduce((acc, keyword) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
        const matches = text.match(regex)
        return acc + (matches ? matches.length : 0)
      }, 0)

      if (score > maxScore) {
        maxScore = score
        bestMatch = theme
      }
    })

    if (!themes[bestMatch]) {
      themes[bestMatch] = []
    }
    themes[bestMatch].push(conv)
  })

  return themes
}

function extractTopicsFromText(text: string): string[] {
  const words = text.toLowerCase().match(/\b\w+\b/g) || []
  const topicWords = words.filter(word => 
    word.length > 4 && 
    !['como', 'quando', 'onde', 'porque', 'qual', 'pode', 'fazer', 'quero', 'preciso'].includes(word)
  )
  
  // Contar frequência e retornar os mais comuns
  const frequency: Record<string, number> = {}
  topicWords.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1
  })

  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([word]) => word)
}

function extractKeywordsFromText(text: string): string[] {
  const words = text.toLowerCase().match(/\b\w+\b/g) || []
  const keywords = words.filter(word => 
    word.length > 3 && 
    !['como', 'para', 'que', 'com', 'uma', 'sobre', 'mais', 'pode', 'ter'].includes(word)
  )
  
  const frequency: Record<string, number> = {}
  keywords.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1
  })

  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([word]) => word)
}

function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['bom', 'ótimo', 'excelente', 'legal', 'funciona', 'sucesso', 'obrigado', 'perfeito']
  const negativeWords = ['ruim', 'erro', 'problema', 'não funciona', 'bug', 'falha', 'difícil', 'complicado']
  
  const lowerText = text.toLowerCase()
  const positiveCount = positiveWords.reduce((count, word) => 
    count + (lowerText.includes(word) ? 1 : 0), 0)
  const negativeCount = negativeWords.reduce((count, word) => 
    count + (lowerText.includes(word) ? 1 : 0), 0)

  if (positiveCount > negativeCount) return 'positive'
  if (negativeCount > positiveCount) return 'negative'
  return 'neutral'
}

function calculateTrend(conversations: any[]): 'up' | 'down' | 'stable' {
  if (conversations.length < 2) return 'stable'
  
  const sorted = conversations.sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  
  const midPoint = Math.floor(sorted.length / 2)
  const recentCount = sorted.slice(midPoint).length
  const olderCount = sorted.slice(0, midPoint).length
  
  if (recentCount > olderCount * 1.2) return 'up'
  if (recentCount < olderCount * 0.8) return 'down'
  return 'stable'
}