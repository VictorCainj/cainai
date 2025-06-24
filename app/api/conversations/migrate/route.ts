import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sessionManager } from '@/lib/session'

export async function POST(request: NextRequest) {
  try {
    const { fromUserId, toUserId } = await request.json()
    
    if (!fromUserId || !toUserId) {
      return NextResponse.json({
        success: false,
        error: 'fromUserId e toUserId são obrigatórios'
      }, { status: 400 })
    }

    // Verificar se há conversas para migrar
    const { data: conversationsToMigrate, error: checkError } = await supabase
      .from('chat_conversations')
      .select('id, title')
      .eq('user_id', fromUserId)

    if (checkError) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao verificar conversas: ' + checkError.message
      }, { status: 500 })
    }

    if (!conversationsToMigrate || conversationsToMigrate.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma conversa encontrada para migrar'
      }, { status: 404 })
    }

    // Migrar conversas
    const { error: migrateError } = await supabase
      .from('chat_conversations')
      .update({ user_id: toUserId })
      .eq('user_id', fromUserId)

    if (migrateError) {
      return NextResponse.json({
        success: false,
        error: 'Erro ao migrar conversas: ' + migrateError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${conversationsToMigrate.length} conversas migradas com sucesso`,
      migratedCount: conversationsToMigrate.length,
      conversations: conversationsToMigrate
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Buscar conversas órfãs (possíveis candidatas para migração)
    const currentUserId = sessionManager.getUserId()
    
    // Buscar todas as conversas que não são do usuário atual
    const { data: allConversations, error } = await supabase
      .from('chat_conversations')
      .select('id, title, user_id, created_at')
      .neq('user_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 })
    }

    // Agrupar por userId
    const userGroups: Record<string, any[]> = {}
    allConversations?.forEach(conv => {
      if (!userGroups[conv.user_id]) {
        userGroups[conv.user_id] = []
      }
      userGroups[conv.user_id].push(conv)
    })

    return NextResponse.json({
      success: true,
      currentUserId,
      orphanedConversations: userGroups,
      totalOrphaned: allConversations?.length || 0,
      message: 'Conversas disponíveis para migração'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
} 