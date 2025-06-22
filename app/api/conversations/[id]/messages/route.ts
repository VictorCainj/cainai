import { NextRequest, NextResponse } from 'next/server'
import { chatService } from '@/lib/chat-service'
import { sessionManager } from '@/lib/session'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || sessionManager.getUserId()
    const conversationId = params.id

    if (!userId || !conversationId) {
      return NextResponse.json({ error: 'userId e conversationId são obrigatórios' }, { status: 400 })
    }

    const result = await chatService.getConversationWithMessages(conversationId, userId)
    
    if (!result.conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      conversation: result.conversation,
      messages: result.messages,
      success: true
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: errorMessage
      },
      { status: 500 }
    )
  }
} 