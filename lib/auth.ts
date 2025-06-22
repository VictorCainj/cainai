import { supabase } from './supabase'
import { User, Session, AuthError } from '@supabase/supabase-js'

export type AuthUser = User | null

export interface AuthResponse {
  user: AuthUser
  error: AuthError | null
  success: boolean
}

export interface RegisterData {
  email: string
  password: string
  fullName: string
}

export interface LoginData {
  email: string
  password: string
}

class AuthService {
  private sessionCache: { session: Session | null; timestamp: number } | null = null
  private readonly CACHE_DURATION = 30000 // 30 segundos

  // Obter usuário atual
  async getCurrentUser(): Promise<AuthUser> {
    try {
      const { data: { user } } = await Promise.race([
        supabase.auth.getUser(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('getUser timeout')), 5000)
        )
      ])
      return user || null
    } catch (error) {
      console.warn('getCurrentUser error:', error)
      return null
    }
  }

  // Obter sessão atual com cache e timeout
  async getCurrentSession(): Promise<Session | null> {
    try {
      // Verificar cache primeiro
      const now = Date.now()
      if (this.sessionCache && (now - this.sessionCache.timestamp) < this.CACHE_DURATION) {
        return this.sessionCache.session
      }

      // Buscar nova sessão com timeout
      const { data: { session } } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('getSession timeout')), 5000)
        )
      ])
      
      // Atualizar cache
      this.sessionCache = { session, timestamp: now }
      
      return session
    } catch (error) {
      console.warn('getCurrentSession error:', error)
      // Retornar cache se houver erro
      return this.sessionCache?.session || null
    }
  }

  // Limpar cache quando necessário
  private clearSessionCache() {
    this.sessionCache = null
  }

  // Registrar novo usuário
  async register({ email, password, fullName }: RegisterData): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: undefined // Desabilitar confirmação de email
        }
      })

      if (error) {
        return { user: null, error, success: false }
      }

      // Criar perfil do usuário
      if (data.user) {
        await this.createUserProfile(data.user, fullName)
      }

      return { user: data.user, error: null, success: true }
    } catch (error) {
      return { 
        user: null, 
        error: error as AuthError, 
        success: false 
      }
    }
  }

  // Login de usuário
  async login({ email, password }: LoginData): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      // Limpar cache ao fazer login
      if (!error) {
        this.clearSessionCache()
      }

      return { 
        user: data.user, 
        error, 
        success: !error 
      }
    } catch (error) {
      return { 
        user: null, 
        error: error as AuthError, 
        success: false 
      }
    }
  }

  // Login com Google
  async loginWithGoogle(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { error }
  }

  // Login com GitHub
  async loginWithGitHub(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    return { error }
  }

  // Logout
  async logout(): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.signOut()
    // Limpar cache ao fazer logout
    this.clearSessionCache()
    return { error }
  }

  // Reset de senha
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    return { error }
  }

  // Atualizar senha
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { error }
  }

  // Atualizar perfil
  async updateProfile(updates: { fullName?: string; avatarUrl?: string }): Promise<{ error: AuthError | null }> {
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: updates.fullName,
        avatar_url: updates.avatarUrl
      }
    })
    return { error }
  }

  // Criar perfil do usuário na tabela profiles
  private async createUserProfile(user: User, fullName: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: fullName,
          username: user.email?.split('@')[0] || '',
          preferences: {
            theme: 'dark',
            language: 'pt-BR'
          }
        })
      
      if (error) {
        // Silent fail
      }
    } catch (error) {
      // Silent fail
    }
  }

  // Buscar perfil existente com timeout
  async getUserProfile(): Promise<any> {
    try {
      const session = await this.getCurrentSession()
      if (!session?.user) return null

      // Buscar perfil com timeout
      const profilePromise = Promise.race([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Profile timeout')), 3000)
        )
      ])

      const { data, error } = await profilePromise

      if (error) {
        console.warn('getUserProfile error:', error)
        return null
      }

      return data
    } catch (error) {
      console.warn('getUserProfile timeout or error:', error)
      return null
    }
  }

  // Migrar conversas anônimas para usuário autenticado
  async migrateAnonymousConversations(anonymousUserId: string, authenticatedUserId: string) {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ user_id: authenticatedUserId })
        .eq('user_id', anonymousUserId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
    }
  }

  // Escutar mudanças de auth
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }

  // Verificar se usuário está autenticado
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getCurrentSession()
    return !!session
  }
}

export const authService = new AuthService() 