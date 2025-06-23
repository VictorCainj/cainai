"use client"

import { BaseApiService } from '../api/BaseApiService'
import { 
  Conversation, 
  ConversationWithMessages, 
  CreateConversationData,
  ConversationResponse,
  ConversationFilter,
  ConversationList
} from '../../types/features/chat'
import { generateId } from '../../utils/common'

interface SupabaseConversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export class ConversationService extends BaseApiService {
  private static instance: ConversationService

  public static getInstance(): ConversationService {
    if (!ConversationService.instance) {
      ConversationService.instance = new ConversationService()
    }
    return ConversationService.instance
  }

  constructor() {
    super()
  }

  // Criar nova conversa
  async createConversation(data: CreateConversationData): Promise<Conversation | null> {
    try {
      const conversationData = {
        user_id: data.userId,
        title: data.title.slice(0, 100),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Primeiro tentar criar no Supabase
      const response = await this.post<SupabaseConversation>('/rest/v1/chat_conversations', conversationData)
      
      if (response.success && response.data) {
        return this.mapSupabaseToConversation(response.data)
      }

      // Fallback para conversa local temporária
      const localConversation: Conversation = {
        id: generateId(),
        title: data.title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: data.userId || '',
        isTemporary: true
      }

      return localConversation
    } catch (error) {
      console.error('Erro ao criar conversa:', error)
      return null
    }
  }

  // Buscar conversas do usuário
  async getUserConversations(userId: string, filter?: ConversationFilter): Promise<ConversationList> {
    try {
      const params: Record<string, any> = {
        'user_id': `eq.${userId}`,
        'order': 'updated_at.desc',
        'select': '*'
      }

      if (filter?.limit) {
        params.limit = filter.limit
      }

      if (filter?.offset) {
        params.offset = filter.offset
      }

      if (filter?.searchTerm) {
        params['title'] = `ilike.*${filter.searchTerm}*`
      }

      if (filter?.isArchived !== undefined) {
        params['is_archived'] = `eq.${filter.isArchived}`
      }

      const response = await this.get<SupabaseConversation[]>('/rest/v1/chat_conversations', params)

      if (response.success && response.data) {
        const conversations = response.data.map(this.mapSupabaseToConversation)
        
        return {
          items: conversations,
          hasMore: response.data.length === (filter?.limit || 50),
          totalCount: response.data.length
        }
      }

      return { items: [], hasMore: false, totalCount: 0 }
    } catch (error) {
      console.error('Erro ao buscar conversas:', error)
      return { items: [], hasMore: false, totalCount: 0 }
    }
  }

  // Buscar conversa específica
  async getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    try {
      const response = await this.get<SupabaseConversation>(
        `/rest/v1/chat_conversations?id=eq.${conversationId}&user_id=eq.${userId}&select=*`
      )

      if (response.success && response.data) {
        return this.mapSupabaseToConversation(response.data)
      }

      return null
    } catch (error) {
      console.error('Erro ao buscar conversa:', error)
      return null
    }
  }

  // Atualizar título da conversa
  async updateConversationTitle(conversationId: string, title: string, userId: string): Promise<boolean> {
    try {
      const response = await this.patch(
        `/rest/v1/chat_conversations?id=eq.${conversationId}&user_id=eq.${userId}`,
        {
          title: title.slice(0, 100),
          updated_at: new Date().toISOString()
        }
      )

      return response.success
    } catch (error) {
      console.error('Erro ao atualizar título:', error)
      return false
    }
  }

  // Arquivar/desarquivar conversa
  async archiveConversation(conversationId: string, userId: string, archived: boolean = true): Promise<boolean> {
    try {
      const updateData = {
        is_archived: archived,
        updated_at: new Date().toISOString()
      }

      const response = await this.patch(
        `/rest/v1/chat_conversations?id=eq.${conversationId}&user_id=eq.${userId}`,
        updateData
      )

      return response.success
    } catch (error) {
      console.error('Erro ao arquivar conversa:', error)
      return false
    }
  }

  // Deletar conversa
  async deleteConversation(conversationId: string, userId: string): Promise<boolean> {
    try {
      const response = await this.delete(
        `/rest/v1/chat_conversations?id=eq.${conversationId}&user_id=eq.${userId}`
      )

      return response.success
    } catch (error) {
      console.error('Erro ao deletar conversa:', error)
      return false
    }
  }

  // Buscar conversas com estatísticas (contagem de mensagens, última mensagem)
  async getConversationsWithStats(userId: string, limit: number = 50): Promise<ConversationWithMessages[]> {
    try {
      // Esta seria uma query mais complexa que incluiria joins com mensagens
      // Por simplicidade, vou usar a abordagem de buscar conversas e depois buscar stats
      const conversations = await this.getUserConversations(userId, { limit })
      
      // TODO: Implementar busca de estatísticas de mensagens
      const conversationsWithStats: ConversationWithMessages[] = conversations.items.map(conv => ({
        ...conv,
        messages: [],
        messageCount: 0,
        lastMessageTime: conv.updated_at
      }))

      return conversationsWithStats
    } catch (error) {
      console.error('Erro ao buscar conversas com stats:', error)
      return []
    }
  }

  // Verificar se conversa pertence ao usuário
  async isConversationOwner(conversationId: string, userId: string): Promise<boolean> {
    try {
      const conversation = await this.getConversation(conversationId, userId)
      return conversation !== null
    } catch (error) {
      return false
    }
  }

  // Buscar conversas recentes
  async getRecentConversations(userId: string, limit: number = 10): Promise<Conversation[]> {
    try {
      const response = await this.getUserConversations(userId, { 
        limit,
        isArchived: false 
      })
      return response.items
    } catch (error) {
      console.error('Erro ao buscar conversas recentes:', error)
      return []
    }
  }

  // Contar total de conversas do usuário
  async countUserConversations(userId: string): Promise<number> {
    try {
      const response = await this.get<{ count: number }>(
        `/rest/v1/chat_conversations?user_id=eq.${userId}&select=count(*)`,
        { head: true }
      )

      return response.data?.count || 0
    } catch (error) {
      console.error('Erro ao contar conversas:', error)
      return 0
    }
  }

  // Helper para mapear dados do Supabase para o formato interno
  private mapSupabaseToConversation(supabaseConv: SupabaseConversation): Conversation {
    return {
      id: supabaseConv.id,
      title: supabaseConv.title,
      created_at: supabaseConv.created_at,
      updated_at: supabaseConv.updated_at,
      user_id: supabaseConv.user_id,
      isArchived: false,
      isTemporary: false
    }
  }

  // Limpar conversas antigas
  async cleanupOldConversations(userId: string, daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const response = await this.delete(
        `/rest/v1/chat_conversations?user_id=eq.${userId}&created_at=lt.${cutoffDate.toISOString()}`
      )

      // TODO: Retornar contagem real de itens deletados
      return response.success ? 1 : 0
    } catch (error) {
      console.error('Erro ao limpar conversas antigas:', error)
      return 0
    }
  }

  // Duplicar conversa
  async duplicateConversation(conversationId: string, userId: string, newTitle?: string): Promise<Conversation | null> {
    try {
      const originalConversation = await this.getConversation(conversationId, userId)
      
      if (!originalConversation) {
        return null
      }

      const duplicatedConversation = await this.createConversation({
        title: newTitle || `${originalConversation.title} (cópia)`,
        userId
      })

      return duplicatedConversation
    } catch (error) {
      console.error('Erro ao duplicar conversa:', error)
      return null
    }
  }
} 