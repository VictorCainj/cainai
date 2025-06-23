import { 
  APP_NAME, 
  APP_VERSION, 
  APP_DESCRIPTION,
  DEFAULT_TTS_VOICE,
  DEFAULT_TTS_SPEED,
  CACHE_EXPIRY_TIME,
  MAX_CACHE_SIZE,
  VIRTUAL_SCROLLING_THRESHOLD,
  LAZY_LOADING_PAGE_SIZE,
  DEBOUNCE_DELAY 
} from '../constants/app'

interface AppConfig {
  app: {
    name: string
    version: string
    description: string
    isDevelopment: boolean
    isProduction: boolean
  }
  api: {
    baseUrl: string
    timeout: number
    retries: number
  }
  features: {
    tts: {
      enabled: boolean
      defaultVoice: string
      defaultSpeed: number
    }
    imageGeneration: {
      enabled: boolean
      maxRetries: number
    }
    virtualScrolling: {
      enabled: boolean
      threshold: number
    }
    lazyLoading: {
      enabled: boolean
      pageSize: number
    }
    cache: {
      enabled: boolean
      expiryTime: number
      maxSize: number
    }
  }
  ui: {
    theme: {
      defaultMode: 'system' | 'light' | 'dark'
    }
    animations: {
      enabled: boolean
      reducedMotion: boolean
    }
    debounceDelay: number
  }
  storage: {
    prefix: string
    encryptionEnabled: boolean
  }
}

export const appConfig: AppConfig = {
  app: {
    name: APP_NAME,
    version: APP_VERSION,
    description: APP_DESCRIPTION,
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    timeout: 30000, // 30 segundos
    retries: 3,
  },
  features: {
    tts: {
      enabled: true,
      defaultVoice: DEFAULT_TTS_VOICE,
      defaultSpeed: DEFAULT_TTS_SPEED,
    },
    imageGeneration: {
      enabled: true,
      maxRetries: 3,
    },
    virtualScrolling: {
      enabled: true,
      threshold: VIRTUAL_SCROLLING_THRESHOLD,
    },
    lazyLoading: {
      enabled: true,
      pageSize: LAZY_LOADING_PAGE_SIZE,
    },
    cache: {
      enabled: true,
      expiryTime: CACHE_EXPIRY_TIME,
      maxSize: MAX_CACHE_SIZE,
    },
  },
  ui: {
    theme: {
      defaultMode: 'system',
    },
    animations: {
      enabled: true,
      reducedMotion: false,
    },
    debounceDelay: DEBOUNCE_DELAY,
  },
  storage: {
    prefix: 'cdi_',
    encryptionEnabled: false,
  },
}

// Função para obter configuração específica
export function getConfig<T extends keyof AppConfig>(section: T): AppConfig[T] {
  return appConfig[section]
}

// Função para verificar se uma feature está habilitada
export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
  return appConfig.features[feature].enabled
}

// Função para obter configuração da API
export function getApiConfig() {
  return appConfig.api
}

// Função para verificar ambiente
export function isDevelopment(): boolean {
  return appConfig.app.isDevelopment
}

export function isProduction(): boolean {
  return appConfig.app.isProduction
} 