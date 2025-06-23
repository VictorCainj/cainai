import { Conversation, ConversationWithMessages, Message } from '../../types/features/chat'

interface LocalStorageBackup {
  timestamp: string
  userId: string
  conversations: ConversationWithMessages[]
}

export class LocalStorageService {
  private static instance: LocalStorageService
  private readonly conversationsKey = 'chat_conversations_backup'
  private readonly messagesPrefix = 'chat_messages_'

  public static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService()
    }
    return LocalStorageService.instance
  }

  // Salvar conversas no localStorage
  saveConversations(userId: string, conversations: ConversationWithMessages[]): boolean {
    try {
      const backup: LocalStorageBackup = {
        timestamp: new Date().toISOString(),
        userId,
        conversations
      }
      
      localStorage.setItem(this.conversationsKey, JSON.stringify(backup))
      return true
    } catch (error) {
      console.error('Erro ao salvar conversas:', error)
      return false
    }
  }

  // Buscar conversas do localStorage
  getConversations(userId: string): ConversationWithMessages[] {
    try {
      const backup = localStorage.getItem(this.conversationsKey)
      
      if (!backup) return []
      
      const data: LocalStorageBackup = JSON.parse(backup)
      
      if (data.userId !== userId) {
        return []
      }

      return data.conversations || []
    } catch (error) {
      console.error('Erro ao buscar conversas:', error)
      return []
    }
  }

  // Salvar uma conversa específica
  saveConversation(conversation: ConversationWithMessages | Conversation): boolean {
    try {
      const existingConversations = this.getConversations(conversation.user_id)
      
      const conversationWithMessages: ConversationWithMessages = {
        ...conversation,
        messages: (conversation as ConversationWithMessages).messages || [],
        messageCount: (conversation as ConversationWithMessages).messageCount || 0,
        lastMessageTime: (conversation as ConversationWithMessages).lastMessageTime || conversation.updated_at
      }
      
      const existingIndex = existingConversations.findIndex(c => c.id === conversation.id)
      
      if (existingIndex >= 0) {
        existingConversations[existingIndex] = conversationWithMessages
      } else {
        existingConversations.unshift(conversationWithMessages)
      }
      
      // Manter apenas as 100 conversas mais recentes
      if (existingConversations.length > 100) {
        existingConversations.splice(100)
      }
      
      return this.saveConversations(conversation.user_id, existingConversations)
    } catch (error) {
      console.error('Erro ao salvar conversa no localStorage:', error)
      return false
    }
  }

  // Remover conversa
  removeConversation(conversationId: string, userId: string): boolean {
    try {
      const conversations = this.getConversations(userId)
      const filtered = conversations.filter(c => c.id !== conversationId)
      
      this.saveConversations(userId, filtered)
      
      const messagesKey = `${this.messagesPrefix}${conversationId}`
      localStorage.removeItem(messagesKey)
      
      return true
    } catch (error) {
      console.error('Erro ao remover conversa:', error)
      return false
    }
  }

  // Atualizar estatísticas de uma conversa
  updateConversationStats(conversationId: string, userId: string, lastMessage: string): boolean {
    try {
      const conversations = this.getConversations(userId)
      const convIndex = conversations.findIndex(c => c.id === conversationId)
      
      if (convIndex >= 0) {
        const updatedConversation = {
          ...conversations[convIndex],
          lastMessageTime: new Date().toISOString(),
          messageCount: (conversations[convIndex].messageCount || 0) + 1,
          updated_at: new Date().toISOString()
        }
        
        conversations[convIndex] = updatedConversation
        
        return this.saveConversations(userId, conversations)
      }
      
      return false
    } catch (error) {
      console.error('Erro ao atualizar stats da conversa:', error)
      return false
    }
  }

  // Salvar mensagens de uma conversa
  saveConversationMessages(conversationId: string, messages: Message[]): boolean {
    try {
      const messagesKey = `${this.messagesPrefix}${conversationId}`
      localStorage.setItem(messagesKey, JSON.stringify(messages))
      return true
    } catch (error) {
      console.error('Erro ao salvar mensagens:', error)
      return false
    }
  }

  // Buscar mensagens de uma conversa
  getConversationMessages(conversationId: string): Message[] {
    try {
      const messagesKey = `${this.messagesPrefix}${conversationId}`
      const messages = localStorage.getItem(messagesKey)
      return messages ? JSON.parse(messages) : []
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error)
      return []
    }
  }

  // Adicionar uma mensagem à conversa
  addMessage(conversationId: string, message: Message): boolean {
    try {
      const existingMessages = this.getConversationMessages(conversationId)
      existingMessages.push(message)
      
      return this.saveConversationMessages(conversationId, existingMessages)
    } catch (error) {
      console.error('Erro ao adicionar mensagem no localStorage:', error)
      return false
    }
  }

  // Limpar todas as conversas
  clearConversations(): boolean {
    try {
      localStorage.removeItem(this.conversationsKey)
      return true
    } catch (error) {
      console.error('Erro ao limpar conversas do localStorage:', error)
      return false
    }
  }

  // Limpar dados de um usuário específico
  clearUserData(userId: string): boolean {
    try {
      const backup = localStorage.getItem(this.conversationsKey)
      
      if (backup) {
        const data: LocalStorageBackup = JSON.parse(backup)
        
        if (data.userId === userId) {
          // Remover mensagens de todas as conversas do usuário
          data.conversations.forEach(conv => {
            this.removeConversation(conv.id, userId)
          })
          
          // Remover backup de conversas
          this.clearConversations()
        }
      }
      
      return true
    } catch (error) {
      console.error('Erro ao limpar dados do usuário:', error)
      return false
    }
  }

  // Verificar se há dados salvos para um usuário
  hasUserData(userId: string): boolean {
    try {
      const conversations = this.getConversations(userId)
      return conversations.length > 0
    } catch (error) {
      return false
    }
  }

  // Obter estatísticas do cache local
  getCacheStats(userId: string): {
    conversationCount: number
    totalMessages: number
    cacheSize: string
    lastUpdate: string | null
  } {
    try {
      const conversations = this.getConversations(userId)
      let totalMessages = 0
      
      conversations.forEach(conv => {
        const messages = this.getConversationMessages(conv.id)
        totalMessages += messages.length
      })
      
      // Calcular tamanho aproximado do cache
      const backup = localStorage.getItem(this.conversationsKey)
      const cacheSize = backup ? JSON.stringify(backup).length : 0
      
      return {
        conversationCount: conversations.length,
        totalMessages,
        cacheSize: `${(cacheSize / 1024).toFixed(2)} KB`,
        lastUpdate: backup || null
      }
    } catch (error) {
      return {
        conversationCount: 0,
        totalMessages: 0,
        cacheSize: '0 KB',
        lastUpdate: null
      }
    }
  }

  // Limpar cache antigo (mais de 7 dias)
  cleanupOldCache(): number {
    try {
      const backup = localStorage.getItem(this.conversationsKey)
      
      if (!backup) return 0
      
      const data: LocalStorageBackup = JSON.parse(backup)
      const backupDate = new Date(data.timestamp)
      const now = new Date()
      const daysDiff = (now.getTime() - backupDate.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysDiff > 7) {
        this.clearUserData(data.userId)
        return 1
      }
      
      return 0
    } catch (error) {
      console.error('Erro ao limpar cache antigo:', error)
      return 0
    }
  }
} 