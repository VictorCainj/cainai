import { supabase } from './supabase'
import { sessionManager } from './session'
import { DebugHelper } from './debug-helper'
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
    
    DebugHelper.log('info', 'CHAT_SERVICE', 'Inicializando serviço de chat')
    
    // Verificar configuração do Supabase
    await DebugHelper.checkSupabaseConfig()
    
    // Testar conexão
    const connectionTest = await DebugHelper.testSupabaseConnection()
    
    this.initialized = true
    DebugHelper.log('info', 'CHAT_SERVICE', 'Serviço inicializado', { connectionTest })
  }

  // Backup local das conversas
  private saveToLocalStorage(conversations: ConversationWithMessages[]) {
    if (typeof window === 'undefined') return
    
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        userId: sessionManager.getUserId(),
        conversations
      }
      
      localStorage.setItem(this.localStorageKey, JSON.stringify(backup))
      DebugHelper.log('info', 'LOCAL_BACKUP', `Backup local criado com ${conversations.length} conversas`)
    } catch (error) {
      DebugHelper.log('error', 'LOCAL_BACKUP', 'Erro ao salvar backup local', error)
    }
  }

  private getFromLocalStorage(): ConversationWithMessages[] {
    if (typeof window === 'undefined') return []
    
    try {
      const backup = localStorage.getItem(this.localStorageKey)
      if (!backup) return []
      
      const data = JSON.parse(backup)
      const currentUserId = sessionManager.getUserId()
      
      // Verificar se o backup é do usuário atual
      if (data.userId === currentUserId) {
        DebugHelper.log('info', 'LOCAL_BACKUP', `Carregadas ${data.conversations?.length || 0} conversas do backup`)
        return data.conversations || []
      }
      
      return []
    } catch (error) {
      DebugHelper.log('error', 'LOCAL_BACKUP', 'Erro ao carregar backup local', error)
      return []
    }
  }

  // Salvar conversa localmente
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
      DebugHelper.log('info', 'LOCAL_SAVE', `Conversa ${conversation.id} salva localmente`)
    } catch (error) {
      DebugHelper.log('error', 'LOCAL_SAVE', 'Erro ao salvar conversa localmente', error)
    }
  }

  // Criar nova conversa
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

      DebugHelper.log('info', 'CREATE_CONV', 'Criando nova conversa', { title: data.title, userId })

      // Tentar salvar no Supabase primeiro
      try {
        const { data: conversation, error } = await supabase
          .from('chat_conversations')
          .insert(conversationData)
          .select()
          .single()

        if (error) {
          DebugHelper.log('warning', 'CREATE_CONV', 'Erro ao salvar no Supabase, criando fallback local', error)
          // Criar versão local com ID temporário
          const localConversation = {
            id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...conversationData
          }
          this.saveConversationLocally(localConversation)
          return localConversation
        }

        DebugHelper.log('info', 'CREATE_CONV', 'Conversa salva no Supabase com sucesso', { id: conversation.id })
        
        // Salvar também localmente para backup
        this.saveConversationLocally(conversation)
        
        return conversation
      } catch (supabaseError) {
        DebugHelper.log('warning', 'CREATE_CONV', 'Falha na conexão com Supabase, usando backup local', supabaseError)
        // Criar versão local com ID temporário
        const localConversation = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...conversationData
        }
        this.saveConversationLocally(localConversation)
        return localConversation
      }
    } catch (error) {
      DebugHelper.log('error', 'CREATE_CONV', 'Erro crítico ao criar conversa', error)
      return null
    }
  }

  // Buscar conversas do usuário
  async getUserConversations(userId?: string): Promise<ConversationWithMessages[]> {
    await this.initialize()
    
    try {
      const targetUserId = userId || sessionManager.getUserId()
      DebugHelper.log('info', 'GET_CONVERSATIONS', 'Buscando conversas', { userId: targetUserId })

      let supabaseConversations: ConversationWithMessages[] = []
      let supabaseWorked = false

      // Tentar buscar do Supabase primeiro
      try {
        const { data: conversations, error } = await supabase
          .from('chat_conversations')
          .select(`
            id,
            user_id,
            title,
            created_at,
            updated_at
          `)
          .eq('user_id', targetUserId)
          .order('updated_at', { ascending: false })
          .limit(50)

        if (!error && conversations) {
          // Buscar estatísticas de cada conversa
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
                DebugHelper.log('warning', 'GET_CONVERSATIONS', 'Erro ao buscar estatísticas', { convId: conv.id, error: statsError })
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
          DebugHelper.log('info', 'GET_CONVERSATIONS', `Encontradas ${supabaseConversations.length} conversas no Supabase`)
        } else {
          DebugHelper.log('warning', 'GET_CONVERSATIONS', 'Erro ao buscar do Supabase', error)
        }
      } catch (supabaseError) {
        DebugHelper.log('warning', 'GET_CONVERSATIONS', 'Falha na conexão com Supabase', supabaseError)
      }

      // Buscar backup local
      const localConversations = this.getFromLocalStorage()
      DebugHelper.log('info', 'GET_CONVERSATIONS', `Encontradas ${localConversations.length} conversas locais`)

      // Se Supabase funcionou, atualizar backup local e retornar
      if (supabaseWorked && supabaseConversations.length > 0) {
        this.saveToLocalStorage(supabaseConversations)
        return supabaseConversations
      }

      // Se Supabase não funcionou, usar backup local
      if (localConversations.length > 0) {
        DebugHelper.log('info', 'GET_CONVERSATIONS', 'Usando backup local como fallback')
        return localConversations
      }

      // Se não há conversas em lugar nenhum
      DebugHelper.log('info', 'GET_CONVERSATIONS', 'Nenhuma conversa encontrada')
      return []

    } catch (error) {
      DebugHelper.log('error', 'GET_CONVERSATIONS', 'Erro crítico ao buscar conversas', error)
      // Em caso de erro crítico, tentar retornar backup local
      return this.getFromLocalStorage()
    }
  }

  // Buscar conversa específica com mensagens
  async getConversationWithMessages(conversationId: string, userId?: string): Promise<{
    conversation: ChatConversation | null
    messages: ChatMessage[]
  }> {
    await this.initialize()
    
    try {
      const targetUserId = userId || sessionManager.getUserId()
      DebugHelper.log('info', 'GET_CONV_MESSAGES', 'Carregando conversa e mensagens', { conversationId, userId: targetUserId })

      let conversation: ChatConversation | null = null
      let messages: ChatMessage[] = []
      let supabaseWorked = false

      // Tentar buscar do Supabase primeiro
      try {
        // Buscar conversa
        const { data: convData, error: convError } = await supabase
          .from('chat_conversations')
          .select('*')
          .eq('id', conversationId)
          .eq('user_id', targetUserId)
          .single()

        if (!convError && convData) {
          conversation = convData

          // Buscar mensagens
          const { data: messagesData, error: messagesError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })

          if (!messagesError && messagesData) {
            messages = messagesData
            supabaseWorked = true
            DebugHelper.log('info', 'GET_CONV_MESSAGES', `Carregadas ${messages.length} mensagens do Supabase`)
          } else {
            DebugHelper.log('warning', 'GET_CONV_MESSAGES', 'Erro ao buscar mensagens do Supabase', messagesError)
          }
        } else {
          DebugHelper.log('warning', 'GET_CONV_MESSAGES', 'Conversa não encontrada no Supabase', convError)
        }
      } catch (supabaseError) {
        DebugHelper.log('warning', 'GET_CONV_MESSAGES', 'Falha na conexão com Supabase', supabaseError)
      }

      // Se Supabase não funcionou, buscar backup local
      if (!supabaseWorked) {
        DebugHelper.log('info', 'GET_CONV_MESSAGES', 'Buscando no backup local')
        
        // Buscar conversa local
        const localConversations = this.getFromLocalStorage()
        const localConversation = localConversations.find(c => c.id === conversationId)
        
        if (localConversation) {
          conversation = localConversation
          messages = this.getMessagesFromLocalStorage(conversationId)
          DebugHelper.log('info', 'GET_CONV_MESSAGES', `Carregadas ${messages.length} mensagens do backup local`)
        } else {
          DebugHelper.log('warning', 'GET_CONV_MESSAGES', 'Conversa não encontrada nem no backup local')
        }
      }

      // Se encontrou a conversa, mas não tem mensagens, verificar se há mensagens locais
      if (conversation && messages.length === 0) {
        const localMessages = this.getMessagesFromLocalStorage(conversationId)
        if (localMessages.length > 0) {
          messages = localMessages
          DebugHelper.log('info', 'GET_CONV_MESSAGES', `Usando ${localMessages.length} mensagens do backup local como fallback`)
        }
      }

      return { conversation, messages }
    } catch (error) {
      DebugHelper.log('error', 'GET_CONV_MESSAGES', 'Erro crítico ao carregar conversa', error)
      
      // Tentar fallback total para dados locais
      const localConversations = this.getFromLocalStorage()
      const localConversation = localConversations.find(c => c.id === conversationId)
      const localMessages = this.getMessagesFromLocalStorage(conversationId)
      
      return { 
        conversation: localConversation || null, 
        messages: localMessages 
      }
    }
  }

  // Adicionar mensagem à conversa
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

      DebugHelper.log('info', 'ADD_MESSAGE', 'Adicionando mensagem', {
        conversationId: data.conversationId,
        role: data.role,
        contentLength: data.content.length
      })

      // Se é uma conversa temporária (ID começa com 'temp_'), só salvar localmente
      if (data.conversationId.startsWith('temp_')) {
        const localMessage = {
          id: `temp_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...messageData
        }
        this.saveMessageLocally(localMessage)
        this.updateLocalConversationStats(data.conversationId, data.content)
        DebugHelper.log('info', 'ADD_MESSAGE', 'Mensagem salva localmente (conversa temporária)', { id: localMessage.id })
        return localMessage
      }

      // Tentar salvar no Supabase primeiro
      try {
        const { data: message, error } = await supabase
          .from('chat_messages')
          .insert(messageData)
          .select()
          .single()

        if (error) {
          DebugHelper.log('warning', 'ADD_MESSAGE', 'Erro ao salvar no Supabase, mantendo local', error)
          // Criar versão local com ID temporário
          const localMessage = {
            id: `temp_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...messageData
          }
          this.saveMessageLocally(localMessage)
          this.updateLocalConversationStats(data.conversationId, data.content)
          return localMessage
        }

        DebugHelper.log('info', 'ADD_MESSAGE', 'Mensagem salva no Supabase com sucesso', { id: message.id })
        
        // Salvar também localmente para backup
        this.saveMessageLocally(message)
        this.updateLocalConversationStats(data.conversationId, data.content)
        
        return message
      } catch (supabaseError) {
        DebugHelper.log('warning', 'ADD_MESSAGE', 'Falha na conexão com Supabase, usando backup local', supabaseError)
        // Criar versão local com ID temporário
        const localMessage = {
          id: `temp_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...messageData
        }
        this.saveMessageLocally(localMessage)
        this.updateLocalConversationStats(data.conversationId, data.content)
        return localMessage
      }
    } catch (error) {
      DebugHelper.log('error', 'ADD_MESSAGE', 'Erro crítico ao adicionar mensagem', error)
      return null
    }
  }

  // Salvar mensagem localmente
  private saveMessageLocally(message: ChatMessage) {
    if (typeof window === 'undefined') return
    
    try {
      const messagesKey = `chat_messages_${message.conversation_id}`
      const existingMessages = this.getMessagesFromLocalStorage(message.conversation_id)
      
      existingMessages.push(message)
      
      // Manter apenas as últimas 100 mensagens por conversa
      if (existingMessages.length > 100) {
        existingMessages.splice(0, existingMessages.length - 100)
      }
      
      localStorage.setItem(messagesKey, JSON.stringify(existingMessages))
      DebugHelper.log('info', 'LOCAL_MESSAGE', `Mensagem salva localmente para conversa ${message.conversation_id}`)
    } catch (error) {
      DebugHelper.log('error', 'LOCAL_MESSAGE', 'Erro ao salvar mensagem localmente', error)
    }
  }

  private getMessagesFromLocalStorage(conversationId: string): ChatMessage[] {
    if (typeof window === 'undefined') return []
    
    try {
      const messagesKey = `chat_messages_${conversationId}`
      const messages = localStorage.getItem(messagesKey)
      return messages ? JSON.parse(messages) : []
    } catch (error) {
      DebugHelper.log('error', 'LOCAL_MESSAGE', 'Erro ao carregar mensagens locais', error)
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
        DebugHelper.log('info', 'LOCAL_UPDATE', 'Estatísticas da conversa atualizadas localmente')
      }
    } catch (error) {
      DebugHelper.log('error', 'LOCAL_UPDATE', 'Erro ao atualizar estatísticas locais', error)
    }
  }

  // Atualizar título da conversa
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

      if (error) {
        console.error('Erro ao atualizar título:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Erro inesperado ao atualizar título:', error)
      return false
    }
  }

  // Deletar conversa
  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      const userId = sessionManager.getUserId()

      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', userId)

      if (error) {
        console.error('Erro ao deletar conversa:', error)
        return false
      }

      console.log('Conversa deletada:', conversationId)
      return true
    } catch (error) {
      console.error('Erro inesperado ao deletar conversa:', error)
      return false
    }
  }

  // Verificar se o serviço está funcional
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .select('id')
        .limit(1)

      return !error
    } catch (error) {
      console.log('Health check falhou, tabelas podem não existir:', error)
      return false
    }
  }

  // Modo fallback para quando o banco não está disponível
  async createConversationFallback(title: string): Promise<{ id: string; title: string; isTemporary: true }> {
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    
    return {
      id: tempId,
      title: title.slice(0, 100),
      isTemporary: true
    }
  }

  // Limpar dados temporários (opcional)
  async cleanupOldData(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { count, error } = await supabase
        .from('chat_conversations')
        .delete({ count: 'exact' })
        .lt('updated_at', cutoffDate.toISOString())

      if (error) {
        console.error('Erro ao limpar dados antigos:', error)
        return 0
      }

      console.log(`Limpas ${count || 0} conversas antigas`)
      return count || 0
    } catch (error) {
      console.error('Erro inesperado na limpeza:', error)
      return 0
    }
  }
}

export const chatService = ChatService.getInstance()
export default chatService 