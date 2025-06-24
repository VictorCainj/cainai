-- Migração para atualizar conversation_summaries para estrutura de cronologia
-- Data: Dezembro 2024
-- Objetivo: Substituir campos main_topics, key_points, message_count e model_version por timeline

BEGIN;

-- Adicionar nova coluna timeline do tipo JSONB
ALTER TABLE conversation_summaries ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;

-- Remover colunas antigas (comentado para evitar perda de dados - execute apenas se tiver certeza)
-- ALTER TABLE conversation_summaries DROP COLUMN IF EXISTS main_topics;
-- ALTER TABLE conversation_summaries DROP COLUMN IF EXISTS key_points;
-- ALTER TABLE conversation_summaries DROP COLUMN IF EXISTS message_count;
-- ALTER TABLE conversation_summaries DROP COLUMN IF EXISTS model_version;

-- Criar índice para consultas na timeline
CREATE INDEX IF NOT EXISTS idx_conversation_summaries_timeline ON conversation_summaries USING GIN (timeline);

-- Atualizar comentário da tabela
COMMENT ON TABLE conversation_summaries IS 'Armazena cronologias das conversas organizadas por horários';
COMMENT ON COLUMN conversation_summaries.timeline IS 'Array JSON com cronologia de ações: [{"time": "HH:MM", "period": "manhã|tarde|noite", "action": "descrição"}]';

COMMIT;

-- Para remover as colunas antigas, execute apenas quando tiver certeza:
-- BEGIN;
-- ALTER TABLE conversation_summaries DROP COLUMN IF EXISTS main_topics;
-- ALTER TABLE conversation_summaries DROP COLUMN IF EXISTS key_points;
-- ALTER TABLE conversation_summaries DROP COLUMN IF EXISTS message_count;
-- ALTER TABLE conversation_summaries DROP COLUMN IF EXISTS model_version;
-- COMMIT; 