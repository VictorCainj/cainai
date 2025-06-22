'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, User, CheckCircle2, Github } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { authService } from '@/lib/auth'

interface RegisterFormProps {
  onSwitchToLogin: () => void
  onClose: () => void
  onSuccess: () => void
}

export function RegisterForm({ onSwitchToLogin, onClose, onSuccess }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validações
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      setLoading(false)
      return
    }

    try {
      const result = await register(formData.email, formData.password, formData.fullName)
      
      if (result.success) {
        setSuccess('Conta criada com sucesso! Redirecionando...')
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 1500)
      } else {
        setError(result.error || 'Erro no registro')
      }
    } catch (error) {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      setLoading(true)
      setError('')
      
      let result
      if (provider === 'google') {
        result = await authService.loginWithGoogle()
      } else if (provider === 'github') {
        result = await authService.loginWithGitHub()
      }

      if (result?.error) {
        setError(`Erro no registro com ${provider === 'google' ? 'Google' : 'GitHub'}`)
      } else {
        // Registro social bem-sucedido - o redirecionamento será feito pelo Supabase
        // mas vamos chamar onSuccess para fechar o modal
        onSuccess()
        onClose()
      }
    } catch (error) {
      setError('Erro no registro social')
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = () => {
    const password = formData.password
    let strength = 0
    
    if (password.length >= 6) strength++
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++
    if (password.match(/[0-9]/)) strength++
    if (password.match(/[^a-zA-Z0-9]/)) strength++
    
    return strength
  }

  const getStrengthColor = () => {
    const strength = passwordStrength()
    if (strength <= 1) return 'bg-red-500'
    if (strength <= 2) return 'bg-yellow-500'
    if (strength <= 3) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getStrengthText = () => {
    const strength = passwordStrength()
    if (strength <= 1) return 'Fraca'
    if (strength <= 2) return 'Regular'
    if (strength <= 3) return 'Boa'
    return 'Forte'
  }

  const isFormValid = 
    formData.fullName.length >= 2 &&
    formData.email.includes('@') && 
    formData.password.length >= 6 &&
    formData.password === formData.confirmPassword

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Conta criada com sucesso!</h2>
            <p className="text-gray-400">{success}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Criar uma conta</h2>
        <p className="text-gray-400">Comece a usar o chat com super memória</p>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome completo */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Nome completo</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Seu nome completo"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Senha */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Crie uma senha"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              className="pl-10 pr-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              disabled={loading}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Força da senha */}
          {formData.password && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Força da senha:</span>
                <span className={`font-medium ${
                  passwordStrength() <= 1 ? 'text-red-400' :
                  passwordStrength() <= 2 ? 'text-yellow-400' :
                  passwordStrength() <= 3 ? 'text-blue-400' : 'text-green-400'
                }`}>
                  {getStrengthText()}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full transition-all ${getStrengthColor()}`}
                  style={{ width: `${(passwordStrength() / 4) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Confirmar senha */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Confirmar senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirme sua senha"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              className="pl-10 pr-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              disabled={loading}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          
          {/* Validação de senha */}
          {formData.confirmPassword && (
            <div className="text-xs">
              {formData.password === formData.confirmPassword ? (
                <span className="text-green-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Senhas coincidem</span>
                </span>
              ) : (
                <span className="text-red-400 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Senhas não coincidem</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Botão Registro */}
        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
          disabled={!isFormValid || loading}
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Criando conta...</span>
            </div>
          ) : (
            'Criar conta'
          )}
        </Button>
      </form>

      {/* Divisor */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gray-900 text-gray-400">ou registre-se com</span>
        </div>
      </div>

      {/* Registro Social */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialLogin('google')}
          disabled={loading}
          className="w-full bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar com Google
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialLogin('github')}
          disabled={loading}
          className="w-full bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
        >
          <Github className="w-4 h-4 mr-2" />
          Continuar com GitHub
        </Button>
      </div>

      {/* Link para login */}
      <div className="text-center">
        <span className="text-gray-400 text-sm">
          Já tem uma conta?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-400 hover:text-blue-300 font-medium"
            disabled={loading}
          >
            Fazer login
          </button>
        </span>
      </div>
    </div>
  )
} 