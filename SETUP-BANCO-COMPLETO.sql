-- ================================================
-- SETUP COMPLETO DO BANCO DE DADOS - CDI CHAT
-- Execute este script no Supabase SQL Editor
-- ================================================

-- 1. CRIAR TABELA DE CONVERSAS (se não existir)
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CRIAR TABELA DE MENSAGENS (se não existir)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CRIAR TABELA DE RESUMOS
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Conteúdo do resumo
  summary_text TEXT NOT NULL,
  main_topics TEXT[] DEFAULT '{}',
  key_points TEXT[] DEFAULT '{}',
  sentiment VARCHAR(20) DEFAULT 'neutral',
  
  -- Metadados
  message_count INTEGER DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      model_version VARCHAR(50) DEFAULT 'gpt-4o',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(conversation_id), -- Um resumo por conversa
  CHECK (sentiment IN ('positive', 'neutral', 'negative'))
);

-- ================================================
-- ÍNDICES PARA PERFORMANCE
-- ================================================

-- Índices para chat_conversations
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id 
ON chat_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_updated 
ON chat_conversations(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_title_search 
ON chat_conversations(title);

-- Índices para chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id 
ON chat_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created 
ON chat_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_latest 
ON chat_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_role_count 
ON chat_messages(conversation_id, role);

-- Índices para conversation_summaries
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_conversation_id 
ON conversation_summaries(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_id 
ON conversation_summaries(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_generated_at 
ON conversation_summaries(generated_at);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_sentiment 
ON conversation_summaries(sentiment);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================

-- Habilitar RLS para todas as tabelas
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- ================================================
-- POLÍTICAS DE SEGURANÇA
-- ================================================

-- Políticas para chat_conversations (com DROP IF EXISTS para evitar erro)
DROP POLICY IF EXISTS "Users can view their own conversations" ON chat_conversations;
CREATE POLICY "Users can view their own conversations" 
ON chat_conversations FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own conversations" ON chat_conversations;
CREATE POLICY "Users can insert their own conversations" 
ON chat_conversations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own conversations" ON chat_conversations;
CREATE POLICY "Users can update their own conversations" 
ON chat_conversations FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversations" ON chat_conversations;
CREATE POLICY "Users can delete their own conversations" 
ON chat_conversations FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas para chat_messages (com DROP IF EXISTS para evitar erro)
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON chat_messages;
CREATE POLICY "Users can view messages from their conversations" 
ON chat_messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM chat_conversations 
    WHERE id = chat_messages.conversation_id 
    AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON chat_messages;
CREATE POLICY "Users can insert messages in their conversations" 
ON chat_messages FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_conversations 
    WHERE id = chat_messages.conversation_id 
    AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update messages in their conversations" ON chat_messages;
CREATE POLICY "Users can update messages in their conversations" 
ON chat_messages FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM chat_conversations 
    WHERE id = chat_messages.conversation_id 
    AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete messages from their conversations" ON chat_messages;
CREATE POLICY "Users can delete messages from their conversations" 
ON chat_messages FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM chat_conversations 
    WHERE id = chat_messages.conversation_id 
    AND user_id = auth.uid()
  )
);

-- Políticas para conversation_summaries (com DROP IF EXISTS para evitar erro)
DROP POLICY IF EXISTS "Users can view their own conversation summaries" ON conversation_summaries;
CREATE POLICY "Users can view their own conversation summaries" 
ON conversation_summaries FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own conversation summaries" ON conversation_summaries;
CREATE POLICY "Users can insert their own conversation summaries" 
ON conversation_summaries FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own conversation summaries" ON conversation_summaries;
CREATE POLICY "Users can update their own conversation summaries" 
ON conversation_summaries FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own conversation summaries" ON conversation_summaries;
CREATE POLICY "Users can delete their own conversation summaries" 
ON conversation_summaries FOR DELETE 
USING (auth.uid() = user_id);

-- ================================================
-- TRIGGERS PARA UPDATED_AT
-- ================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para chat_conversations (com DROP IF EXISTS para evitar erro)
DROP TRIGGER IF EXISTS update_chat_conversations_updated_at ON chat_conversations;
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers para chat_messages
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers para conversation_summaries
DROP TRIGGER IF EXISTS update_conversation_summaries_updated_at ON conversation_summaries;
CREATE TRIGGER update_conversation_summaries_updated_at
  BEFORE UPDATE ON conversation_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ================================================

COMMENT ON TABLE chat_conversations IS 'Armazena as conversas do sistema de chat';
COMMENT ON TABLE chat_messages IS 'Armazena as mensagens individuais de cada conversa';
COMMENT ON TABLE conversation_summaries IS 'Armazena resumos inteligentes das conversas gerados por IA';

COMMENT ON COLUMN conversation_summaries.summary_text IS 'Texto principal do resumo em português';
COMMENT ON COLUMN conversation_summaries.main_topics IS 'Array de tópicos principais identificados';
COMMENT ON COLUMN conversation_summaries.key_points IS 'Array de pontos-chave da conversa';
COMMENT ON COLUMN conversation_summaries.sentiment IS 'Análise de sentimento: positive, neutral, negative';
COMMENT ON COLUMN conversation_summaries.message_count IS 'Número de mensagens analisadas';
COMMENT ON COLUMN conversation_summaries.model_version IS 'Versão do modelo IA utilizado';

-- ================================================
-- VERIFICAÇÃO DO SETUP
-- ================================================

-- Verificar se as tabelas foram criadas
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name IN ('chat_conversations', 'chat_messages', 'conversation_summaries')
  AND table_schema = 'public'
ORDER BY table_name;

-- Verificar políticas RLS
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('chat_conversations', 'chat_messages', 'conversation_summaries')
ORDER BY tablename, policyname;

-- Verificar índices
SELECT 
  tablename,
  indexname
FROM pg_indexes 
WHERE tablename IN ('chat_conversations', 'chat_messages', 'conversation_summaries')
ORDER BY tablename, indexname;

-- ================================================
-- SUCESSO!
-- ================================================

SELECT 'Setup completo do banco de dados realizado com sucesso!' as status,
       'Tabelas: chat_conversations, chat_messages, conversation_summaries' as tabelas_criadas,
       'RLS habilitado e políticas configuradas' as seguranca,
       'Índices criados para performance otimizada' as performance; 