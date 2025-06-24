-- ================================================
-- SETUP BANCO DE DADOS - RESUMOS DE CONVERSAS
-- Execute este script no Supabase SQL Editor
-- ================================================

-- 1. Criar tabela para resumos de conversas
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
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

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_conversation_id 
ON conversation_summaries(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_id 
ON conversation_summaries(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_generated_at 
ON conversation_summaries(generated_at);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_sentiment 
ON conversation_summaries(sentiment);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de segurança

-- Política para SELECT (visualizar)
CREATE POLICY "Users can view their own conversation summaries" 
ON conversation_summaries
FOR SELECT 
USING (auth.uid() = user_id);

-- Política para INSERT (criar)
CREATE POLICY "Users can insert their own conversation summaries" 
ON conversation_summaries
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE (atualizar)
CREATE POLICY "Users can update their own conversation summaries" 
ON conversation_summaries
FOR UPDATE 
USING (auth.uid() = user_id);

-- Política para DELETE (excluir)
CREATE POLICY "Users can delete their own conversation summaries" 
ON conversation_summaries
FOR DELETE 
USING (auth.uid() = user_id);

-- 5. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_conversation_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger para updated_at
CREATE TRIGGER update_conversation_summaries_updated_at
  BEFORE UPDATE ON conversation_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_summaries_updated_at();

-- 7. Adicionar comentários para documentação
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

-- Verificar se a tabela foi criada
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'conversation_summaries'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'conversation_summaries';

-- Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'conversation_summaries';

-- ================================================
-- DADOS DE TESTE (OPCIONAL)
-- ================================================

-- Inserir resumo de exemplo (substitua pelos seus IDs reais)
/*
INSERT INTO conversation_summaries (
  conversation_id,
  user_id,
  summary_text,
  main_topics,
  key_points,
  sentiment,
  message_count,
  model_version
) VALUES (
  'sua-conversation-id-aqui', -- Substitua por um ID real
  auth.uid(),
  'Esta foi uma conversa sobre desenvolvimento web usando React e Next.js.',
  ARRAY['React', 'Next.js', 'Desenvolvimento Web'],
  ARRAY['Aprendeu sobre hooks', 'Configurou roteamento', 'Implementou componentes'],
  'positive',
  15,
  'gpt-4o'
);
*/

-- ================================================
-- LIMPEZA (SE NECESSÁRIO)
-- ================================================

-- Para remover tudo e recomeçar, execute:
/*
DROP TRIGGER IF EXISTS update_conversation_summaries_updated_at ON conversation_summaries;
DROP FUNCTION IF EXISTS update_conversation_summaries_updated_at();
DROP TABLE IF EXISTS conversation_summaries CASCADE;
*/

-- ================================================
-- SUCESSO!
-- ================================================

SELECT 'Setup da tabela conversation_summaries concluído com sucesso!' as status;