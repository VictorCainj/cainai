-- Script de Debug para Problema de Exclusão
-- Execute no Supabase SQL Editor para investigar o problema

-- 1. Verificar se há conversas duplicadas
SELECT 
  id,
  user_id,
  title,
  created_at,
  COUNT(*) as duplicate_count
FROM chat_conversations 
WHERE id = 'c8def7bd-23a0-4446-be43-9de323a5a65c'
GROUP BY id, user_id, title, created_at
HAVING COUNT(*) > 1;

-- 2. Verificar todas as instâncias desta conversa
SELECT 
  id,
  user_id,
  title,
  created_at,
  updated_at
FROM chat_conversations 
WHERE id = 'c8def7bd-23a0-4446-be43-9de323a5a65c';

-- 3. Verificar o usuário específico
SELECT 
  id,
  user_id,
  title,
  created_at
FROM chat_conversations 
WHERE user_id = '5df09376-a3d4-4675-bbcc-a9526f358942'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Testar as funções diretamente
SELECT delete_conversation_admin(
  'c8def7bd-23a0-4446-be43-9de323a5a65c'::UUID,
  '5df09376-a3d4-4675-bbcc-a9526f358942'
) as function_result;

-- 5. Verificar se as funções existem
SELECT 
  proname,
  proargnames,
  prosecdef
FROM pg_proc 
WHERE proname IN ('delete_conversation_admin', 'force_delete_conversation');

-- 6. Verificar políticas RLS ativas
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual
FROM pg_policies 
WHERE tablename = 'chat_conversations' AND cmd = 'DELETE';

-- 7. Verificar se há mensagens órfãs
SELECT 
  COUNT(*) as total_messages
FROM chat_messages 
WHERE conversation_id = 'c8def7bd-23a0-4446-be43-9de323a5a65c';

-- 8. Tentar exclusão manual passo a passo
-- CUIDADO: Descomente apenas se quiser realmente excluir
/*
-- Primeiro, excluir mensagens
DELETE FROM chat_messages 
WHERE conversation_id = 'c8def7bd-23a0-4446-be43-9de323a5a65c';

-- Depois, excluir conversa
DELETE FROM chat_conversations 
WHERE id = 'c8def7bd-23a0-4446-be43-9de323a5a65c' 
  AND user_id = '5df09376-a3d4-4675-bbcc-a9526f358942';
*/

-- 9. Verificar constraint violations
SELECT 
  conname,
  contype,
  confdeltype
FROM pg_constraint 
WHERE conrelid = 'chat_conversations'::regclass
   OR confrelid = 'chat_conversations'::regclass; 