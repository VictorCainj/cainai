import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface Message {
  role: string
  content: string
  created_at: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await request.json()
    const conversationId = params.id

    if (!userId || !conversationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId e conversationId são obrigatórios' 
      }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'Chave da OpenAI não configurada' 
      }, { status: 500 })
    }

    // Buscar dados da conversa
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, title, created_at, user_id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ 
        success: false, 
        error: 'Conversa não encontrada' 
      }, { status: 404 })
    }

    // Buscar mensagens da conversa
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (messagesError || !messages) {
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao buscar mensagens da conversa' 
      }, { status: 500 })
    }
    
    if (!messages || messages.length < 2) {
      return NextResponse.json({ 
        success: false, 
        error: 'Conversa muito pequena para gerar resumo' 
      }, { status: 400 })
    }

    // Preparar texto da conversa para análise
    const conversationText = messages
      .map(msg => `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content}`)
      .join('\n\n')

    // Gerar resumo usando GPT-4
    const summaryResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Você é um assistente especializado em criar cronologias de conversas. 
          
          Analise a conversa fornecida e crie uma cronologia organizada seguindo este formato JSON:
          {
            "summaryText": "Breve contextualização da conversa em 1-2 frases",
            "timeline": [
              {
                "time": "HH:MM",
                "period": "manhã|tarde|noite",
                "action": "descrição do que foi feito neste momento"
              }
            ],
            "sentiment": "positive|neutral|negative"
          }
          
          Diretrizes:
          - Foque APENAS no que foi feito cronologicamente
          - Organize por horários (extraia dos timestamps das mensagens)
          - Cada entrada da timeline deve ser uma ação/evento específico
          - Use períodos do dia (manhã, tarde, noite) para contextualizar
          - Seja conciso mas informativo sobre cada ação
          - Mantenha ordem cronológica rigorosa
          - Responda APENAS com o JSON válido, sem texto adicional`
        },
        {
          role: 'user',
          content: `Analise esta conversa e gere uma cronologia de ações por horário:\n\n${conversationText}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })

    const aiResponse = summaryResponse.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('Resposta vazia da OpenAI')
    }

    // Parse da resposta JSON
    let summaryData
    try {
      summaryData = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('Erro ao fazer parse da resposta:', parseError)
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao processar resposta da IA' 
      }, { status: 500 })
    }

    // Validar estrutura da resposta
    if (!summaryData.summaryText || !Array.isArray(summaryData.timeline)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Formato de resposta inválido da IA' 
      }, { status: 500 })
    }

    // Salvar ou atualizar resumo no banco
    const summaryRecord = {
      conversation_id: conversationId,
      user_id: userId,
      summary_text: summaryData.summaryText,
      timeline: summaryData.timeline || [],
      sentiment: summaryData.sentiment || 'neutral',
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Tentar atualizar primeiro, se não existir, criar
    const { data: existingSummary } = await supabase
      .from('conversation_summaries')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single()

    let savedSummary
    if (existingSummary) {
      // Atualizar resumo existente
      const { data, error } = await supabase
        .from('conversation_summaries')
        .update(summaryRecord)
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao atualizar resumo:', error)
        
        // Log detalhado para debugging
        if (error.code === '42501') {
          console.error('❌ ERRO RLS: Execute: ALTER TABLE conversation_summaries DISABLE ROW LEVEL SECURITY;')
        }
        
        return NextResponse.json({ 
          success: false, 
          error: 'Erro ao salvar resumo atualizado',
          details: error.message,
          code: error.code
        }, { status: 500 })
      }
      savedSummary = data
    } else {
      // Criar novo resumo
      const { data, error } = await supabase
        .from('conversation_summaries')
        .insert(summaryRecord)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao criar resumo:', error)
        
        // Log detalhado para debugging
        if (error.code === '42501') {
          console.error('❌ ERRO RLS: Execute: ALTER TABLE conversation_summaries DISABLE ROW LEVEL SECURITY;')
        }
        
        return NextResponse.json({ 
          success: false, 
          error: 'Erro ao salvar novo resumo',
          details: error.message,
          code: error.code
        }, { status: 500 })
      }
      savedSummary = data
    }

    // Formatar resposta
    const formattedSummary = {
      id: savedSummary.id,
      conversationId: savedSummary.conversation_id,
      summaryText: savedSummary.summary_text,
      timeline: savedSummary.timeline || [],
      sentiment: savedSummary.sentiment,
      generatedAt: savedSummary.generated_at
    }

    return NextResponse.json({
      success: true,
      summary: formattedSummary,
      message: existingSummary ? 'Resumo atualizado com sucesso' : 'Resumo gerado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao gerar resumo:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}