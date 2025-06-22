'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ChatPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirecionar automaticamente para /chatbot
    router.replace('/chatbot')
  }, [router])

  return (
    <div className="h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <div className="w-8 h-8 text-white">⚡</div>
        </div>
        <p className="text-white text-lg">Redirecionando para o chatbot...</p>
      </div>
    </div>
  )
} 