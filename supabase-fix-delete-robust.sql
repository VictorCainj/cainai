-- Versão robusta das funções de exclusão
-- Execute no Supabase SQL Editor

-- Limpar funções existentes
DROP FUNCTION IF EXISTS delete_conversation_admin(UUID, TEXT);
DROP FUNCTION IF EXISTS force_delete_conversation(UUID, TEXT);

-- Função principal melhorada
CREATE OR REPLACE FUNCTION delete_conversation_admin(
  conversation_id_param UUID,
  user_id_param TEXT
)
RETURNS boolean AS $$
DECLARE
  conversation_count INTEGER := 0;
  message_count INTEGER := 0;
  deleted_messages INTEGER := 0;
  deleted_conversations INTEGER := 0;
BEGIN
  -- Validar parâmetros
  IF conversation_id_param IS NULL OR user_id_param IS NULL OR user_id_param = '' THEN
    RETURN FALSE;
  END IF;

  -- Contar conversas que pertencem ao usuário
  SELECT COUNT(*) INTO conversation_count
  FROM chat_conversations 
  WHERE id = conversation_id_param AND user_id::text = user_id_param;

  IF conversation_count = 0 THEN
    RETURN FALSE;
  END IF;

  -- Contar mensagens para log
  SELECT COUNT(*) INTO message_count
  FROM chat_messages 
  WHERE conversation_id = conversation_id_param;

  -- Excluir mensagens primeiro
  DELETE FROM chat_messages 
  WHERE conversation_id = conversation_id_param;
  
  GET DIAGNOSTICS deleted_messages = ROW_COUNT;

  -- Excluir todas as conversas com este ID para este usuário
  -- (caso hajam duplicatas)
  DELETE FROM chat_conversations 
  WHERE id = conversation_id_param AND user_id::text = user_id_param;
  
  GET DIAGNOSTICS deleted_conversations = ROW_COUNT;

  -- Retornar sucesso se pelo menos uma conversa foi excluída
  RETURN deleted_conversations > 0;

EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, retornar false
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função de força mais agressiva
CREATE OR REPLACE FUNCTION force_delete_conversation(
  conversation_id_param UUID,
  user_id_param TEXT
)
RETURNS boolean AS $$
DECLARE
  total_deleted INTEGER := 0;
BEGIN
  -- Validar parâmetros
  IF conversation_id_param IS NULL OR user_id_param IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Excluir mensagens sem verificações
  DELETE FROM chat_messages 
  WHERE conversation_id = conversation_id_param;

  -- Excluir conversas (todas as instâncias com este ID)
  DELETE FROM chat_conversations 
  WHERE id = conversation_id_param;
  
  GET DIAGNOSTICS total_deleted = ROW_COUNT;
  
  -- Retornar true se algo foi excluído
  RETURN total_deleted > 0;

EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpeza de duplicatas
CREATE OR REPLACE FUNCTION cleanup_duplicate_conversations()
RETURNS INTEGER AS $$
DECLARE
  duplicates_removed INTEGER := 0;
BEGIN
  -- Remover conversas duplicadas, mantendo apenas a mais recente
  WITH ranked_conversations AS (
    SELECT id, user_id,
           ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at DESC) as rn
    FROM chat_conversations
  ),
  duplicates_to_delete AS (
    SELECT id, user_id
    FROM ranked_conversations
    WHERE rn > 1
  )
  DELETE FROM chat_conversations
  WHERE (id, user_id) IN (SELECT id, user_id FROM duplicates_to_delete);
  
  GET DIAGNOSTICS duplicates_removed = ROW_COUNT;
  
  RETURN duplicates_removed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION delete_conversation_admin(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION force_delete_conversation(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_duplicate_conversations() TO authenticated, anon;

-- Executar limpeza de duplicatas automaticamente
SELECT cleanup_duplicate_conversations() as duplicates_cleaned;

-- Verificar funções criadas
SELECT 
  proname as function_name,
  CASE prosecdef WHEN true THEN 'Security Definer' ELSE 'Security Invoker' END as security_mode
FROM pg_proc 
WHERE proname IN ('delete_conversation_admin', 'force_delete_conversation', 'cleanup_duplicate_conversations')
ORDER BY proname;

-- Testar com o ID específico do erro
SELECT 
  'Testing specific conversation' as test_phase,
  delete_conversation_admin(
    'c8def7bd-23a0-4446-be43-9de323a5a65c'::UUID,
    '5df09376-a3d4-4675-bbcc-a9526f358942'
  ) as delete_result; 