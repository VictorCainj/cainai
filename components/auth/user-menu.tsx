'use client'

import React, { useState, useRef, useEffect } from 'react'
import { User, Settings, LogOut, MessageSquare, BarChart3, Crown, ChevronDown } from 'lucide-react'
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
        className={`${variant === 'light' ? 'p-1.5' : 'p-2'} rounded-lg transition-all ${
          variant === 'light' 
            ? 'hover:bg-gray-100 text-gray-700' 
            : 'hover:bg-gray-800 text-white'
        }`}
      >
        <div className={`flex items-center ${variant === 'light' ? 'space-x-2' : 'space-x-3'}`}>
          {/* Avatar */}
          <div className="relative">
            {getAvatarUrl() ? (
              <img
                src={getAvatarUrl()}
                alt={getDisplayName()}
                className={`${variant === 'light' ? 'w-7 h-7' : 'w-8 h-8'} rounded-full object-cover`}
              />
            ) : (
              <div className={`${variant === 'light' ? 'w-7 h-7' : 'w-8 h-8'} bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center`}>
                <span className={`text-white font-medium ${variant === 'light' ? 'text-xs' : 'text-sm'}`}>
                  {getInitials()}
                </span>
              </div>
            )}
            

          </div>

          {/* Nome e email */}
          <div className="hidden md:block text-left">
            <p className={`${variant === 'light' ? 'text-xs' : 'text-sm'} font-medium truncate max-w-32 ${
              variant === 'light' ? 'text-gray-700' : 'text-white'
            }`}>
              {getDisplayName()}
            </p>
            <p className={`${variant === 'light' ? 'text-xs' : 'text-xs'} truncate max-w-32 ${
              variant === 'light' ? 'text-gray-500' : 'text-gray-400'
            }`}>
              {user.email}
            </p>
          </div>

          {/* Chevron */}
          <ChevronDown 
            className={`${variant === 'light' ? 'w-3 h-3' : 'w-4 h-4'} transition-transform ${
              variant === 'light' ? 'text-gray-500' : 'text-gray-400'
            } ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute right-0 top-full mt-2 w-64 rounded-xl shadow-2xl z-50 py-2 ${
          variant === 'light' 
            ? 'bg-white border border-gray-200' 
            : 'bg-gray-800 border border-gray-700'
        }`}>
          {/* Header do menu */}
          <div className={`px-4 py-3 border-b ${
            variant === 'light' ? 'border-gray-200' : 'border-gray-700'
          }`}>
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
                <p className={`font-medium truncate ${
                  variant === 'light' ? 'text-gray-800' : 'text-white'
                }`}>
                  {getDisplayName()}
                </p>
                <p className={`text-sm truncate ${
                  variant === 'light' ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {user.email}
                </p>
                {profile?.username && (
                  <p className="text-blue-500 text-xs">
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
                className={`w-full px-4 py-2 text-left transition-colors flex items-center space-x-3 ${
                  variant === 'light' 
                    ? 'hover:bg-gray-100 text-gray-700' 
                    : 'hover:bg-gray-700 text-white'
                }`}
              >
                <BarChart3 className={`w-4 h-4 ${
                  variant === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`} />
                <span>Dashboard</span>
              </button>
            )}

            {/* Conversas */}
            <button
              onClick={() => setIsOpen(false)}
              className={`w-full px-4 py-2 text-left transition-colors flex items-center space-x-3 ${
                variant === 'light' 
                  ? 'hover:bg-gray-100 text-gray-700' 
                  : 'hover:bg-gray-700 text-white'
              }`}
            >
              <MessageSquare className={`w-4 h-4 ${
                variant === 'light' ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <span>Minhas Conversas</span>
            </button>

            {/* Configurações */}
            {onOpenSettings && (
              <button
                onClick={() => {
                  onOpenSettings()
                  setIsOpen(false)
                }}
                className={`w-full px-4 py-2 text-left transition-colors flex items-center space-x-3 ${
                  variant === 'light' 
                    ? 'hover:bg-gray-100 text-gray-700' 
                    : 'hover:bg-gray-700 text-white'
                }`}
              >
                <Settings className={`w-4 h-4 ${
                  variant === 'light' ? 'text-gray-500' : 'text-gray-400'
                }`} />
                <span>Configurações</span>
              </button>
            )}

            {/* Upgrade (se não for premium) */}
            <button
              onClick={() => setIsOpen(false)}
              className={`w-full px-4 py-2 text-left transition-colors flex items-center space-x-3 ${
                variant === 'light' 
                  ? 'hover:bg-gray-100 text-gray-700' 
                  : 'hover:bg-gray-700 text-white'
              }`}
            >
              <Crown className="w-4 h-4 text-yellow-500" />
              <span>Upgrade para Pro</span>
              <span className="ml-auto bg-yellow-500 text-yellow-100 text-xs px-2 py-1 rounded-full">
                Em breve
              </span>
            </button>
          </div>

          {/* Divisor */}
          <div className={`border-t my-2 ${
            variant === 'light' ? 'border-gray-200' : 'border-gray-700'
          }`}></div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`w-full px-4 py-2 text-left transition-colors flex items-center space-x-3 text-red-500 ${
              variant === 'light' ? 'hover:bg-red-50' : 'hover:bg-red-900/50'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      )}
    </div>
  )
} 