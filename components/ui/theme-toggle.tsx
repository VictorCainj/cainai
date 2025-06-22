'use client'

import React, { useEffect, useState } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Theme = 'light' | 'dark' | 'system'

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'icon' | 'text' | 'both'
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  size = 'md', 
  variant = 'icon' 
}) => {
  const [theme, setTheme] = useState<Theme>('system')
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light')

  // Detectar tema do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Carregar tema salvo
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme)
    }
  }, [])

  // Aplicar tema
  useEffect(() => {
    const root = document.documentElement
    const effectiveTheme = theme === 'system' ? systemTheme : theme

    if (effectiveTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    localStorage.setItem('theme', theme)
  }, [theme, systemTheme])

  const cycleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const getIcon = () => {
    const effectiveTheme = theme === 'system' ? systemTheme : theme
    const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20

    switch (theme) {
      case 'light':
        return <Sun size={iconSize} />
      case 'dark':
        return <Moon size={iconSize} />
      case 'system':
        return <Monitor size={iconSize} />
      default:
        return <Sun size={iconSize} />
    }
  }

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'Claro'
      case 'dark':
        return 'Escuro'
      case 'system':
        return 'Sistema'
      default:
        return 'Claro'
    }
  }

  const buttonClasses = {
    sm: 'h-8 px-2 text-xs',
    md: 'h-10 px-3 text-sm',
    lg: 'h-12 px-4 text-base'
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={cycleTheme}
      className={`transition-all duration-200 hover:scale-105 ${buttonClasses[size]}`}
      title={`Tema atual: ${getLabel()}`}
    >
      <div className="flex items-center gap-2">
        {getIcon()}
        {(variant === 'text' || variant === 'both') && (
          <span className="hidden sm:inline">{getLabel()}</span>
        )}
      </div>
    </Button>
  )
}

// Hook para usar tema em outros componentes
export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('system')
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light')

    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])

  const effectiveTheme = theme === 'system' ? systemTheme : theme

  return {
    theme,
    effectiveTheme,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme)
      localStorage.setItem('theme', newTheme)
    }
  }
} 