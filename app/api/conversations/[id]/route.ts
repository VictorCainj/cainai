import { NextRequest, NextResponse } from 'next/server'
import { chatService } from '@/lib/chat-service'
import { sessionManager } from '@/lib/session'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== API DELETE CONVERSATION INICIADA ===')
  console.log('Params:', params)
  console.log('Request URL:', request.url)

  try {
    const conversationId = params.id
    const { searchParams } = new URL(request.url)
    const userIdFromQuery = searchParams.get('userId')
    const userIdFromSession = sessionManager.getUserId()
    const userId = userIdFromQuery || userIdFromSession

    console.log('Conversation ID:', conversationId)
    console.log('User ID from query:', userIdFromQuery)
    console.log('User ID from session:', userIdFromSession)
    console.log('Final User ID:', userId)

    if (!userId) {
      console.error('❌ userId é obrigatório')
      return NextResponse.json({ 
        error: 'userId é obrigatório',
        details: 'Nenhum userId fornecido na query nem na sessão'
      }, { status: 400 })
    }

    if (!conversationId) {
      console.error('❌ ID da conversa é obrigatório')
      return NextResponse.json({ 
        error: 'ID da conversa é obrigatório',
        details: 'conversationId está vazio'
      }, { status: 400 })
    }

    console.log('🔄 Chamando chatService.deleteConversation...')
    
    // Excluir conversa e todas as mensagens associadas
    const success = await chatService.deleteConversation(conversationId)

    console.log('Chat service result:', success)

    if (success) {
      console.log('✅ Conversa excluída com sucesso via API')
      return NextResponse.json({
        success: true,
        message: 'Conversa e mensagens excluídas com sucesso'
      })
    } else {
      console.error('❌ Chat service retornou false')
      return NextResponse.json({
        error: 'Falha ao excluir conversa',
        details: 'chatService.deleteConversation retornou false',
        success: false
      }, { status: 500 })
    }

  } catch (error) {
    console.error('=== ERRO NA API DELETE ===')
    console.error('Erro completo:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    const errorStack = error instanceof Error ? error.stack : 'Sem stack trace'
    
    console.error('Error message:', errorMessage)
    console.error('Error stack:', errorStack)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: errorMessage,
        success: false
      },
      { status: 500 }
    )
  }
} 