'use client'

import React, { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const router = useRouter()

  const handleSuccess = () => {
    setTimeout(() => {
      window.location.href = '/chatbot'
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-white">CDI Chat</span>
          </div>
          <p className="text-gray-400 text-lg">
            Chat com Super Memória
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-gray-900/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 px-6 py-4 font-medium transition-all ${
                mode === 'login'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 px-6 py-4 font-medium transition-all ${
                mode === 'register'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              Registro
            </button>
          </div>

          {/* Content */}
          <div className="p-8">
            {mode === 'login' ? (
              <LoginForm
                onSwitchToRegister={() => setMode('register')}
                onClose={() => {}}
                onSuccess={handleSuccess}
              />
            ) : (
              <RegisterForm
                onSwitchToLogin={() => setMode('login')}
                onClose={() => {}}
                onSuccess={handleSuccess}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            © 2024 CDI Chat • Powered by GPT-4 Turbo + DALL-E 3
          </p>
        </div>
      </div>
    </div>
  )
} 