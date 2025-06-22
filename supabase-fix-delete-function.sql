-- Script para corrigir a função de exclusão de conversas
-- Execute no Supabase SQL Editor

-- Remover função existente se houver
DROP FUNCTION IF EXISTS delete_conversation_admin(UUID, TEXT);

-- Criar função corrigida para exclusão de conversas
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
  -- Log de início
  RAISE NOTICE 'Iniciando exclusão: conversation_id=%, user_id=%', conversation_id_param, user_id_param;

  -- Verificar se a conversa existe e pertence ao usuário
  SELECT EXISTS (
    SELECT 1 FROM chat_conversations 
    WHERE id = conversation_id_param AND user_id::text = user_id_param
  ) INTO conversation_exists;

  IF NOT conversation_exists THEN
    RAISE NOTICE 'Conversa não encontrada ou não pertence ao usuário';
    RETURN FALSE;
  END IF;

  -- Primeiro, excluir mensagens relacionadas
  DELETE FROM chat_messages 
  WHERE conversation_id = conversation_id_param;
  
  GET DIAGNOSTICS deleted_messages = ROW_COUNT;
  RAISE NOTICE 'Mensagens excluídas: %', deleted_messages;

  -- Depois, excluir a conversa
  DELETE FROM chat_conversations 
  WHERE id = conversation_id_param AND user_id::text = user_id_param;
  
  GET DIAGNOSTICS deleted_conversations = ROW_COUNT;
  RAISE NOTICE 'Conversas excluídas: %', deleted_conversations;

  -- Verificar se a exclusão foi bem-sucedida
  IF deleted_conversations > 0 THEN
    RAISE NOTICE 'Exclusão bem-sucedida';
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'Nenhuma conversa foi excluída';
    RETURN FALSE;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro na exclusão: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões para a função
GRANT EXECUTE ON FUNCTION delete_conversation_admin(UUID, TEXT) TO authenticated, anon;

-- Criar função alternativa mais simples
CREATE OR REPLACE FUNCTION force_delete_conversation(
  conversation_id_param UUID,
  user_id_param TEXT
)
RETURNS boolean AS $$
BEGIN
  -- Exclusão forçada sem muitas verificações
  DELETE FROM chat_messages WHERE conversation_id = conversation_id_param;
  DELETE FROM chat_conversations WHERE id = conversation_id_param AND user_id::text = user_id_param;
  
  -- Retornar true se pelo menos uma linha foi afetada
  RETURN FOUND;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION force_delete_conversation(UUID, TEXT) TO authenticated, anon;

-- Testar a função (substitua pelos valores reais para testar)
-- SELECT delete_conversation_admin('uuid-da-conversa', 'user-id');

-- Verificar se as funções foram criadas
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('delete_conversation_admin', 'force_delete_conversation');

-- Mostrar status final
SELECT 
  CASE 
    WHEN COUNT(*) = 2 THEN '✅ Ambas as funções foram criadas com sucesso!'
    WHEN COUNT(*) = 1 THEN '⚠️ Apenas uma função foi criada'
    ELSE '❌ Nenhuma função foi criada'
  END as status_final
FROM pg_proc 
WHERE proname IN ('delete_conversation_admin', 'force_delete_conversation'); 