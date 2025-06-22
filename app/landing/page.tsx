'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Sparkles, 
  MessageSquare, 
  Brain, 
  Image as ImageIcon, 
  Shield, 
  Zap, 
  Users, 
  ArrowRight,
  CheckCircle,
  Star
} from 'lucide-react'
import { AuthModal } from '@/components/auth/auth-modal'

export default function LandingPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')

  const features = [
    {
      icon: Brain,
      title: "Super Memória",
      description: "Lembra de tudo que vocês discutiram, conectando informações passadas de forma inteligente"
    },
    {
      icon: ImageIcon,
      title: "Geração de Imagens",
      description: "Crie imagens incríveis com DALL-E 3 integrado. Basta pedir e visualizar suas ideias"
    },
    {
      icon: MessageSquare,
      title: "Conversas Persistentes",
      description: "Suas conversas são salvas automaticamente e acessíveis de qualquer dispositivo"
    },
    {
      icon: Zap,
      title: "Respostas Instantâneas",
      description: "Powered by GPT-4 Turbo para respostas rápidas, precisas e contextualmente relevantes"
    },
    {
      icon: Shield,
      title: "Dados Seguros",
      description: "Suas conversas são protegidas com criptografia e políticas de segurança robustas"
    },
    {
      icon: Users,
      title: "Multi-dispositivo",
      description: "Acesse suas conversas de qualquer lugar - desktop, tablet ou mobile"
    }
  ]

  const testimonials = [
    {
      name: "Maria Santos",
      role: "Product Manager",
      text: "O CDI Chat revolucionou minha produtividade. A super memória é impressionante!",
      rating: 5
    },
    {
      name: "João Silva",
      role: "Designer",
      text: "Criar imagens com DALL-E 3 direto no chat é incrível. Acelera muito meu workflow.",
      rating: 5
    },
    {
      name: "Ana Costa",
      role: "Desenvolvedora",
      text: "Finalmente um chat que realmente entende contexto e lembra das conversas anteriores.",
      rating: 5
    }
  ]

  const handleGetStarted = () => {
    setAuthMode('register')
    setAuthModalOpen(true)
  }

  const handleLogin = () => {
    setAuthMode('login')
    setAuthModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">CDI Chat</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={handleLogin}
              className="text-gray-300 hover:text-white"
            >
              Entrar
            </Button>
            <Button 
              onClick={handleGetStarted}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Começar Grátis
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Chat com Super Memória
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed">
            Converse com um assistente de IA que realmente <strong>lembra</strong> de tudo, 
            gera imagens incríveis e mantém suas conversas organizadas.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg"
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg"
            >
              Começar Gratuitamente
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={handleLogin}
              className="border-gray-400 text-gray-300 hover:bg-gray-800 px-8 py-4 text-lg"
            >
              Fazer Login
            </Button>
          </div>

          <div className="flex items-center justify-center space-x-6 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Grátis para começar</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Sem cartão de crédito</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Acesso imediato</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Por que escolher o CDI Chat?</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Desenvolvido para profissionais que precisam de um assistente realmente inteligente
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:bg-gray-800/70 transition-all">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">O que nossos usuários dizem</h2>
          <p className="text-xl text-gray-400">
            Mais de 10.000 profissionais já confiam no CDI Chat
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-300 mb-4 italic">"{testimonial.text}"</p>
              <div>
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-sm text-gray-400">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pronto para revolucionar sua produtividade?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Junte-se a milhares de profissionais que já descobriram o poder da super memória
          </p>
          <Button 
            size="lg"
            onClick={handleGetStarted}
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
          >
            Começar Agora - É Grátis
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 border-t border-gray-800">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">CDI Chat</span>
          </div>
          <p className="text-gray-400">
            © 2024 CDI Chat. Powered by GPT-4 Turbo + DALL-E 3 + Super Memória
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />
    </div>
  )
} 