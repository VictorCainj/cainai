-- Versão simplificada para corrigir funções de exclusão
-- Execute no Supabase SQL Editor

-- Remover funções existentes
DROP FUNCTION IF EXISTS delete_conversation_admin(UUID, TEXT);
DROP FUNCTION IF EXISTS force_delete_conversation(UUID, TEXT);

-- Criar função principal de exclusão
CREATE OR REPLACE FUNCTION delete_conversation_admin(
  conversation_id_param UUID,
  user_id_param TEXT
)
RETURNS boolean AS $$
DECLARE
  conversation_exists BOOLEAN := FALSE;
  deleted_messages INTEGER := 0;
  deleted_conversations INTEGER := 0;
BEGIN
  -- Verificar se a conversa existe
  SELECT EXISTS (
    SELECT 1 FROM chat_conversations 
    WHERE id = conversation_id_param AND user_id::text = user_id_param
  ) INTO conversation_exists;

  IF NOT conversation_exists THEN
    RETURN FALSE;
  END IF;

  -- Excluir mensagens primeiro
  DELETE FROM chat_messages 
  WHERE conversation_id = conversation_id_param;
  
  GET DIAGNOSTICS deleted_messages = ROW_COUNT;

  -- Excluir conversa
  DELETE FROM chat_conversations 
  WHERE id = conversation_id_param AND user_id::text = user_id_param;
  
  GET DIAGNOSTICS deleted_conversations = ROW_COUNT;

  RETURN deleted_conversations > 0;

EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar função alternativa mais simples
CREATE OR REPLACE FUNCTION force_delete_conversation(
  conversation_id_param UUID,
  user_id_param TEXT
)
RETURNS boolean AS $$
BEGIN
  DELETE FROM chat_messages WHERE conversation_id = conversation_id_param;
  DELETE FROM chat_conversations 
  WHERE id = conversation_id_param AND user_id::text = user_id_param;
  
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION delete_conversation_admin(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION force_delete_conversation(UUID, TEXT) TO authenticated, anon;

-- Verificar se foram criadas
SELECT proname as function_name
FROM pg_proc 
WHERE proname IN ('delete_conversation_admin', 'force_delete_conversation'); 