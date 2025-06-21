-- Políticas RLS Corrigidas para Usuários Anônimos
-- Execute estas políticas no Supabase Dashboard para corrigir o problema de RLS

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can view messages from own conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON chat_messages;

-- Políticas CORRIGIDAS para conversas
-- Permite visualização: usuários autenticados veem suas próprias + usuários anônimos veem por user_id
CREATE POLICY "Users can view conversations" ON chat_conversations
  FOR SELECT USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN auth.uid()::text = user_id::text
      ELSE user_id IS NOT NULL
    END
  );

-- Permite criação: usuários autenticados só podem criar para si + usuários anônimos podem criar com qualquer user_id
CREATE POLICY "Users can create conversations" ON chat_conversations
  FOR INSERT WITH CHECK (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN auth.uid()::text = user_id::text
      ELSE user_id IS NOT NULL
    END
  );

-- Permite atualização: usuários autenticados só suas próprias + usuários anônimos por user_id
CREATE POLICY "Users can update conversations" ON chat_conversations
  FOR UPDATE USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN auth.uid()::text = user_id::text
      ELSE user_id IS NOT NULL
    END
  );

-- Permite exclusão: usuários autenticados só suas próprias + usuários anônimos por user_id
CREATE POLICY "Users can delete conversations" ON chat_conversations
  FOR DELETE USING (
    CASE 
      WHEN auth.uid() IS NOT NULL THEN auth.uid()::text = user_id::text
      ELSE user_id IS NOT NULL
    END
  );

-- Políticas CORRIGIDAS para mensagens
-- Permite visualização de mensagens de conversas próprias
CREATE POLICY "Users can view messages" ON chat_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM chat_conversations 
      WHERE CASE 
        WHEN auth.uid() IS NOT NULL THEN auth.uid()::text = user_id::text
        ELSE user_id IS NOT NULL
      END
    )
  );

-- Permite criação de mensagens em conversas próprias
CREATE POLICY "Users can create messages" ON chat_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM chat_conversations 
      WHERE CASE 
        WHEN auth.uid() IS NOT NULL THEN auth.uid()::text = user_id::text
        ELSE user_id IS NOT NULL
      END
    )
  );

-- Verificar se as políticas foram aplicadas
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('chat_conversations', 'chat_messages')
ORDER BY tablename, policyname; 