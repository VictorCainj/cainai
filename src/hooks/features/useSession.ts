"use client"

import { useState, useEffect, useCallback } from 'react'

export interface SessionUser {
  id: string
  email?: string
  name?: string
  avatar?: string
  isAnonymous: boolean
  profile?: {
    preferences?: Record<string, any>
    settings?: Record<string, any>
  }
}

interface UseSessionReturn {
  user: SessionUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  updateProfile: (updates: Partial<SessionUser['profile']>) => void
  transferData: (newUserId: string) => Promise<boolean>
}

// Session Manager - Singleton para gerenciar sessão
class SessionManager {
  private static instance: SessionManager
  private currentUser: SessionUser | null = null
  private listeners: Set<(user: SessionUser | null) => void> = new Set()

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  constructor() {
    this.loadSessionFromStorage()
  }

  // Carregar sessão do localStorage
  private loadSessionFromStorage() {
    if (typeof window === 'undefined') return

    try {
      const savedSession = localStorage.getItem('user_session')
      if (savedSession) {
        this.currentUser = JSON.parse(savedSession)
      }
    } catch (error) {
      console.error('Erro ao carregar sessão:', error)
      localStorage.removeItem('user_session')
    }
  }

  // Salvar sessão no localStorage
  private saveSessionToStorage() {
    if (typeof window === 'undefined') return

    try {
      if (this.currentUser) {
        localStorage.setItem('user_session', JSON.stringify(this.currentUser))
      } else {
        localStorage.removeItem('user_session')
      }
    } catch (error) {
      console.error('Erro ao salvar sessão:', error)
    }
  }

  // Notificar listeners sobre mudanças na sessão
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentUser))
  }

  // Adicionar listener
  addListener(listener: (user: SessionUser | null) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Obter usuário atual
  getCurrentUser(): SessionUser | null {
    return this.currentUser
  }

  // Obter ID do usuário (com fallback para usuário anônimo)
  getUserId(): string {
    if (this.currentUser) {
      return this.currentUser.id
    }

    // Criar usuário anônimo se não existir
    const anonymousId = this.getOrCreateAnonymousId()
    this.setAnonymousUser(anonymousId)
    return anonymousId
  }

  // Obter ou criar ID anônimo
  private getOrCreateAnonymousId(): string {
    if (typeof window === 'undefined') return 'anonymous'

    let anonymousId = localStorage.getItem('anonymous_user_id')
    if (!anonymousId) {
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('anonymous_user_id', anonymousId)
    }
    return anonymousId
  }

  // Definir usuário anônimo
  private setAnonymousUser(id: string) {
    this.currentUser = {
      id,
      isAnonymous: true,
      name: 'Usuário Anônimo'
    }
    this.saveSessionToStorage()
    this.notifyListeners()
  }

  // Login
  async login(email: string, password: string): Promise<boolean> {
    try {
      // Aqui seria a chamada real para a API de autenticação
      // Por simplicidade, vou simular
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (response.ok) {
        const data = await response.json()
        this.currentUser = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          avatar: data.user.avatar,
          isAnonymous: false,
          profile: data.user.profile || {}
        }

        this.saveSessionToStorage()
        this.notifyListeners()
        return true
      }

      return false
    } catch (error) {
      console.error('Erro no login:', error)
      return false
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Erro no logout:', error)
    } finally {
      this.currentUser = null
      this.saveSessionToStorage()
      this.notifyListeners()

      // Recriar usuário anônimo
      const anonymousId = this.getOrCreateAnonymousId()
      this.setAnonymousUser(anonymousId)
    }
  }

  // Atualizar perfil
  updateProfile(updates: Partial<SessionUser['profile']>) {
    if (!this.currentUser) return

    this.currentUser = {
      ...this.currentUser,
      profile: {
        ...this.currentUser.profile,
        ...updates
      }
    }

    this.saveSessionToStorage()
    this.notifyListeners()
  }

  // Transferir dados para novo usuário
  async transferData(newUserId: string): Promise<boolean> {
    try {
      // Implementação da transferência de dados
      // seria feita aqui via API
      return true
    } catch (error) {
      console.error('Erro ao transferir dados:', error)
      return false
    }
  }

  // Refresh da sessão
  async refreshSession(): Promise<void> {
    try {
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const data = await response.json()
        if (data.user) {
          this.currentUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            avatar: data.user.avatar,
            isAnonymous: false,
            profile: data.user.profile || {}
          }
          this.saveSessionToStorage()
          this.notifyListeners()
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error)
    }
  }
}

// Instância singleton
const sessionManager = SessionManager.getInstance()

// Hook useSession
export function useSession(): UseSessionReturn {
  const [user, setUser] = useState<SessionUser | null>(sessionManager.getCurrentUser())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Se não há usuário, criar usuário anônimo
    if (!user) {
      sessionManager.getUserId() // Isso criará o usuário anônimo
      setUser(sessionManager.getCurrentUser())
    }

    // Adicionar listener para mudanças na sessão
    const removeListener = sessionManager.addListener(setUser)
    return removeListener
  }, [user])

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const success = await sessionManager.login(email, password)
      return success
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      await sessionManager.logout()
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshSession = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    try {
      await sessionManager.refreshSession()
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateProfile = useCallback((updates: Partial<SessionUser['profile']>) => {
    sessionManager.updateProfile(updates)
  }, [])

  const transferData = useCallback(async (newUserId: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      return await sessionManager.transferData(newUserId)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    user,
    isLoading,
    isAuthenticated: user !== null && !user.isAnonymous,
    login,
    logout,
    refreshSession,
    updateProfile,
    transferData
  }
}

// Export do sessionManager para compatibilidade
export { sessionManager } 