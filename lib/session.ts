import { supabase } from './supabase'
import React from 'react'

export interface SessionUser {
  id: string
  isAnonymous: boolean
  profile?: {
    username?: string
    full_name?: string
    avatar_url?: string
  }
}

class SessionManager {
  private static instance: SessionManager
  private currentUser: SessionUser | null = null
  private sessionKey = 'chat_session_user'

  private constructor() {
    this.initializeSession()
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  private initializeSession() {
    if (typeof window !== 'undefined') {
      const savedSession = localStorage.getItem(this.sessionKey)
      if (savedSession) {
        try {
          this.currentUser = JSON.parse(savedSession)
        } catch (error) {
          this.createAnonymousUser()
        }
      } else {
        this.createAnonymousUser()
      }
    }
  }

  private createAnonymousUser() {
    const anonymousId = this.generateUUID()
    this.currentUser = {
      id: anonymousId,
      isAnonymous: true,
      profile: {
        username: `user_${anonymousId.slice(0, 8)}`,
        full_name: 'Usuário Anônimo'
      }
    }
    this.saveSession()
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  private saveSession() {
    if (typeof window !== 'undefined' && this.currentUser) {
      localStorage.setItem(this.sessionKey, JSON.stringify(this.currentUser))
    }
  }

  public getCurrentUser(): SessionUser | null {
    return this.currentUser
  }

  public getUserId(): string {
    if (!this.currentUser) {
      this.createAnonymousUser()
    }
    return this.currentUser!.id
  }

  public async createOrUpdateProfile(updates: Partial<SessionUser['profile']>) {
    if (!this.currentUser) return null

    try {
      // Tentar atualizar perfil no Supabase (se tabelas existirem)
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: this.currentUser.id,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (!error && data) {
        this.currentUser.profile = { ...this.currentUser.profile, ...updates }
        this.saveSession()
        return data
      }
    } catch (error) {
      // Silent fallback to local
    }

    // Fallback: salvar apenas localmente
    this.currentUser.profile = { ...this.currentUser.profile, ...updates }
    this.saveSession()
    return this.currentUser.profile
  }

  public async signInWithSupabase(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.getSession()
      
      if (error || !data.session) {
        return false
      }

      const user = data.session.user
      this.currentUser = {
        id: user.id,
        isAnonymous: false,
        profile: {
          username: user.user_metadata?.username || user.email?.split('@')[0],
          full_name: user.user_metadata?.full_name || user.email,
          avatar_url: user.user_metadata?.avatar_url
        }
      }

      this.saveSession()
      return true
    } catch (error) {
      return false
    }
  }

  public signOut() {
    this.currentUser = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.sessionKey)
    }
    this.createAnonymousUser()
  }

  public async transferDataToNewUser(newUserId: string): Promise<boolean> {
    if (!this.currentUser || this.currentUser.id === newUserId) {
      return false
    }

    try {
      // Transferir conversas para o novo usuário
      const { error } = await supabase
        .from('chat_conversations')
        .update({ user_id: newUserId })
        .eq('user_id', this.currentUser.id)

      if (error) {
        return false
      }

      return true
    } catch (error) {
      return false
    }
  }

  public getSessionInfo() {
    return {
      userId: this.getUserId(),
      isAnonymous: this.currentUser?.isAnonymous || true,
      profile: this.currentUser?.profile,
      hasValidSession: !!this.currentUser
    }
  }


}

export const sessionManager = SessionManager.getInstance()

// Hook para React components
export function useSession() {
  const [sessionInfo, setSessionInfo] = React.useState(sessionManager.getSessionInfo())

  React.useEffect(() => {
    const interval = setInterval(() => {
      setSessionInfo(sessionManager.getSessionInfo())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return {
    ...sessionInfo,
    signOut: () => sessionManager.signOut(),
    updateProfile: (updates: any) => sessionManager.createOrUpdateProfile(updates),
    transferData: (newUserId: string) => sessionManager.transferDataToNewUser(newUserId)
  }
}

// Exportar instância padrão
export default sessionManager 