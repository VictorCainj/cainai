# 🔧 Guia para Corrigir Políticas RLS - Problema de Exclusão

## ❌ **Problema Identificado:**
As políticas RLS (Row Level Security) do Supabase estão mal configuradas, impedindo a exclusão de conversas. Especificamente:

1. Política de DELETE muito permissiva (`user_id IS NOT NULL`)
2. **Falta política de DELETE para mensagens** (crítico!)
3. Validação de userId inconsistente

## ✅ **Solução:**

### **Passo 1: Acessar o Supabase Dashboard**
1. Acesse [supabase.com](https://supabase.com)
2. Faça login na sua conta
3. Selecione seu projeto
4. Vá em **"SQL Editor"** no menu lateral

### **Passo 2: Executar a Migration Corrigida**
1. No SQL Editor, cole e execute o seguinte código **(VERSÃO CORRIGIDA)**:

```sql
-- Migração para Corrigir Políticas RLS de Exclusão (VERSÃO CORRIGIDA)
-- Execute esta migration para corrigir problemas de exclusão

-- Remover TODAS as políticas existentes (incluindo as que podem já existir)
DROP POLICY IF EXISTS "Users can delete own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can view messages from own conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users can create messages in own conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete messages from own conversations" ON chat_messages;

-- Remover também possíveis políticas com nomes ligeiramente diferentes
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Políticas corrigidas para conversas (mais restritivas e seguras)
CREATE POLICY "Users can view own conversations" ON chat_conversations
  FOR SELECT USING (
    user_id::text = COALESCE(auth.uid()::text, current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY "Users can create conversations" ON chat_conversations
  FOR INSERT WITH CHECK (
    user_id::text = COALESCE(auth.uid()::text, current_setting('request.jwt.claims', true)::json->>'sub')
  );

CREATE POLICY "Users can update own conversations" ON chat_conversations
  FOR UPDATE USING (
    user_id::text = COALESCE(auth.uid()::text, current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Política corrigida para DELETE de conversas
CREATE POLICY "Users can delete own conversations" ON chat_conversations
  FOR DELETE USING (
    user_id::text = COALESCE(auth.uid()::text, current_setting('request.jwt.claims', true)::json->>'sub')
  );

-- Políticas para mensagens
CREATE POLICY "Users can view messages from own conversations" ON chat_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM chat_conversations 
      WHERE user_id::text = COALESCE(auth.uid()::text, current_setting('request.jwt.claims', true)::json->>'sub')
    )
  );

CREATE POLICY "Users can create messages in own conversations" ON chat_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM chat_conversations 
      WHERE user_id::text = COALESCE(auth.uid()::text, current_setting('request.jwt.claims', true)::json->>'sub')
    )
  );

-- CRÍTICO: Política para DELETE de mensagens (agora com DROP IF EXISTS)
CREATE POLICY "Users can delete messages from own conversations" ON chat_messages
  FOR DELETE USING (
    conversation_id IN (
      SELECT id FROM chat_conversations 
      WHERE user_id::text = COALESCE(auth.uid()::text, current_setting('request.jwt.claims', true)::json->>'sub')
    )
  );

-- Recriar políticas para profiles se necessário
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Função alternativa para exclusão sem RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION delete_conversation_admin(
  conversation_id_param UUID,
  user_id_param TEXT
)
RETURNS boolean AS $$
DECLARE
  deleted_conversations INTEGER := 0;
  deleted_messages INTEGER := 0;
BEGIN
  -- Verificar se a conversa existe e pertence ao usuário
  IF NOT EXISTS (
    SELECT 1 FROM chat_conversations 
    WHERE id = conversation_id_param AND user_id::text = user_id_param
  ) THEN
    RAISE NOTICE 'Conversa não encontrada ou não pertence ao usuário';
    RETURN FALSE;
  END IF;

  -- Primeiro, excluir mensagens
  DELETE FROM chat_messages 
  WHERE conversation_id = conversation_id_param;
  
  GET DIAGNOSTICS deleted_messages = ROW_COUNT;
  RAISE NOTICE 'Mensagens excluídas: %', deleted_messages;

  -- Depois, excluir conversa
  DELETE FROM chat_conversations 
  WHERE id = conversation_id_param AND user_id::text = user_id_param;
  
  GET DIAGNOSTICS deleted_conversations = ROW_COUNT;
  RAISE NOTICE 'Conversas excluídas: %', deleted_conversations;

  RETURN deleted_conversations > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões para a função
GRANT EXECUTE ON FUNCTION delete_conversation_admin(UUID, TEXT) TO authenticated, anon;

-- Verificação final das políticas criadas
DO $$
BEGIN
  RAISE NOTICE 'Políticas RLS corrigidas aplicadas com sucesso!';
  RAISE NOTICE 'Total de políticas para chat_conversations: %', (
    SELECT COUNT(*) FROM pg_policies WHERE tablename = 'chat_conversations'
  );
  RAISE NOTICE 'Total de políticas para chat_messages: %', (
    SELECT COUNT(*) FROM pg_policies WHERE tablename = 'chat_messages'
  );
  RAISE NOTICE 'Agora a exclusão deve funcionar corretamente.';
END $$;
```

### **Passo 3: Verificar Execução**
Você deve ver mensagens como:
```
NOTICE: Políticas RLS corrigidas aplicadas com sucesso!
NOTICE: Total de políticas para chat_conversations: 4
NOTICE: Total de políticas para chat_messages: 3
NOTICE: Agora a exclusão deve funcionar corretamente.
```

### **Passo 4: Testar a Exclusão**
1. Volte ao seu chat
2. Tente excluir uma conversa
3. Verifique o console do navegador para logs detalhados
4. Recarregue a página - a conversa não deve voltar

## 🔍 **O que foi corrigido:**

1. **✅ Políticas RLS mais restritivas** - agora verificam exatamente se o usuário é o dono
2. **✅ Política de DELETE para mensagens** - estava faltando completamente!
3. **✅ Função admin de fallback** - funciona independente do RLS
4. **✅ Logging detalhado** - para debug futuro
5. **✅ Remoção de todas as políticas existentes** - evita conflitos

## 🚨 **Se ainda não funcionar:**

Execute este comando adicional para verificar as políticas:

```sql
-- Verificar políticas ativas
SELECT tablename, policyname, cmd, permissive, roles, qual 
FROM pg_policies 
WHERE tablename IN ('chat_conversations', 'chat_messages')
ORDER BY tablename, policyname;
```

---

**⚠️ Use a VERSÃO CORRIGIDA da migration acima que inclui `DROP POLICY IF EXISTS` para todas as políticas! 🎉** 