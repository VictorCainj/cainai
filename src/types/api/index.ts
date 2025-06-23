// Base API types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: string
}

export interface ApiError {
  code: string
  message: string
  details?: string
  statusCode?: number
  timestamp: Date
}

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// Request config
export interface ApiRequestConfig {
  method: HttpMethod
  url: string
  data?: any
  params?: Record<string, any>
  headers?: Record<string, string>
  timeout?: number
  retries?: number
}

// Pagination
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
  cursor?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
    nextCursor?: string
  }
}

// Supabase specific types
export interface SupabaseResponse<T> {
  data: T | null
  error: SupabaseError | null
  count?: number
  status: number
  statusText: string
}

export interface SupabaseError {
  message: string
  details: string
  hint: string
  code: string
}

// OpenAI API types
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OpenAIRequest {
  model: string
  messages: OpenAIMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: OpenAIMessage
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// TTS API types
export interface TTSRequest {
  text: string
  voice: string
  model?: string
  speed?: number
}

export interface TTSResponse {
  audioUrl: string
  duration?: number
  size: number
}

// Image generation types
export interface ImageGenerationRequest {
  prompt: string
  model?: string
  size?: string
  quality?: string
  n?: number
}

export interface ImageGenerationResponse {
  images: Array<{
    url: string
    revised_prompt?: string
  }>
}

// File upload types
export interface FileUploadRequest {
  file: File
  filename?: string
  folder?: string
}

export interface FileUploadResponse {
  url: string
  filename: string
  size: number
  type: string
} 