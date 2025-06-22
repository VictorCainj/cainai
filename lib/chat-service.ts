import { supabase } from './supabase'
import { sessionManager } from './session'
import type { ChatConversation, ChatMessage } from './supabase'

export interface ConversationWithMessages extends ChatConversation {
  message_count: number
  last_message?: string
  last_message_time?: string
}

export interface CreateConversationData {
  title: string
  userId?: string
}

export interface CreateMessageData {
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, any>
}

class ChatService {
  private static instance: ChatService
  private localStorageKey = 'chat_conversations_backup'
  private initialized = false

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  private async initialize() {
    if (this.initialized) return
    this.initialized = true
  }

  private saveToLocalStorage(conversations: ConversationWithMessages[]) {
    if (typeof window === 'undefined') return
    
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        userId: sessionManager.getUserId(),
        conversations
      }
      localStorage.setItem(this.localStorageKey, JSON.stringify(backup))
    } catch (error) {
      // Silent fail
    }
  }

  private getFromLocalStorage(): ConversationWithMessages[] {
    if (typeof window === 'undefined') return []
    
    try {
      const backup = localStorage.getItem(this.localStorageKey)
      if (!backup) return []
      
      const data = JSON.parse(backup)
      const currentUserId = sessionManager.getUserId()
      
      if (data.userId === currentUserId) {
        return data.conversations || []
      }
      return []
    } catch (error) {
      return []
    }
  }

  private saveConversationLocally(conversation: ConversationWithMessages | ChatConversation) {
    if (typeof window === 'undefined') return
    
    try {
      const existingConversations = this.getFromLocalStorage()
      const conversationWithMessages: ConversationWithMessages = {
        ...conversation,
        message_count: (conversation as ConversationWithMessages).message_count || 0,
        last_message: (conversation as ConversationWithMessages).last_message || 'Nova conversa'
      }
      
      const existingIndex = existingConversations.findIndex(c => c.id === conversation.id)
      
      if (existingIndex >= 0) {
        existingConversations[existingIndex] = conversationWithMessages
      } else {
        existingConversations.unshift(conversationWithMessages)
      }
      
      this.saveToLocalStorage(existingConversations)
    } catch (error) {
      // Silent fail
    }
  }

  async createConversation(data: CreateConversationData): Promise<ChatConversation | null> {
    await this.initialize()
    
    try {
      const userId = data.userId || sessionManager.getUserId()
      const conversationData = {
        user_id: userId,
        title: data.title.slice(0, 100),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      try {
        const { data: conversation, error } = await supabase
          .from('chat_conversations')
          .insert(conversationData)
          .select()
          .single()

        if (error) {
          const localConversation = {
            id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...conversationData
          }
          this.saveConversationLocally(localConversation)
          return localConversation
        }

        this.saveConversationLocally(conversation)
        return conversation
      } catch (supabaseError) {
        const localConversation = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...conversationData
        }
        this.saveConversationLocally(localConversation)
        return localConversation
      }
    } catch (error) {
      return null
    }
  }

  async getUserConversations(userId?: string): Promise<ConversationWithMessages[]> {
    await this.initialize()
    
    try {
      const targetUserId = userId || sessionManager.getUserId()
      let supabaseConversations: ConversationWithMessages[] = []
      let supabaseWorked = false

      try {
        const { data: conversations, error } = await supabase
          .from('chat_conversations')
          .select(`id, user_id, title, created_at, updated_at`)
          .eq('user_id', targetUserId)
          .order('updated_at', { ascending: false })
          .limit(50)

        if (!error && conversations) {
          const conversationsWithStats = await Promise.all(
            conversations.map(async (conv) => {
              try {
                const [lastMessageResult, messageCountResult] = await Promise.all([
                  supabase
                    .from('chat_messages')
                    .select('content, created_at')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single(),
                  supabase
                    .from('chat_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('conversation_id', conv.id)
                ])

                return {
                  ...conv,
                  message_count: messageCountResult.count || 0,
                  last_message: lastMessageResult.data?.content?.slice(0, 100) || 'Sem mensagens',
                  last_message_time: lastMessageResult.data?.created_at
                }
              } catch (statsError) {
                return {
                  ...conv,
                  message_count: 0,
                  last_message: 'Sem mensagens',
                  last_message_time: undefined
                }
              }
            })
          )

          supabaseConversations = conversationsWithStats
          supabaseWorked = true
        }
      } catch (supabaseError) {
        // Silent fail
      }

      const localConversations = this.getFromLocalStorage()

      if (supabaseWorked && supabaseConversations.length > 0) {
        this.saveToLocalStorage(supabaseConversations)
        return supabaseConversations
      }

      if (localConversations.length > 0) {
        return localConversations
      }

      return []
    } catch (error) {
      return this.getFromLocalStorage()
    }
  }

  async getConversationWithMessages(conversationId: string, userId?: string): Promise<{
    conversation: ChatConversation | null
    messages: ChatMessage[]
  }> {
    await this.initialize()
    
    try {
      const targetUserId = userId || sessionManager.getUserId()
      let conversation: ChatConversation | null = null
      let messages: ChatMessage[] = []
      let supabaseWorked = false

      try {
        const { data: convData, error: convError } = await supabase
          .from('chat_conversations')
          .select('*')
          .eq('id', conversationId)
          .eq('user_id', targetUserId)
          .single()

        if (!convError && convData) {
          conversation = convData

          const { data: messagesData, error: messagesError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })

          if (!messagesError && messagesData) {
            messages = messagesData
            supabaseWorked = true
          }
        }
      } catch (supabaseError) {
        // Silent fail
      }

      if (!supabaseWorked) {
        const localConversations = this.getFromLocalStorage()
        const localConversation = localConversations.find(c => c.id === conversationId)
        
        if (localConversation) {
          conversation = localConversation
          messages = this.getMessagesFromLocalStorage(conversationId)
        }
      }

      if (conversation && messages.length === 0) {
        const localMessages = this.getMessagesFromLocalStorage(conversationId)
        if (localMessages.length > 0) {
          messages = localMessages
        }
      }

      return { conversation, messages }
    } catch (error) {
      const localConversations = this.getFromLocalStorage()
      const localConversation = localConversations.find(c => c.id === conversationId)
      const localMessages = this.getMessagesFromLocalStorage(conversationId)
      
      return { 
        conversation: localConversation || null, 
        messages: localMessages 
      }
    }
  }

  async addMessage(data: CreateMessageData): Promise<ChatMessage | null> {
    await this.initialize()
    
    try {
      const messageData = {
        conversation_id: data.conversationId,
        role: data.role,
        content: data.content,
        metadata: data.metadata || {},
        created_at: new Date().toISOString()
      }

      if (data.conversationId.startsWith('temp_')) {
        const localMessage = {
          id: `temp_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...messageData
        }
        this.saveMessageLocally(localMessage)
        this.updateLocalConversationStats(data.conversationId, data.content)
        return localMessage
      }

      try {
        const { data: message, error } = await supabase
          .from('chat_messages')
          .insert(messageData)
          .select()
          .single()

        if (error) {
          const localMessage = {
            id: `temp_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...messageData
          }
          this.saveMessageLocally(localMessage)
          this.updateLocalConversationStats(data.conversationId, data.content)
          return localMessage
        }

        this.saveMessageLocally(message)
        this.updateLocalConversationStats(data.conversationId, data.content)
        return message
      } catch (supabaseError) {
        const localMessage = {
          id: `temp_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...messageData
        }
        this.saveMessageLocally(localMessage)
        this.updateLocalConversationStats(data.conversationId, data.content)
        return localMessage
      }
    } catch (error) {
      return null
    }
  }

  private saveMessageLocally(message: ChatMessage) {
    if (typeof window === 'undefined') return
    
    try {
      const messagesKey = `chat_messages_${message.conversation_id}`
      const existingMessages = this.getMessagesFromLocalStorage(message.conversation_id)
      
      existingMessages.push(message)
      
      if (existingMessages.length > 100) {
        existingMessages.splice(0, existingMessages.length - 100)
      }
      
      localStorage.setItem(messagesKey, JSON.stringify(existingMessages))
    } catch (error) {
      // Silent fail
    }
  }

  private getMessagesFromLocalStorage(conversationId: string): ChatMessage[] {
    if (typeof window === 'undefined') return []
    
    try {
      const messagesKey = `chat_messages_${conversationId}`
      const messages = localStorage.getItem(messagesKey)
      return messages ? JSON.parse(messages) : []
    } catch (error) {
      return []
    }
  }

  private updateLocalConversationStats(conversationId: string, lastMessage: string) {
    if (typeof window === 'undefined') return
    
    try {
      const conversations = this.getFromLocalStorage()
      const convIndex = conversations.findIndex(c => c.id === conversationId)
      
      if (convIndex >= 0) {
        conversations[convIndex].last_message = lastMessage.slice(0, 100)
        conversations[convIndex].message_count = (conversations[convIndex].message_count || 0) + 1
        conversations[convIndex].updated_at = new Date().toISOString()
        this.saveToLocalStorage(conversations)
      }
    } catch (error) {
      // Silent fail
    }
  }

  async updateConversationTitle(conversationId: string, title: string): Promise<boolean> {
    try {
      const userId = sessionManager.getUserId()
      const { error } = await supabase
        .from('chat_conversations')
        .update({ 
          title: title.slice(0, 100),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('user_id', userId)

      return !error
    } catch (error) {
      return false
    }
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      const userId = sessionManager.getUserId()
      
      console.log('=== INICIANDO EXCLUSÃO DE CONVERSA ===')
      console.log('Conversation ID:', conversationId)
      console.log('User ID:', userId)
      
      if (!userId) {
        console.error('User ID não encontrado')
        return false
      }

      if (!conversationId) {
        console.error('Conversation ID não fornecido')
        return false
      }

      // Método 1: Tentar exclusão direta via RLS
      try {
        console.log('🔄 Tentativa 1: Exclusão via RLS...')
        
        // Verificar se a conversa existe e pertence ao usuário
        const { data: existingConversation, error: checkError } = await supabase
          .from('chat_conversations')
          .select('id, user_id, title')
          .eq('id', conversationId)
          .eq('user_id', userId)
          .single()

        if (checkError) {
          console.error('Erro ao verificar conversa:', checkError)
          throw new Error(`Verificação falhou: ${checkError.message}`)
        }

        if (!existingConversation) {
          console.error('Conversa não encontrada ou não pertence ao usuário')
          throw new Error('Conversa não encontrada')
        }

        console.log('Conversa encontrada:', existingConversation)

        // Contar mensagens antes da exclusão
        const { count: messageCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversationId)

        console.log('Mensagens encontradas:', messageCount)

        // Excluir a conversa (mensagens serão excluídas automaticamente por CASCADE)
        const { error: deleteError } = await supabase
          .from('chat_conversations')
          .delete()
          .eq('id', conversationId)
          .eq('user_id', userId)

        if (deleteError) {
          console.error('Erro ao excluir conversa do Supabase:', deleteError)
          throw new Error(`Exclusão RLS falhou: ${deleteError.message}`)
        }

        console.log('✅ Conversa excluída com sucesso via RLS')
        
        // Verificar se realmente foi excluída
        const { data: deletedCheck } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('id', conversationId)
          .single()

        if (deletedCheck) {
          console.error('ERRO: Conversa ainda existe após exclusão RLS!')
          throw new Error('Verificação pós-exclusão falhou')
        }

        console.log('Verificação: Conversa realmente excluída via RLS')
        
        // Remover do localStorage local também
        this.removeConversationFromLocalStorage(conversationId)
        this.removeMessagesFromLocalStorage(conversationId)

        console.log('=== EXCLUSÃO VIA RLS CONCLUÍDA COM SUCESSO ===')
        return true

      } catch (rlsError) {
        console.error('❌ Exclusão via RLS falhou:', rlsError)
        
        // Método 2: Fallback usando função admin
        try {
          console.log('🔄 Tentativa 2: Exclusão via função admin...')
          
          const { data: result, error: adminError } = await supabase
            .rpc('delete_conversation_admin', {
              conversation_id_param: conversationId,
              user_id_param: userId
            })

          if (adminError) {
            console.error('Erro na função admin:', adminError)
            throw new Error(`Função admin falhou: ${adminError.message}`)
          }

          console.log('Resultado da função admin:', result)
          
          if (!result) {
            throw new Error('Função admin retornou false')
          }

          console.log('✅ Conversa excluída com sucesso via função admin')
          
          // Remover do localStorage local também
          this.removeConversationFromLocalStorage(conversationId)
          this.removeMessagesFromLocalStorage(conversationId)

          console.log('=== EXCLUSÃO VIA FUNÇÃO ADMIN CONCLUÍDA COM SUCESSO ===')
          return true

        } catch (adminError) {
          console.error('❌ Exclusão via função admin também falhou:', adminError)
          throw adminError
        }
      }

    } catch (error) {
      console.error('=== ERRO GERAL NA EXCLUSÃO ===')
      console.error('Erro completo:', error)
      return false
    }
  }

  private removeConversationFromLocalStorage(conversationId: string) {
    if (typeof window === 'undefined') return
    
    try {
      const conversations = this.getFromLocalStorage()
      const filteredConversations = conversations.filter(c => c.id !== conversationId)
      this.saveToLocalStorage(filteredConversations)
    } catch (error) {
      // Silent fail
    }
  }

  private removeMessagesFromLocalStorage(conversationId: string) {
    if (typeof window === 'undefined') return
    
    try {
      const messagesKey = `chat_messages_${conversationId}`
      localStorage.removeItem(messagesKey)
    } catch (error) {
      // Silent fail
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .select('id')
        .limit(1)

      return !error
    } catch (error) {
      return false
    }
  }

  async createConversationFallback(title: string): Promise<{ id: string; title: string; isTemporary: true }> {
    return {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title.slice(0, 100),
      isTemporary: true
    }
  }

  async cleanupOldData(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)
      
      const { count } = await supabase
        .from('chat_conversations')
        .delete()
        .lt('created_at', cutoffDate.toISOString())

      return count || 0
    } catch (error) {
      return 0
    }
  }
}

export const chatService = ChatService.getInstance() 