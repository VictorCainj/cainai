// Verificador de Configuração de Ambiente

export interface EnvConfig {
  supabaseUrl: string | null
  supabaseAnonKey: string | null
  supabaseServiceKey: string | null
  openaiKey: string | null
  isSupabaseConfigured: boolean
  isOpenAIConfigured: boolean
  canPersist: boolean
  canChat: boolean
}

export function checkEnvironment(): EnvConfig {
  const config: EnvConfig = {
    supabaseUrl: null,
    supabaseAnonKey: null,
    supabaseServiceKey: null,
    openaiKey: null,
    isSupabaseConfigured: false,
    isOpenAIConfigured: false,
    canPersist: false,
    canChat: false
  }

  // Verificar lado do cliente
  if (typeof window !== 'undefined') {
    config.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null
    config.supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null
    
    // Service key não é acessível no cliente (e não deveria ser)
    config.supabaseServiceKey = 'hidden' // Sempre hidden no cliente
  } else {
    // Lado do servidor
    config.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null
    config.supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null
    config.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null
    config.openaiKey = process.env.OPENAI_API_KEY || null
  }

  // Determinar status de configuração
  config.isSupabaseConfigured = !!(config.supabaseUrl && config.supabaseAnonKey)
  config.isOpenAIConfigured = !!config.openaiKey
  
  // Capacidades do sistema
  config.canPersist = true // SEMPRE pode persistir localmente
  config.canChat = config.isOpenAIConfigured

  return config
}

export function printEnvironmentStatus() {
  const config = checkEnvironment()
  
  console.log('🔧 === STATUS DA CONFIGURAÇÃO ===')
  console.log(`📍 Supabase URL: ${config.supabaseUrl ? '✅ Configurada' : '❌ Não configurada'}`)
  console.log(`🔑 Supabase Anon Key: ${config.supabaseAnonKey ? '✅ Configurada' : '❌ Não configurada'}`)
  console.log(`🤖 OpenAI Key: ${config.isOpenAIConfigured ? '✅ Configurada' : '❌ Não configurada'}`)
  console.log(`💾 Persistência: ${config.canPersist ? '✅ Disponível (local)' : '❌ Indisponível'}`)
  console.log(`💬 Chat: ${config.canChat ? '✅ Disponível' : '❌ Requer OpenAI Key'}`)
  
  if (config.isSupabaseConfigured) {
    console.log('🎯 Modo: COMPLETO (Supabase + Local)')
  } else {
    console.log('⚠️ Modo: LOCAL (apenas localStorage)')
  }
  
  return config
}

export function getRequiredEnvVars(): string[] {
  const missing: string[] = []
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL')
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  
  if (!process.env.OPENAI_API_KEY) {
    missing.push('OPENAI_API_KEY')
  }
  
  return missing
}

export function createEnvExample(): string {
  return `# Arquivo .env.local (crie na raiz do projeto)

# === OBRIGATÓRIO PARA CHAT ===
OPENAI_API_KEY=sua_chave_openai_aqui

# === OPCIONAL PARA PERSISTÊNCIA COMPLETA ===
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui

# === NOTAS ===
# - Sem OpenAI: aplicação funciona mas não responde
# - Sem Supabase: conversas só ficam no localStorage
# - Com tudo: funcionalidade completa
`
} 