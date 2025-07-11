import { ConversationService } from './ConversationService'
import { MessageService } from './MessageService'
import { LocalStorageService } from '../storage/LocalStorageService'
import { 
  Conversation, 
  Message, 
  ConversationWithMessages, 
  CreateConversationData, 
  CreateMessageData
} from '../../types/features/chat'

export class ChatApiService {
  private static instance: ChatApiService
  private conversationService: ConversationService
  private messageService: MessageService
  private localStorageService: LocalStorageService

  public static getInstance(): ChatApiService {
    if (!ChatApiService.instance) {
      ChatApiService.instance = new ChatApiService()
    }
    return ChatApiService.instance
  }

  constructor() {
    this.conversationService = ConversationService.getInstance()
    this.messageService = MessageService.getInstance()
    this.localStorageService = LocalStorageService.getInstance()
  }

  // Criar nova conversa
  async createConversation(data: CreateConversationData): Promise<Conversation | null> {
    try {
      const conversation = await this.conversationService.createConversation(data)
      
      if (conversation && data.userId) {
        // Salvar no localStorage como backup
        this.localStorageService.saveConversations(data.userId, [{
          ...conversation,
          messages: [],
          messageCount: 0,
          lastMessageTime: conversation.created_at
        }])
      }
      
      return conversation
    } catch (error) {
      console.error('Erro ao criar conversa:', error)
      return null
    }
  }

  // Buscar conversas do usuário
  async getUserConversations(userId: string): Promise<ConversationWithMessages[]> {
    try {
      const serverConversations = await this.conversationService.getUserConversations(userId)
      
      if (serverConversations.items.length > 0) {
        // Converter para ConversationWithMessages para compatibilidade
        const conversationsWithMessages: ConversationWithMessages[] = serverConversations.items.map(conv => ({
          ...conv,
          messages: [],
          messageCount: 0,
          lastMessageTime: conv.updated_at
        }))
        
        this.localStorageService.saveConversations(userId, conversationsWithMessages)
        return conversationsWithMessages
      }
      
      return this.localStorageService.getConversations(userId)
      
    } catch (error) {
      console.error('Erro ao buscar conversas:', error)
      return this.localStorageService.getConversations(userId)
    }
  }

  // Buscar conversa com mensagens
  async getConversationWithMessages(conversationId: string, userId: string): Promise<{
    conversation: Conversation | null
    messages: Message[]
  }> {
    try {
      const conversation = await this.conversationService.getConversation(conversationId, userId)
      
      if (!conversation) {
        return { conversation: null, messages: [] }
      }
      
      const messages = await this.messageService.getConversationMessages(conversationId)
      
      return { conversation, messages }
      
    } catch (error) {
      console.error('Erro ao buscar conversa com mensagens:', error)
      
      const localConversations = this.localStorageService.getConversations(userId)
      const localConversation = localConversations.find(c => c.id === conversationId)
      const localMessages = this.localStorageService.getConversationMessages(conversationId)
      
      return {
        conversation: localConversation || null,
        messages: localMessages
      }
    }
  }

  // Adicionar mensagem
  async addMessage(data: CreateMessageData): Promise<Message | null> {
    try {
      const message = await this.messageService.createMessage(data)
      
      if (message) {
        this.localStorageService.addMessage(data.conversationId, message)
      }
      
      return message
    } catch (error) {
      console.error('Erro ao adicionar mensagem:', error)
      return null
    }
  }

  // Deletar conversa
  async deleteConversation(conversationId: string, userId: string): Promise<boolean> {
    try {
      const serverDeleted = await this.conversationService.deleteConversation(conversationId, userId)
      this.localStorageService.removeConversation(conversationId, userId)
      
      return serverDeleted
    } catch (error) {
      console.error('Erro ao deletar conversa:', error)
      this.localStorageService.removeConversation(conversationId, userId)
      return false
    }
  }
}
