import { NextRequest, NextResponse } from 'next/server'
import { chatService } from '@/lib/chat-service'
import { sessionManager } from '@/lib/session'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || sessionManager.getUserId()
    const conversationId = params.id

    if (!userId || !conversationId) {
      return NextResponse.json({ error: 'userId e conversationId são obrigatórios' }, { status: 400 })
    }

    console.log('Carregando mensagens da conversa:', conversationId, 'para usuário:', userId)

    // Usar o serviço de chat para buscar conversa e mensagens
    const result = await chatService.getConversationWithMessages(conversationId, userId)

    if (!result.conversation) {
      console.log('Conversa não encontrada ou não pertence ao usuário')
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
    }

    console.log(`Carregadas ${result.messages.length} mensagens`)

    return NextResponse.json({
      conversation: {
        id: result.conversation.id,
        title: result.conversation.title
      },
      messages: result.messages,
      success: true
    })

  } catch (error) {
    console.error('Erro na API de mensagens:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: errorMessage,
        conversation: null,
        messages: []
      },
      { status: 500 }
    )
  }
} 