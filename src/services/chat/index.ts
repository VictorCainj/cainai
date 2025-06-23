// Chat Services - Serviços especializados para operações de chat
export { ConversationService } from './ConversationService'
export { MessageService } from './MessageService'
export { ChatApiService } from './ChatApiService'

// Storage Services
export { LocalStorageService } from '../storage/LocalStorageService'

// Imports for instances
import { ConversationService } from './ConversationService'
import { MessageService } from './MessageService'
import { ChatApiService } from './ChatApiService'
import { LocalStorageService } from '../storage/LocalStorageService'

// Service instances - Instâncias singleton prontas para uso
export const conversationService = ConversationService.getInstance()
export const messageService = MessageService.getInstance()
export const chatApiService = ChatApiService.getInstance()
export const localStorageService = LocalStorageService.getInstance()

// Legacy export for compatibility
export { chatApiService as chatService } 