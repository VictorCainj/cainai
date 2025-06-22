import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { fromUserId, toUserId } = await request.json()

    if (!fromUserId || !toUserId) {
      return NextResponse.json({ error: 'fromUserId e toUserId são obrigatórios' }, { status: 400 })
    }

    if (fromUserId === toUserId) {
      return NextResponse.json({ error: 'IDs de origem e destino não podem ser iguais' }, { status: 400 })
    }

    // Verificar se existem conversas para migrar
    const { data: conversationsToMigrate, error: checkError } = await supabase
      .from('chat_conversations')
      .select('id, title, created_at')
      .eq('user_id', fromUserId)

    if (checkError) {
      return NextResponse.json({
        success: false,
        error: `Erro ao verificar conversas: ${checkError.message}`
      }, { status: 500 })
    }

    if (!conversationsToMigrate || conversationsToMigrate.length === 0) {
      return NextResponse.json({
        success: true,
        migratedCount: 0,
        message: 'Nenhuma conversa para migrar'
      })
    }

    // Migrar as conversas
    const { error: migrationError } = await supabase
      .from('chat_conversations')
      .update({ 
        user_id: toUserId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', fromUserId)

    if (migrationError) {
      return NextResponse.json({
        success: false,
        error: `Erro na migração: ${migrationError.message}`
      }, { status: 500 })
    }

    // Verificar se a migração foi bem-sucedida
    const { data: migratedConversations, error: verifyError } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('user_id', toUserId)

    if (verifyError) {
      return NextResponse.json({
        success: false,
        error: `Erro na verificação: ${verifyError.message}`
      }, { status: 500 })
    }

    // Log da migração para auditoria
    try {
      await supabase
        .from('migration_logs')
        .insert({
          from_user_id: fromUserId,
          to_user_id: toUserId,
          conversations_migrated: conversationsToMigrate.length,
          migrated_at: new Date().toISOString()
        })
    } catch (logError) {
      // Falha no log não deve interromper o processo
      console.warn('Erro ao registrar log de migração:', logError)
    }

    return NextResponse.json({
      success: true,
      migratedCount: conversationsToMigrate.length,
      migratedConversations: conversationsToMigrate.map(c => ({
        id: c.id,
        title: c.title,
        created_at: c.created_at
      })),
      message: `${conversationsToMigrate.length} conversas migradas com sucesso`
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor',
        details: errorMessage
      },
      { status: 500 }
    )
  }
} 