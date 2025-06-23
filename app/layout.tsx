import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { PerformanceMonitor } from '@/components/ui/performance-monitor'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CDI - Chat com IA',
  description: 'Assistente de produtividade com GPT-4 Turbo, Super Memória e DALL-E 3',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <PerformanceMonitor />
        </AuthProvider>
      </body>
    </html>
  )
} 