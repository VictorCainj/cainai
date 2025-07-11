import { supabase } from './supabase'
import { sessionManager } from './session'
import { cacheService } from './cache-service'
import { compressionService } from './compression-service'
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
      
      // Tentar cache primeiro
      const cached = await cacheService.getCachedConversations(targetUserId)
      if (cached) {
        return cached
      }

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
        // Salvar no cache e localStorage
        await cacheService.cacheConversations(targetUserId, supabaseConversations)
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
      // Comprimir conteúdo se necessário
      const compressedContent = compressionService.compressMessage(data.content, data.metadata)
      
      const messageData = {
        conversation_id: data.conversationId,
        role: data.role,
        content: compressedContent.compressed ? JSON.stringify(compressedContent) : data.content,
        metadata: {
          ...(data.metadata || {}),
          compressed: compressedContent.compressed,
          compressionRatio: compressedContent.compressed 
            ? ((compressedContent.originalSize - compressedContent.compressedSize) / compressedContent.originalSize * 100)
            : 0
        },
        created_at: new Date().toISOString()
      }

      if (data.conversationId.startsWith('temp_')) {
        const localMessage = {
          id: `temp_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...messageData
        }
        this.saveMessageLocally(localMessage)
        this.updateLocalConversationStats(data.conversationId, data.content)
        
        // Invalidar cache da conversa
        cacheService.invalidateConversation(data.conversationId)
        
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
          cacheService.invalidateConversation(data.conversationId)
          return localMessage
        }

        this.saveMessageLocally(message)
        this.updateLocalConversationStats(data.conversationId, data.content)
        
        // Invalidar caches relacionados
        cacheService.invalidateConversation(data.conversationId)
        const userId = sessionManager.getUserId()
        if (userId) {
          cacheService.invalidateUserConversations(userId)
        }
        
        return message
      } catch (supabaseError) {
        const localMessage = {
          id: `temp_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...messageData
        }
        this.saveMessageLocally(localMessage)
        this.updateLocalConversationStats(data.conversationId, data.content)
        cacheService.invalidateConversation(data.conversationId)
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
      
      if (!userId) {
        console.warn('deleteConversation: userId não encontrado')
        return false
      }

      if (!conversationId || conversationId.trim() === '') {
        console.warn('deleteConversation: conversationId inválido')
        return false
      }

      // Log de debug
      if (process.env.NODE_ENV === 'development') {
        // Debug log removido para produção
      }

      // Método 1: Tentar exclusão direta via RLS primeiro
      try {
        // Verificar se a conversa existe e pertence ao usuário
        const { data: existingConversations, error: checkError } = await supabase
          .from('chat_conversations')
          .select('id, user_id, title')
          .eq('id', conversationId)
          .eq('user_id', userId)

        if (checkError) {
          console.warn(`Verificação RLS falhou: ${checkError.message}`)
          throw new Error(`Verificação falhou: ${checkError.message}`)
        }

        if (!existingConversations || existingConversations.length === 0) {
          console.warn('Conversa não encontrada via RLS')
          throw new Error('Conversa não encontrada')
        }

        // Se há múltiplas conversas com o mesmo ID (problema de dados), usar a primeira
        const existingConversation = existingConversations[0]
        if (existingConversations.length > 1) {
          console.warn(`Encontradas ${existingConversations.length} conversas com o mesmo ID. Usando a primeira.`)
        }

        // Tentar excluir mensagens primeiro
        const { error: messagesDeleteError } = await supabase
          .from('chat_messages')
          .delete()
          .eq('conversation_id', conversationId)

        if (messagesDeleteError) {
          console.warn(`Falha ao excluir mensagens: ${messagesDeleteError.message}`)
        }

        // Excluir a conversa
        const { error: deleteError } = await supabase
          .from('chat_conversations')
          .delete()
          .eq('id', conversationId)
          .eq('user_id', userId)

        if (deleteError) {
          throw new Error(`Exclusão RLS falhou: ${deleteError.message}`)
        }
        
        // Verificar se realmente foi excluída
        const { data: deletedCheck, error: verifyError } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('id', conversationId)

        if (verifyError && verifyError.code === 'PGRST116') {
          // PGRST116 = "not found" é o que queremos (conversa foi excluída)
          console.log('Exclusão RLS bem-sucedida')
          this.removeConversationFromLocalStorage(conversationId)
          this.removeMessagesFromLocalStorage(conversationId)
          return true
        }

        if (!verifyError && (!deletedCheck || deletedCheck.length === 0)) {
          // Nenhum erro e nenhum resultado = conversa foi excluída
          console.log('Exclusão RLS bem-sucedida')
          this.removeConversationFromLocalStorage(conversationId)
          this.removeMessagesFromLocalStorage(conversationId)
          return true
        }

        if (deletedCheck && deletedCheck.length > 0) {
          throw new Error('Conversa ainda existe após exclusão')
        }

        console.log('Exclusão RLS bem-sucedida')
        this.removeConversationFromLocalStorage(conversationId)
        this.removeMessagesFromLocalStorage(conversationId)
        return true

      } catch (rlsError) {
        console.warn(`Exclusão RLS falhou: ${rlsError}`)
        
        // Método 2: Tentar função force_delete primeiro (mais eficaz)
        try {
          const { data: forceResult, error: forceError } = await supabase
            .rpc('force_delete_conversation', {
              conversation_id_param: conversationId,
              user_id_param: userId
            })

          if (forceError) {
            console.warn(`Função force delete falhou: ${forceError.message}`)
            throw new Error(`Force delete falhou: ${forceError.message}`)
          }

          if (!forceResult) {
            console.warn('Force delete retornou false')
            throw new Error('Force delete retornou false')
          }

          // Debug log removido
          this.removeConversationFromLocalStorage(conversationId)
          this.removeMessagesFromLocalStorage(conversationId)
          return true

        } catch (forceError) {
          console.warn(`Force delete falhou: ${forceError}`)
          
          // Método 3: Fallback para função admin
          try {
            const { data: result, error: adminError } = await supabase
              .rpc('delete_conversation_admin', {
                conversation_id_param: conversationId,
                user_id_param: userId
              })

            if (adminError) {
              console.warn(`Função admin falhou: ${adminError.message}`)
              throw new Error(`Função admin falhou: ${adminError.message}`)
            }
            
            if (!result) {
              console.warn('Função admin retornou false')
              throw new Error('Função admin retornou false')
            }
            
            // Debug log removido
            this.removeConversationFromLocalStorage(conversationId)
            this.removeMessagesFromLocalStorage(conversationId)
            return true

          } catch (adminError) {
            console.error(`Todos os métodos de exclusão falharam: ${adminError}`)
            
            // Método 4: Exclusão apenas local como último recurso
            // Debug log removido
            this.removeConversationFromLocalStorage(conversationId)
            this.removeMessagesFromLocalStorage(conversationId)
            
            // Retornar false para indicar que a exclusão no servidor falhou
            // mas a exclusão local foi feita
            return false
          }
        }
      }

    } catch (error) {
      console.error('Erro geral na exclusão de conversa:', error)
      
      // Como último recurso, limpar apenas localmente
      this.removeConversationFromLocalStorage(conversationId)
      this.removeMessagesFromLocalStorage(conversationId)
      
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

  // Novo método: Diagnosticar conversas órfãs
  async diagnoseOrphanedConversations(anonymousUserId: string, authenticatedUserId: string) {
    await this.initialize()
    
    try {
      // Buscar conversas do usuário anônimo
      const { data: orphanedConversations, error } = await supabase
        .from('chat_conversations')
        .select('id, title, user_id, created_at, updated_at')
        .eq('user_id', anonymousUserId)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Erro ao diagnosticar conversas órfãs:', error)
        return { orphanedConversations: [], error: error.message }
      }

      // Buscar conversas do usuário autenticado para comparação
      const { data: authenticatedConversations, error: authError } = await supabase
        .from('chat_conversations')
        .select('id, title, created_at')
        .eq('user_id', authenticatedUserId)
        .order('updated_at', { ascending: false })

      return {
        orphanedConversations: orphanedConversations || [],
        authenticatedConversations: authenticatedConversations || [],
        totalOrphaned: (orphanedConversations || []).length,
        totalAuthenticated: (authenticatedConversations || []).length,
        canMigrate: (orphanedConversations || []).length > 0
      }
    } catch (error) {
      console.error('Erro na diagnose:', error)
      return { 
        orphanedConversations: [], 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    }
  }

  // Novo método: Migrar conversas órfãs
  async migrateOrphanedConversations(fromUserId: string, toUserId: string) {
    await this.initialize()
    
    try {
      // Primeiro, verificar se existem conversas para migrar
      const { data: conversationsToMigrate, error: checkError } = await supabase
        .from('chat_conversations')
        .select('id, title, created_at')
        .eq('user_id', fromUserId)

      if (checkError) {
        throw new Error(`Erro ao verificar conversas: ${checkError.message}`)
      }

      if (!conversationsToMigrate || conversationsToMigrate.length === 0) {
        return { 
          success: true, 
          migratedCount: 0, 
          message: 'Nenhuma conversa para migrar' 
        }
      }

      // Executar a migração
      const { error: migrationError } = await supabase
        .from('chat_conversations')
        .update({ 
          user_id: toUserId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', fromUserId)

      if (migrationError) {
        throw new Error(`Erro na migração: ${migrationError.message}`)
      }

      // Verificar se a migração foi bem-sucedida
      const { data: verificationData, error: verifyError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_id', toUserId)

      if (verifyError) {
        throw new Error(`Erro na verificação: ${verifyError.message}`)
      }

      return {
        success: true,
        migratedCount: conversationsToMigrate.length,
        migratedConversations: conversationsToMigrate,
        totalAfterMigration: (verificationData || []).length,
        message: `${conversationsToMigrate.length} conversas migradas com sucesso`
      }

    } catch (error) {
      console.error('Erro na migração:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        migratedCount: 0
      }
    }
  }

  // Novo método: Verificar integridade do usuário
  async checkUserIntegrity(userId: string) {
    await this.initialize()
    
    try {
      // Contar conversas
      const { count: conversationCount, error: convError } = await supabase
        .from('chat_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      // Buscar IDs das conversas primeiro
      const { data: userConversations, error: convIdsError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_id', userId)

      let messageCount = 0
      let msgError = null

      if (!convIdsError && userConversations && userConversations.length > 0) {
        const conversationIds = userConversations.map(conv => conv.id)
        const { count, error } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', conversationIds)
        
        messageCount = count || 0
        msgError = error
      }

             if (convError || msgError || convIdsError) {
         return {
           userId,
           conversationCount: 0,
           messageCount: 0,
           error: convError?.message || msgError?.message || convIdsError?.message,
           isHealthy: false
         }
       }

      return {
        userId,
        conversationCount: conversationCount || 0,
        messageCount: messageCount || 0,
        isHealthy: true,
        hasData: (conversationCount || 0) > 0
      }
    } catch (error) {
      return {
        userId,
        conversationCount: 0,
        messageCount: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        isHealthy: false
      }
    }
  }
}

export const chatService = ChatService.getInstance() 