import { NextRequest, NextResponse } from 'next/server'
import { chatService } from '@/lib/chat-service'
import { sessionManager } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || sessionManager.getUserId()

    if (!userId) {
      return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })
    }

    console.log('Buscando conversas para usuário:', userId)

    // Usar o serviço de chat para buscar conversas
    const conversations = await chatService.getUserConversations(userId)

    console.log(`Encontradas ${conversations.length} conversas`)

    return NextResponse.json({
      conversations,
      success: true
    })

  } catch (error) {
    console.error('Erro na API de conversas:', error)
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