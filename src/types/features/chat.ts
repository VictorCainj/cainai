// Base types para chat
export interface Message {
  readonly id: string
  readonly role: 'user' | 'assistant' | 'system'
  readonly content: string
  readonly timestamp: Date
  readonly created_at?: string
  readonly imageUrl?: string
  readonly metadata?: MessageMetadata
}

export interface MessageMetadata {
  readonly conversationId?: string
  readonly tokens?: number
  readonly model?: string
  readonly temperature?: number
  readonly context7Used?: boolean
  readonly ttsGenerated?: boolean
  readonly audioUrl?: string
}

export interface Conversation {
  readonly id: string
  readonly title: string
  readonly created_at: string
  readonly updated_at: string
  readonly user_id: string
  readonly message_count?: number
  readonly last_message?: string
  readonly isArchived?: boolean
  readonly isTemporary?: boolean
}

export interface ConversationWithMessages extends Conversation {
  readonly messages: Message[]
  readonly messageCount: number
  readonly lastMessageTime?: string
  readonly unreadCount?: number
}

// Loading states
export interface LoadingState {
  readonly sendingMessage: boolean
  readonly loadingConversation: boolean
  readonly loadingHistory: boolean
  readonly savingMessage: boolean
  readonly generatingTTS: boolean
  readonly generatingImage: boolean
  readonly thinking?: boolean
}

// TTS types
export interface TTSSettings {
  readonly isEnabled: boolean
  readonly selectedVoice: string
  readonly speed: number
  readonly autoPlay: boolean
}

export interface TTSVoice {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly preview?: string
}

// Audio state
export interface AudioState {
  readonly [messageId: string]: {
    readonly playing: boolean
    readonly loading: boolean
    readonly audio?: HTMLAudioElement
    readonly duration?: number
    readonly currentTime?: number
  }
}

// Chat context
export interface ChatState {
  readonly messages: Message[]
  readonly currentConversation: Conversation | null
  readonly loadingState: LoadingState
  readonly connectionStatus: 'connecting' | 'connected' | 'error'
  readonly error: ChatError | null
  readonly audioState: AudioState
}

export interface ChatActions {
  readonly sendMessage: (content: string) => Promise<void>
  readonly loadConversation: (id: string) => Promise<void>
  readonly startNewConversation: () => void
  readonly addMessage: (message: Message) => void
  readonly updateMessage: (id: string, updates: Partial<Message>) => void
  readonly deleteMessage: (id: string) => void
  readonly playAudio: (messageId: string, content: string) => Promise<void>
  readonly stopAudio: (messageId: string) => void
  readonly copyMessage: (content: string, messageId: string) => Promise<void>
}

// Error types
export interface ChatError {
  readonly code: string
  readonly message: string
  readonly details?: string
  readonly timestamp: Date
  readonly retryable: boolean
}

// API request/response types
export interface SendMessageRequest {
  readonly message: string
  readonly conversationId?: string | null
  readonly userId: string
  readonly fullContext?: Array<{
    readonly role: string
    readonly content: string
    readonly timestamp: Date
  }>
}

export interface SendMessageResponse {
  readonly message: string
  readonly conversationId?: string
  readonly conversationTitle?: string
  readonly imageUrl?: string
  readonly error?: string
}

export interface ConversationResponse {
  readonly success: boolean
  readonly conversation?: Conversation
  readonly messages?: Message[]
  readonly error?: string
}

// Utility types
export type MessageWithoutId = Omit<Message, 'id'>
export type MessageUpdate = Partial<Pick<Message, 'content' | 'metadata'>>
export type ConversationUpdate = Partial<Pick<Conversation, 'title' | 'isArchived'>>

// Form types
export interface CreateConversationData {
  readonly title: string
  readonly userId?: string
}

export interface CreateMessageData {
  readonly conversationId: string
  readonly role: Message['role']
  readonly content: string
  readonly metadata?: MessageMetadata
}

// Search and filter types
export interface ConversationFilter {
  readonly searchTerm?: string
  readonly isArchived?: boolean
  readonly dateRange?: {
    readonly start: Date
    readonly end: Date
  }
  readonly limit?: number
  readonly offset?: number
}

export interface MessageFilter {
  readonly conversationId: string
  readonly limit?: number
  readonly cursor?: string
  readonly searchTerm?: string
}

// Pagination
export interface PaginationResult<T> {
  readonly items: T[]
  readonly hasMore: boolean
  readonly nextCursor?: string
  readonly totalCount?: number
}

export type ConversationList = PaginationResult<Conversation>
export type MessageList = PaginationResult<Message> 