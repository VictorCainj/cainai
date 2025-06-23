import { BaseApiService } from '../api/BaseApiService'
import { 
  Message, 
  CreateMessageData,
  MessageFilter,
  MessageList
} from '../../types/features/chat'
import { generateId } from '../../utils/common'

interface SupabaseMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, any>
  created_at: string
}

export class MessageService extends BaseApiService {
  private static instance: MessageService

  public static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService()
    }
    return MessageService.instance
  }

  // Criar nova mensagem
  async createMessage(data: CreateMessageData): Promise<Message | null> {
    try {
      const messageData = {
        conversation_id: data.conversationId,
        role: data.role,
        content: data.content,
        metadata: data.metadata || {},
        created_at: new Date().toISOString()
      }

      const response = await this.post<SupabaseMessage>('/rest/v1/chat_messages', messageData)
      
      if (response.success && response.data) {
        return this.mapSupabaseToMessage(response.data)
      }

      return null
    } catch (error) {
      console.error('Erro ao criar mensagem:', error)
      return null
    }
  }

  // Buscar mensagens de uma conversa
  async getConversationMessages(conversationId: string): Promise<Message[]> {
    try {
      const response = await this.get<SupabaseMessage[]>('/rest/v1/chat_messages', {
        'conversation_id': `eq.${conversationId}`,
        'order': 'created_at.asc'
      })

      if (response.success && response.data) {
        return response.data.map(this.mapSupabaseToMessage)
      }

      return []
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error)
      return []
    }
  }

  // Buscar mensagem específica
  async getMessage(messageId: string): Promise<Message | null> {
    try {
      const response = await this.get<SupabaseMessage>(
        `/rest/v1/chat_messages?id=eq.${messageId}&select=*`
      )

      if (response.success && response.data) {
        return this.mapSupabaseToMessage(response.data)
      }

      return null
    } catch (error) {
      console.error('Erro ao buscar mensagem:', error)
      return null
    }
  }

  // Atualizar mensagem
  async updateMessage(messageId: string, updates: Partial<Pick<Message, 'content' | 'metadata'>>): Promise<boolean> {
    try {
      const updateData: Record<string, any> = {}
      
      if (updates.content !== undefined) {
        updateData.content = updates.content
      }
      
      if (updates.metadata !== undefined) {
        updateData.metadata = updates.metadata
      }

      const response = await this.patch(
        `/rest/v1/chat_messages?id=eq.${messageId}`,
        updateData
      )

      return response.success
    } catch (error) {
      console.error('Erro ao atualizar mensagem:', error)
      return false
    }
  }

  // Deletar mensagem
  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const response = await this.delete(`/rest/v1/chat_messages?id=eq.${messageId}`)
      return response.success
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error)
      return false
    }
  }

  // Deletar todas as mensagens de uma conversa
  async deleteConversationMessages(conversationId: string): Promise<boolean> {
    try {
      const response = await this.delete(
        `/rest/v1/chat_messages?conversation_id=eq.${conversationId}`
      )

      return response.success
    } catch (error) {
      console.error('Erro ao deletar mensagens da conversa:', error)
      return false
    }
  }

  // Buscar últimas mensagens de uma conversa
  async getLatestMessages(conversationId: string, limit: number = 10): Promise<Message[]> {
    try {
      const response = await this.get<SupabaseMessage[]>('/rest/v1/chat_messages', {
        'conversation_id': `eq.${conversationId}`,
        'order': 'created_at.desc',
        'limit': limit
      })

      if (response.success && response.data) {
        return response.data.map(this.mapSupabaseToMessage).reverse()
      }

      return []
    } catch (error) {
      console.error('Erro ao buscar últimas mensagens:', error)
      return []
    }
  }

  // Contar mensagens de uma conversa
  async countConversationMessages(conversationId: string): Promise<number> {
    try {
      const response = await this.get<{ count: number }>(
        `/rest/v1/chat_messages?conversation_id=eq.${conversationId}&select=count(*)`,
        { head: true }
      )

      return response.data?.count || 0
    } catch (error) {
      console.error('Erro ao contar mensagens:', error)
      return 0
    }
  }

  // Buscar mensagens por termo de pesquisa
  async searchMessages(conversationId: string, searchTerm: string, limit: number = 50): Promise<Message[]> {
    try {
      const response = await this.get<SupabaseMessage[]>('/rest/v1/chat_messages', {
        'conversation_id': `eq.${conversationId}`,
        'content': `ilike.*${searchTerm}*`,
        'order': 'created_at.desc',
        'limit': limit
      })

      if (response.success && response.data) {
        return response.data.map(this.mapSupabaseToMessage)
      }

      return []
    } catch (error) {
      console.error('Erro ao pesquisar mensagens:', error)
      return []
    }
  }

  // Buscar mensagens por role específico
  async getMessagesByRole(conversationId: string, role: Message['role']): Promise<Message[]> {
    try {
      const response = await this.get<SupabaseMessage[]>('/rest/v1/chat_messages', {
        'conversation_id': `eq.${conversationId}`,
        'role': `eq.${role}`,
        'order': 'created_at.asc'
      })

      if (response.success && response.data) {
        return response.data.map(this.mapSupabaseToMessage)
      }

      return []
    } catch (error) {
      console.error('Erro ao buscar mensagens por role:', error)
      return []
    }
  }

  // Helper para mapear dados do Supabase
  private mapSupabaseToMessage(supabaseMsg: SupabaseMessage): Message {
    return {
      id: supabaseMsg.id,
      role: supabaseMsg.role,
      content: supabaseMsg.content,
      timestamp: new Date(supabaseMsg.created_at),
      created_at: supabaseMsg.created_at,
      metadata: supabaseMsg.metadata
    }
  }

  // Verificar se conversa tem mensagens
  async hasMessages(conversationId: string): Promise<boolean> {
    try {
      const count = await this.countConversationMessages(conversationId)
      return count > 0
    } catch (error) {
      return false
    }
  }

  // Buscar primeira mensagem de uma conversa
  async getFirstMessage(conversationId: string): Promise<Message | null> {
    try {
      const response = await this.get<SupabaseMessage>(
        `/rest/v1/chat_messages?conversation_id=eq.${conversationId}&order=created_at.asc&limit=1`
      )

      if (response.success && response.data) {
        return this.mapSupabaseToMessage(response.data)
      }

      return null
    } catch (error) {
      console.error('Erro ao buscar primeira mensagem:', error)
      return null
    }
  }

  // Buscar última mensagem de uma conversa
  async getLastMessage(conversationId: string): Promise<Message | null> {
    try {
      const response = await this.get<SupabaseMessage>(
        `/rest/v1/chat_messages?conversation_id=eq.${conversationId}&order=created_at.desc&limit=1`
      )

      if (response.success && response.data) {
        return this.mapSupabaseToMessage(response.data)
      }

      return null
    } catch (error) {
      console.error('Erro ao buscar última mensagem:', error)
      return null
    }
  }
} 