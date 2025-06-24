import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CDI - Chat com IA',
  description: 'Assistente de produtividade com GPT-4o, Super Memória e DALL-E 3',
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
  
        </AuthProvider>
      </body>
    </html>
  )
} 