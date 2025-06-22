-- Script de Teste para Exclusão de Conversas
-- Execute no Supabase SQL Editor para verificar se tudo está funcionando

-- 1. Verificar se as funções existem
SELECT 
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname IN ('delete_conversation_admin', 'force_delete_conversation');

-- 2. Verificar políticas RLS
SELECT 
  tablename,
  policyname,
  cmd as command_type,
  permissive
FROM pg_policies 
WHERE tablename IN ('chat_conversations', 'chat_messages')
ORDER BY tablename, policyname;

-- 3. Verificar se RLS está ativo
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('chat_conversations', 'chat_messages');

-- 4. Contar conversas existentes por usuário (amostra dos últimos 10)
SELECT 
  user_id,
  COUNT(*) as total_conversations,
  MAX(created_at) as last_conversation_date
FROM chat_conversations 
GROUP BY user_id 
ORDER BY total_conversations DESC 
LIMIT 10;

-- 5. Verificar se há conversas órfãs (mensagens sem conversa)
SELECT 
  COUNT(*) as orphaned_messages
FROM chat_messages cm
LEFT JOIN chat_conversations cc ON cm.conversation_id = cc.id
WHERE cc.id IS NULL;

-- 6. Função de teste para exclusão (NÃO EXECUTE A MENOS QUE QUEIRA TESTAR)
-- CUIDADO: Esta função irá realmente excluir dados se executada!
/*
DO $$
DECLARE
  test_conversation_id UUID;
  test_user_id TEXT;
  function_result BOOLEAN;
BEGIN
  -- Buscar uma conversa existente para teste (pegue a mais antiga)
  SELECT id, user_id INTO test_conversation_id, test_user_id
  FROM chat_conversations 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  IF test_conversation_id IS NOT NULL THEN
    RAISE NOTICE 'Testando exclusão da conversa: % para usuário: %', test_conversation_id, test_user_id;
    
    -- Testar função delete_conversation_admin
    SELECT delete_conversation_admin(test_conversation_id, test_user_id) INTO function_result;
    
    IF function_result THEN
      RAISE NOTICE 'SUCESSO: Função delete_conversation_admin funcionou!';
    ELSE
      RAISE NOTICE 'FALHA: Função delete_conversation_admin retornou false';
      
      -- Testar função force_delete_conversation
      SELECT force_delete_conversation(test_conversation_id, test_user_id) INTO function_result;
      
      IF function_result THEN
        RAISE NOTICE 'SUCESSO: Função force_delete_conversation funcionou!';
      ELSE
        RAISE NOTICE 'FALHA: Ambas as funções falharam';
      END IF;
    END IF;
  ELSE
    RAISE NOTICE 'Nenhuma conversa encontrada para teste';
  END IF;
END $$;
*/

-- 7. Verificar permissões das funções
SELECT 
  p.proname as function_name,
  p.proacl as permissions,
  CASE 
    WHEN p.proacl IS NULL THEN 'Public access'
    ELSE 'Restricted access'
  END as access_level
FROM pg_proc p
WHERE p.proname IN ('delete_conversation_admin', 'force_delete_conversation');

-- 8. Resultado final
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_proc WHERE proname = 'delete_conversation_admin') > 0 
      AND (SELECT COUNT(*) FROM pg_proc WHERE proname = 'force_delete_conversation') > 0
      AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'chat_conversations' AND cmd = 'DELETE') > 0
    THEN '✅ SISTEMA DE EXCLUSÃO CONFIGURADO CORRETAMENTE'
    ELSE '❌ SISTEMA DE EXCLUSÃO PRECISA SER CONFIGURADO'
  END as status_geral;

-- 9. Próximos passos se algo estiver errado
/*
Se o status_geral mostrar ❌, execute os seguintes passos:

1. Execute o script supabase-fix-delete-function.sql
2. Verifique se as políticas RLS estão corretas
3. Confirme que RLS está ativo nas tabelas
4. Teste novamente este script

Se ainda houver problemas, verifique:
- Permissões do usuário atual
- Logs de erro no Supabase Dashboard
- Configuração do projeto
*/ 