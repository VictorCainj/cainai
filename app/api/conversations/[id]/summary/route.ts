import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const conversationId = params.id

    if (!userId || !conversationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId e conversationId são obrigatórios' 
      }, { status: 400 })
    }

    // Buscar resumo existente
    const { data: summary, error: summaryError } = await supabase
      .from('conversation_summaries')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single()

    if (summaryError && summaryError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Erro ao buscar resumo:', summaryError)
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao buscar resumo' 
      }, { status: 500 })
    }

    if (!summary) {
      return NextResponse.json({
        success: true,
        summary: null,
        message: 'Nenhum resumo encontrado'
      })
    }

    // Formatar dados do resumo
    const formattedSummary = {
      id: summary.id,
      conversationId: summary.conversation_id,
      summaryText: summary.summary_text,
      timeline: summary.timeline || [],
      sentiment: summary.sentiment,
      generatedAt: summary.generated_at
    }

    return NextResponse.json({
      success: true,
      summary: formattedSummary
    })

  } catch (error) {
    console.error('Erro na API de resumo:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}