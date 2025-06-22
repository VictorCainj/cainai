import { NextRequest, NextResponse } from 'next/server'
import { chatService } from '@/lib/chat-service'
import { sessionManager } from '@/lib/session'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const userIdFromQuery = searchParams.get('userId')
    const userIdFromSession = sessionManager.getUserId()
    const conversationId = params.id
    const userId = userIdFromQuery || userIdFromSession

    if (!userId || !conversationId) {
      return NextResponse.json({ error: 'userId e conversationId são obrigatórios' }, { status: 400 })
    }

    // Validar que conversationId é um UUID válido
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId)) {
      return NextResponse.json({ error: 'conversationId inválido' }, { status: 400 })
    }

    // Chamar o chat service para excluir
    const success = await chatService.deleteConversation(conversationId)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Conversa excluída com sucesso'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Falha ao excluir conversa'
      }, { status: 500 })
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    // Log apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao excluir conversa via API:', error)
    }
    
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