-- Tabela para armazenar resumos das conversas
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
  
  -- Índices para performance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(conversation_id), -- Um resumo por conversa
  CHECK (sentiment IN ('positive', 'neutral', 'negative'))
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_conversation_id ON conversation_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user_id ON conversation_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_generated_at ON conversation_summaries(generated_at);

-- RLS (Row Level Security)
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- Política para usuários só verem seus próprios resumos
CREATE POLICY "Users can view their own conversation summaries" ON conversation_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation summaries" ON conversation_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation summaries" ON conversation_summaries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation summaries" ON conversation_summaries
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_conversation_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_summaries_updated_at
  BEFORE UPDATE ON conversation_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_summaries_updated_at();