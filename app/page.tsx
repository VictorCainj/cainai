'use client'

import React from 'react'
import { useAuth } from '@/lib/auth-context'
import LandingPage from './landing/page'

export default function Home() {
  const { loading } = useAuth()

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-8 h-8 text-white">⚡</div>
          </div>
          <p className="text-white text-lg">Carregando CDI Chat...</p>
        </div>
      </div>
    )
  }

  // Mostrar landing page para todos os usuários
  return <LandingPage />
} 