import { NextRequest, NextResponse } from 'next/server'
import { chatService } from '@/lib/chat-service'
import { sessionManager } from '@/lib/session'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const providedUserId = searchParams.get('userId')
    
    // Tentar obter usuário autenticado do Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // IMPORTANTE: API deve sempre receber userId do frontend
    // sessionManager não funciona no servidor (sem localStorage)
    const userId = user?.id || providedUserId

    if (!userId) {
      return NextResponse.json({ 
        error: 'userId é obrigatório - deve ser fornecido pelo frontend',
        suggestion: 'Passe ?userId=<seu-id> na URL'
      }, { status: 400 })
    }

    // Consulta direta ao banco - SIMPLES E DIRETA
    const { data: conversations, error } = await supabase
      .from('chat_conversations')
      .select(`
        id,
        user_id,
        title,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Erro ao buscar conversas:', error)
      return NextResponse.json({ 
        error: 'Erro ao buscar conversas: ' + error.message,
        success: false
      }, { status: 500 })
    }

    // Buscar estatísticas de mensagens para cada conversa
    const conversationsWithStats = await Promise.all(
      (conversations || []).map(async (conv) => {
        try {
          // Buscar última mensagem e contagem
          const { data: lastMessage } = await supabase
            .from('chat_messages')
            .select('content, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)

          return {
            ...conv,
            message_count: count || 0,
            last_message: lastMessage?.content?.slice(0, 100) || 'Sem mensagens',
            last_message_time: lastMessage?.created_at
          }
        } catch (statsError) {
          // Se falhar, retornar dados básicos
          return {
            ...conv,
            message_count: 0,
            last_message: 'Sem mensagens',
            last_message_time: undefined
          }
        }
      })
    )

    return NextResponse.json({
      conversations: conversationsWithStats,
      success: true,
      debug: {
        userId,
        source: user ? 'auth' : 'session',
        totalFound: conversationsWithStats.length
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: errorMessage,
        conversations: [] // Retornar array vazio em caso de erro
      },
      { status: 500 }
    )
  }
} 