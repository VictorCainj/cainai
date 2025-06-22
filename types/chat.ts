// Tipos base para mensagens
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  created_at?: string
  updated_at?: string
  imageUrl?: string
  audioUrl?: string
  metadata?: MessageMetadata
}

export interface MessageMetadata {
  tokensUsed?: number
  responseTime?: number
  model?: string
  ttsGenerated?: boolean
  imageGenerated?: boolean
  context7Used?: boolean
  cacheHit?: boolean
}

// Tipos para conversas
export interface Conversation {
  id: string
  title: string
  userId: string
  created_at: string
  updated_at: string
  last_message?: string
  message_count: number
  isActive: boolean
  metadata?: ConversationMetadata
}

export interface ConversationMetadata {
  tags?: string[]
  category?: string
  priority?: 'low' | 'medium' | 'high'
  totalTokens?: number
  averageResponseTime?: number
  ttsUsageCount?: number
  imageGenerationCount?: number
}

// Tipos para API responses
export interface ChatResponse {
  message: string
  imageUrl?: string
  conversationId: string
  conversationTitle?: string
  success: boolean
  isTemporary?: boolean
  usage?: TokenUsage
  model: string
  contextUsed?: number
  superMemoryActive?: boolean
  dalleGenerated?: boolean
  context7?: Context7Response
  metadata?: ResponseMetadata
}

export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface Context7Response {
  enabled: boolean
  librariesDetected: string[]
  tokensUsed: number
  documentation?: string
}

export interface ResponseMetadata {
  responseTime: number
  cacheUsed: boolean
  modelVersion: string
  features: string[]
}

// Tipos para TTS
export interface TTSRequest {
  text: string
  voice?: 'nova' | 'ash' | 'alloy' | 'echo' | 'fable' | 'onyx' | 'shimmer'
  speed?: number
  model?: 'tts-1' | 'tts-1-hd'
}

export interface TTSResponse {
  audioUrl: string
  duration?: number
  success: boolean
  error?: string
  metadata?: TTSMetadata
}

export interface TTSMetadata {
  voice: string
  speed: number
  textLength: number
  generationTime: number
  cacheHit?: boolean
}

// Tipos para geração de imagens
export interface ImageGenerationRequest {
  prompt: string
  model?: 'dall-e-3' | 'dall-e-2'
  quality?: 'standard' | 'hd'
  size?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024'
  style?: 'vivid' | 'natural'
  n?: number
}

export interface ImageGenerationResponse {
  imageUrl: string
  prompt: string
  revisedPrompt?: string
  success: boolean
  error?: string
  metadata?: ImageMetadata
}

export interface ImageMetadata {
  model: string
  quality: string
  size: string
  generationTime: number
  originalPrompt: string
  revisedPrompt?: string
}

// Tipos para estados de loading
export interface LoadingState {
  sendingMessage: boolean
  loadingConversation: boolean
  loadingHistory: boolean
  savingMessage: boolean
  generatingTTS: boolean
  generatingImage: boolean
}

// Tipos para configurações
export interface ChatSettings {
  model: 'gpt-4-turbo' | 'gpt-4' | 'gpt-3.5-turbo'
  maxTokens: number
  temperature: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  systemPrompt?: string
}

export interface TTSSettings {
  voice: TTSRequest['voice']
  speed: number
  model: TTSRequest['model']
  autoPlay: boolean
  showControls: boolean
}

export interface ImageSettings {
  model: ImageGenerationRequest['model']
  quality: ImageGenerationRequest['quality']
  size: ImageGenerationRequest['size']
  style: ImageGenerationRequest['style']
  autoGenerate: boolean
}

export interface UserSettings {
  chat: ChatSettings
  tts: TTSSettings
  image: ImageSettings
  ui: UISettings
  privacy: PrivacySettings
}

export interface UISettings {
  theme: 'light' | 'dark' | 'system'
  fontSize: 'small' | 'medium' | 'large'
  messageAnimation: boolean
  compactMode: boolean
  showTimestamps: boolean
  showTokenUsage: boolean
}

export interface PrivacySettings {
  saveConversations: boolean
  shareAnalytics: boolean
  cacheImages: boolean
  cacheTTS: boolean
}

// Tipos para eventos e analytics
export interface AnalyticsEvent {
  type: string
  data: Record<string, any>
  timestamp: number
  sessionId: string
  userId?: string
}

export interface SessionMetrics {
  startTime: number
  endTime?: number
  messageCount: number
  conversationCount: number
  ttsUsage: number
  imageGeneration: number
  errors: number
}

// Tipos para erros
export interface ErrorInfo {
  code: string
  message: string
  details?: any
  timestamp: number
  context?: string
  recoverable: boolean
}

export interface APIError extends Error {
  code: string
  status?: number
  details?: any
  recoverable?: boolean
}

// Tipos para cache
export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  key: string
}

// Tipos utilitários
export type MessageRole = Message['role']
export type ConversationStatus = 'active' | 'archived' | 'deleted'
export type FeatureFlag = 'tts' | 'image_generation' | 'context7' | 'analytics' | 'cache'

// Guards de tipo
export const isMessage = (obj: any): obj is Message => {
  return obj && typeof obj === 'object' && 
         typeof obj.id === 'string' && 
         typeof obj.role === 'string' && 
         typeof obj.content === 'string'
}

export const isConversation = (obj: any): obj is Conversation => {
  return obj && typeof obj === 'object' && 
         typeof obj.id === 'string' && 
         typeof obj.title === 'string' && 
         typeof obj.userId === 'string'
}

export const isChatResponse = (obj: any): obj is ChatResponse => {
  return obj && typeof obj === 'object' && 
         typeof obj.message === 'string' && 
         typeof obj.success === 'boolean'
}

// Tipos para hooks customizados
export interface UseChatReturn {
  messages: Message[]
  sendMessage: (content: string) => Promise<void>
  isLoading: boolean
  error: string | null
  conversationId: string | null
  startNewConversation: () => void
  loadConversation: (id: string) => Promise<void>
}

export interface UseConversationsReturn {
  conversations: Conversation[]
  isLoading: boolean
  error: string | null
  createConversation: (title: string) => Promise<Conversation | null>
  deleteConversation: (id: string) => Promise<boolean>
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<boolean>
  refreshConversations: () => Promise<void>
}

export interface UseTTSReturn {
  playAudio: (messageId: string, content: string) => Promise<void>
  stopAudio: (messageId: string) => void
  isPlaying: (messageId: string) => boolean
  isLoading: (messageId: string) => boolean
  settings: TTSSettings
  updateSettings: (settings: Partial<TTSSettings>) => void
}

// Tipos auxiliares para re-exportação
export type MessageType = Message
export type ConversationType = Conversation
export type ChatResponseType = ChatResponse
export type LoadingStateType = LoadingState
export type UserSettingsType = UserSettings
export type AnalyticsEventType = AnalyticsEvent
export type ErrorInfoType = ErrorInfo 