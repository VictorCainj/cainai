'use client'

import React, { useState, useRef, useEffect } from 'react'
import { User, Settings, LogOut, MessageSquare, BarChart3, Crown, ChevronDown } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'

interface UserMenuProps {
  onOpenSettings?: () => void
  onOpenDashboard?: () => void
}

export function UserMenu({ onOpenSettings, onOpenDashboard }: UserMenuProps) {
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
        className="p-2 rounded-lg hover:bg-gray-800 transition-all"
      >
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="relative">
            {getAvatarUrl() ? (
              <img
                src={getAvatarUrl()}
                alt={getDisplayName()}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {getInitials()}
                </span>
              </div>
            )}
            
            {/* Status online */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full"></div>
          </div>

          {/* Nome e email */}
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-white truncate max-w-32">
              {getDisplayName()}
            </p>
            <p className="text-xs text-gray-400 truncate max-w-32">
              {user.email}
            </p>
          </div>

          {/* Chevron */}
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 py-2">
          {/* Header do menu */}
          <div className="px-4 py-3 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              {getAvatarUrl() ? (
                <img
                  src={getAvatarUrl()}
                  alt={getDisplayName()}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {getInitials()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {getDisplayName()}
                </p>
                <p className="text-gray-400 text-sm truncate">
                  {user.email}
                </p>
                {profile?.username && (
                  <p className="text-blue-400 text-xs">
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
                className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors flex items-center space-x-3"
              >
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <span className="text-white">Dashboard</span>
              </button>
            )}

            {/* Conversas */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors flex items-center space-x-3"
            >
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-white">Minhas Conversas</span>
            </button>

            {/* Configurações */}
            {onOpenSettings && (
              <button
                onClick={() => {
                  onOpenSettings()
                  setIsOpen(false)
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors flex items-center space-x-3"
              >
                <Settings className="w-4 h-4 text-gray-400" />
                <span className="text-white">Configurações</span>
              </button>
            )}

            {/* Upgrade (se não for premium) */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors flex items-center space-x-3"
            >
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-white">Upgrade para Pro</span>
              <span className="ml-auto bg-yellow-600 text-yellow-100 text-xs px-2 py-1 rounded-full">
                Em breve
              </span>
            </button>
          </div>

          {/* Divisor */}
          <div className="border-t border-gray-700 my-2"></div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left hover:bg-red-900/50 transition-colors flex items-center space-x-3 text-red-400"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      )}
    </div>
  )
} 