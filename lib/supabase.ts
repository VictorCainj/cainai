import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types para TypeScript
export type Profile = {
  id: string
  username?: string
  full_name?: string
  avatar_url?: string
  preferences?: Record<string, any>
  created_at: string
  updated_at: string
}

export type Category = {
  id: string
  user_id: string
  name: string
  color: string
  icon: string
  created_at: string
}

export type Task = {
  id: string
  user_id: string
  category_id?: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export type Note = {
  id: string
  user_id: string
  category_id?: string
  title: string
  content?: string
  tags: string[]
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export type Event = {
  id: string
  user_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  reminder_minutes: number
  created_at: string
  updated_at: string
}

export type ChatConversation = {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export type ChatMessage = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, any>
  created_at: string
} 