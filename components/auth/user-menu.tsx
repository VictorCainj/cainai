'use client'

import React, { useState, useRef, useEffect } from 'react'
import { User, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'

interface UserMenuProps {
  variant?: 'dark' | 'light'
}

export function UserMenu({ variant = 'dark' }: UserMenuProps) {
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
        <div className="absolute right-0 bottom-full mb-2 w-48 z-50 jarvis-boot">
          <div className="jarvis-panel bg-black/95 backdrop-blur-lg">
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