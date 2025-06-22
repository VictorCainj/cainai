'use client'

import React, { useState, useRef, useEffect } from 'react'
import { User, Settings, LogOut, MessageSquare, BarChart3, ChevronDown } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'

interface UserMenuProps {
  onOpenSettings?: () => void
  onOpenDashboard?: () => void
  variant?: 'dark' | 'light'
}

export function UserMenu({ onOpenSettings, onOpenDashboard, variant = 'dark' }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { user, profile, logout } = useAuth()
  const menuRef = useRef<HTMLDivElement>(null)

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      setIsOpen(false)
    } catch (error) {
      // Silent fail
    }
  }

  const getDisplayName = () => {
    if (profile?.full_name) return profile.full_name
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name
    if (user?.email) return user.email.split('@')[0]
    return 'Usuário'
  }

  const getInitials = () => {
    const name = getDisplayName()
    return name
      .split(' ')
      .map((word: string) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarUrl = () => {
    return profile?.avatar_url || user?.user_metadata?.avatar_url
  }

  if (!user) return null

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="jarvis-button p-2 rounded-lg transition-all hover:jarvis-glow"
      >
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="relative">
            {getAvatarUrl() ? (
              <img
                src={getAvatarUrl()}
                alt={getDisplayName()}
                className="w-8 h-8 rounded-full object-cover jarvis-border-glow"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center jarvis-glow">
                <span className="text-white font-medium text-sm">
                  {getInitials()}
                </span>
              </div>
            )}
            
            {/* Online indicator */}
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-black animate-pulse jarvis-glow"></div>
          </div>

          {/* Nome e email */}
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium truncate max-w-32 text-cyan-300 jarvis-text">
              {getDisplayName()}
            </p>
            <p className="text-xs truncate max-w-32 text-gray-400 jarvis-mono">
              {user.email}
            </p>
          </div>

          {/* Chevron */}
          <ChevronDown 
            className={`w-4 h-4 transition-transform text-cyan-400 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 z-50 jarvis-boot">
          <div className="jarvis-panel bg-black/95 backdrop-blur-lg">
            {/* Header do menu */}
            <div className="px-4 py-3 border-b border-cyan-500/30">
              <div className="flex items-center space-x-3">
                {getAvatarUrl() ? (
                  <img
                    src={getAvatarUrl()}
                    alt={getDisplayName()}
                    className="w-10 h-10 rounded-full object-cover jarvis-border-glow"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center jarvis-glow">
                    <span className="text-white font-medium">
                      {getInitials()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-cyan-300 jarvis-text">
                    {getDisplayName()}
                  </p>
                  <p className="text-sm truncate text-gray-400 jarvis-mono">
                    {user.email}
                  </p>
                  {profile?.username && (
                    <p className="text-cyan-400 text-xs jarvis-mono">
                      @{profile.username}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {/* Dashboard */}
              {onOpenDashboard && (
                <button
                  onClick={() => {
                    onOpenDashboard()
                    setIsOpen(false)
                  }}
                  className="w-full px-4 py-3 text-left transition-all flex items-center space-x-3 text-gray-300 hover:text-cyan-400 hover:bg-cyan-900/20 jarvis-text group"
                >
                  <BarChart3 className="w-4 h-4 text-cyan-400 group-hover:jarvis-glow" />
                  <span>Dashboard</span>
                </button>
              )}

              {/* Conversas */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-full px-4 py-3 text-left transition-all flex items-center space-x-3 text-gray-300 hover:text-cyan-400 hover:bg-cyan-900/20 jarvis-text group"
              >
                <MessageSquare className="w-4 h-4 text-cyan-400 group-hover:jarvis-glow" />
                <span>Minhas Conversas</span>
              </button>

              {/* Configurações */}
              <button
                onClick={() => {
                  if (onOpenSettings) {
                    onOpenSettings()
                  }
                  setIsOpen(false)
                }}
                className="w-full px-4 py-3 text-left transition-all flex items-center space-x-3 text-gray-300 hover:text-cyan-400 hover:bg-cyan-900/20 jarvis-text group"
              >
                <Settings className="w-4 h-4 text-cyan-400 group-hover:jarvis-glow" />
                <span>Configurações</span>
              </button>
            </div>

            {/* Divisor */}
            <div className="border-t border-cyan-500/30 my-2"></div>

            {/* System Info */}
            <div className="px-4 py-2">
              <div className="flex items-center justify-between text-xs">
                <span className="jarvis-mono text-gray-500">Status do Sistema</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse jarvis-glow"></div>
                  <span className="jarvis-mono text-green-400">Online</span>
                </div>
              </div>
            </div>

            {/* Divisor */}
            <div className="border-t border-cyan-500/30 my-2"></div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 text-left transition-all flex items-center space-x-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 jarvis-text group"
            >
              <LogOut className="w-4 h-4 group-hover:jarvis-glow" />
              <span>Desconectar Sistema</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
} 