'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { authService, AuthUser } from './auth'
import { sessionManager } from './session'

interface UserProfile {
  id: string
  username?: string
  full_name?: string
  avatar_url?: string
  preferences?: Record<string, any>
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: AuthUser
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  migrateAnonymousData: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [migrationOffered, setMigrationOffered] = useState(false)

  // Carregar perfil do usuário
  const loadUserProfile = async (userId: string) => {
    try {
      const profileData = await authService.getUserProfile()
      setProfile(profileData)
    } catch (error) {
      setProfile(null)
    }
  }

  // Refresh do perfil
  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id)
    }
  }

  // Migrar dados anônimos
  const migrateAnonymousData = async () => {
    if (!user) return

    try {
      const anonymousUserId = sessionManager.getUserId()
      if (anonymousUserId && anonymousUserId !== user.id) {
        const result = await authService.migrateAnonymousConversations(
          anonymousUserId,
          user.id
        )

                 if (result.success) {
           await sessionManager.transferDataToNewUser(user.id)
         }
      }
    } catch (error) {
      // Silent fail
    }
  }

  // Inicializar autenticação de forma otimizada
  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const initializeAuth = async () => {
      try {
        // Timeout de segurança - não deixar loading mais que 5 segundos
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('Auth timeout - liberando interface')
            setLoading(false)
          }
        }, 5000)

        // Obter sessão atual com timeout mais curto
        const sessionPromise = Promise.race([
          authService.getCurrentSession(),
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Session timeout')), 3000)
          )
        ])

        const currentSession = await sessionPromise
        
        if (mounted) {
          setSession(currentSession)
          setUser(currentSession?.user || null)
          
          // Liberar a interface imediatamente se há usuário
          if (currentSession?.user) {
            setLoading(false)
            clearTimeout(timeoutId)
            
            // Carregar perfil e migração em background (não bloqueante)
            Promise.all([
              loadUserProfile(currentSession.user.id).catch(() => {}),
              (() => {
                const anonymousUserId = sessionManager.getUserId()
                if (anonymousUserId && anonymousUserId !== currentSession.user.id && !migrationOffered) {
                  setMigrationOffered(true)
                  return migrateAnonymousData().catch(() => {})
                }
                return Promise.resolve()
              })()
            ]).catch(() => {})
          } else {
            setLoading(false)
            clearTimeout(timeoutId)
          }
        }
      } catch (error) {
        console.warn('Auth initialization error:', error)
        if (mounted) {
          setLoading(false)
          clearTimeout(timeoutId)
        }
      }
    }

    // Escutar mudanças de autenticação de forma otimizada
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setSession(session)
          setUser(session?.user || null)
          
          // Liberar interface imediatamente, carregar perfil em background
          setLoading(false)
          
          if (session?.user) {
            // Carregar perfil em background sem bloquear
            loadUserProfile(session.user.id).catch(() => {})
          } else {
            setProfile(null)
          }
        }
      }
    )

    initializeAuth()

    return () => {
      mounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      subscription.unsubscribe()
    }
  }, [])

  // Login
  const login = async (email: string, password: string) => {
    try {
      const { user: authUser, error, success } = await authService.login({ email, password })
      
      if (!success || error) {
        return { 
          success: false, 
          error: error?.message || 'Erro no login' 
        }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: 'Erro inesperado no login' 
      }
    }
  }

  // Registro
  const register = async (email: string, password: string, fullName: string) => {
    try {
      const { user: authUser, error, success } = await authService.register({ 
        email, 
        password, 
        fullName 
      })
      
      if (!success || error) {
        return { 
          success: false, 
          error: error?.message || 'Erro no registro' 
        }
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: 'Erro inesperado no registro' 
      }
    }
  }

  // Logout
  const logout = async () => {
    try {
      await authService.logout()
      setProfile(null)
      // Gerar novo ID para sessão anônima
      sessionManager.signOut()
    } catch (error) {
      // Silent fail
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshProfile,
    migrateAnonymousData
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

// Hook para verificar se está carregando
export function useAuthLoading() {
  const { loading } = useAuth()
  return loading
}

// Hook para verificar autenticação
export function useIsAuthenticated() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}

// Hook para obter usuário atual
export function useCurrentUser() {
  const { user, profile } = useAuth()
  return { user, profile }
} 