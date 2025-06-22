import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const anonymousId = searchParams.get('anonymousId')
    const userId = searchParams.get('userId')

    if (!anonymousId || !userId) {
      return NextResponse.json({ error: 'anonymousId e userId são obrigatórios' }, { status: 400 })
    }

    // Buscar conversas que pertencem ao ID anônimo mas não estão acessíveis pelo usuário autenticado
    const { data: orphanedConversations, error } = await supabase
      .from('chat_conversations')
      .select('id, title, user_id, created_at, updated_at')
      .eq('user_id', anonymousId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar conversas órfãs:', error)
      return NextResponse.json({
        orphanedConversations: [],
        error: error.message
      }, { status: 500 })
    }

    // Contar mensagens para cada conversa órfã
    const conversationsWithCounts = await Promise.all(
      (orphanedConversations || []).map(async (conv) => {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)

        return {
          ...conv,
          message_count: count || 0
        }
      })
    )

    return NextResponse.json({
      orphanedConversations: conversationsWithCounts,
      anonymousId,
      userId,
      success: true
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: errorMessage,
        orphanedConversations: []
      },
      { status: 500 }
    )
  }
} 