-- ================================================
-- CORREÇÃO RLS - CONVERSATION SUMMARIES
-- Execute este SQL no Supabase SQL Editor
-- ================================================

-- 1. Verificar se RLS está ativo (deve estar)
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'conversation_summaries';

-- 2. Remover políticas existentes (se houver problemas)
DROP POLICY IF EXISTS "Users can view their own conversation summaries" ON conversation_summaries;
DROP POLICY IF EXISTS "Users can insert their own conversation summaries" ON conversation_summaries;
DROP POLICY IF EXISTS "Users can update their own conversation summaries" ON conversation_summaries;
DROP POLICY IF EXISTS "Users can delete their own conversation summaries" ON conversation_summaries;

-- 3. Recriar políticas RLS corretas
-- Política de SELECT (visualização)
CREATE POLICY "Users can view their own conversation summaries" 
ON conversation_summaries FOR SELECT 
USING (auth.uid() = user_id);

-- Política de INSERT (criação) - ESTA É A CRÍTICA
CREATE POLICY "Users can insert their own conversation summaries" 
ON conversation_summaries FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Política de UPDATE (atualização)
CREATE POLICY "Users can update their own conversation summaries" 
ON conversation_summaries FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política de DELETE (exclusão)
CREATE POLICY "Users can delete their own conversation summaries" 
ON conversation_summaries FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Garantir que RLS está ativo
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- 5. Verificar políticas criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'conversation_summaries';

-- 6. ALTERNATIVA: Se ainda der erro, temporariamente desabilitar RLS para teste
-- (DESCOMENTE APENAS SE NECESSÁRIO)
-- ALTER TABLE conversation_summaries DISABLE ROW LEVEL SECURITY;

-- 7. Para reabilitar depois do teste:
-- ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;

-- ================================================
-- TESTE DE FUNCIONAMENTO
-- ================================================

-- Testar inserção (substitua pelo seu user_id real)
-- INSERT INTO conversation_summaries (
--   conversation_id,
--   user_id,
--   summary_text,
--   main_topics,
--   created_at
-- ) VALUES (
--   'test-conv-id',
--   auth.uid(),
--   'Teste de resumo',
--   ARRAY['teste'],
--   NOW()
-- );

-- ================================================
-- INFORMAÇÕES DE DEBUG
-- ================================================

-- Ver user_id atual
SELECT auth.uid() as current_user_id;

-- Ver estrutura da tabela
\d conversation_summaries;

-- Ver todas as políticas ativas
SELECT * FROM pg_policies WHERE tablename = 'conversation_summaries'; 