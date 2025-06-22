import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        throw error
      }

      // Criar ou atualizar perfil do usuário
      if (data.user) {
        const profileData = {
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || data.user.email,
          username: data.user.user_metadata?.username || data.user.email?.split('@')[0],
          avatar_url: data.user.user_metadata?.avatar_url,
          preferences: {
            theme: 'dark',
            language: 'pt-BR'
          }
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' })

        if (profileError) {
          // Silent fail for profile creation
        }
      }

      return NextResponse.redirect(new URL('/chatbot', request.url))
    } catch (error) {
      return NextResponse.redirect(new URL('/?error=auth_error', request.url))
    }
  }

  return NextResponse.redirect(new URL('/?error=no_code', request.url))
} 