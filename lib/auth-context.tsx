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

  // Inicializar autenticação
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Obter sessão atual
        const currentSession = await authService.getCurrentSession()
        
        if (mounted) {
          setSession(currentSession)
          setUser(currentSession?.user || null)
          
          if (currentSession?.user) {
            await loadUserProfile(currentSession.user.id)
            
            // Verificar se há dados anônimos para migrar
            const anonymousUserId = sessionManager.getUserId()
            if (anonymousUserId && anonymousUserId !== currentSession.user.id && !migrationOffered) {
              setMigrationOffered(true)
              // Oferecer migração automática ou manual dependendo da preferência
              await migrateAnonymousData()
                         }
          }
          
          setLoading(false)
        }
      } catch (error) {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Escutar mudanças de autenticação
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        
        if (mounted) {
          setSession(session)
          setUser(session?.user || null)
          
                     if (session?.user) {
             await loadUserProfile(session.user.id)
             // Session manager será sincronizado com Supabase auth automaticamente
           } else {
             setProfile(null)
           }
          
          setLoading(false)
        }
      }
    )

    initializeAuth()

    return () => {
      mounted = false
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