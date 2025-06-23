// Constantes da aplicação
export const APP_NAME = 'CDI - Assistente de Produtividade'
export const APP_VERSION = '2.0.0'
export const APP_DESCRIPTION = 'Assistente IA com super memória e funcionalidades avançadas'

// Limites de mensagens
export const MAX_MESSAGE_LENGTH = 4000
export const MAX_MESSAGES_PER_CONVERSATION = 1000
export const MAX_CONVERSATIONS_PER_USER = 500

// Configurações de TTS
export const TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const
export const DEFAULT_TTS_VOICE = 'nova'
export const DEFAULT_TTS_SPEED = 1.1
export const MAX_TTS_TEXT_LENGTH = 2000

// Configurações de upload/geração de imagem
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
export const SUPPORTED_IMAGE_FORMATS = ['png', 'jpg', 'jpeg', 'webp'] as const
export const MAX_IMAGE_GENERATION_RETRIES = 3

// Configurações de cache
export const CACHE_EXPIRY_TIME = 5 * 60 * 1000 // 5 minutos
export const MAX_CACHE_SIZE = 100 * 1024 * 1024 // 100MB
export const CACHE_CLEANUP_INTERVAL = 30 * 60 * 1000 // 30 minutos

// Configurações de performance
export const VIRTUAL_SCROLLING_THRESHOLD = 100
export const LAZY_LOADING_PAGE_SIZE = 20
export const DEBOUNCE_DELAY = 300

// URLs e endpoints
export const API_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
export const API_ROUTES = {
  CHAT: '/api/chat',
  TTS: '/api/tts',
  GENERATE_IMAGE: '/api/generate-image',
  DOWNLOAD_IMAGE: '/api/download-image',
  CONVERSATIONS: '/api/conversations',
} as const

// Configurações de animação
export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
} as const

// Configurações de notificação
export const NOTIFICATION_DURATION = 3000
export const ERROR_RETRY_ATTEMPTS = 3
export const ERROR_RETRY_DELAY = 1000 