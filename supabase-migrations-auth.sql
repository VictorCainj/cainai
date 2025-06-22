-- Migrações Adicionais para Sistema de Autenticação Avançado
-- Execute após as migrações base (supabase-migrations.sql)

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Função para criar perfil automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, preferences)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'user_name', split_part(NEW.email, '@', 1)),
    '{
      "theme": "dark",
      "language": "pt-BR",
      "notifications": true,
      "auto_save": true
    }'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Atualizar políticas RLS para melhor segurança
DROP POLICY IF EXISTS "Users can view own conversations" ON chat_conversations;
CREATE POLICY "Users can view own conversations" ON chat_conversations
  FOR SELECT USING (
    auth.uid() = user_id::uuid OR
    (auth.uid() IS NULL AND user_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Users can create conversations" ON chat_conversations;
CREATE POLICY "Users can create conversations" ON chat_conversations
  FOR INSERT WITH CHECK (
    auth.uid() = user_id::uuid OR
    (auth.uid() IS NULL AND user_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Users can update own conversations" ON chat_conversations;
CREATE POLICY "Users can update own conversations" ON chat_conversations
  FOR UPDATE USING (
    auth.uid() = user_id::uuid OR
    (auth.uid() IS NULL AND user_id IS NOT NULL)
  );

DROP POLICY IF EXISTS "Users can delete own conversations" ON chat_conversations;
CREATE POLICY "Users can delete own conversations" ON chat_conversations
  FOR DELETE USING (
    auth.uid() = user_id::uuid OR
    (auth.uid() IS NULL AND user_id IS NOT NULL)
  );

-- Melhorar políticas para mensagens
DROP POLICY IF EXISTS "Users can view messages from own conversations" ON chat_messages;
CREATE POLICY "Users can view messages from own conversations" ON chat_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM chat_conversations 
      WHERE auth.uid() = user_id::uuid OR 
            (auth.uid() IS NULL AND user_id IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS "Users can create messages in own conversations" ON chat_messages;
CREATE POLICY "Users can create messages in own conversations" ON chat_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM chat_conversations 
      WHERE auth.uid() = user_id::uuid OR
            (auth.uid() IS NULL AND user_id IS NOT NULL)
    )
  );

-- Função para migrar conversas de usuário anônimo para autenticado
CREATE OR REPLACE FUNCTION migrate_anonymous_conversations(
  anonymous_user_id UUID,
  authenticated_user_id UUID
)
RETURNS boolean AS $$
DECLARE
  conversation_count INTEGER;
BEGIN
  -- Verificar se o usuário autenticado existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = authenticated_user_id) THEN
    RAISE EXCEPTION 'Usuário autenticado não encontrado';
  END IF;

  -- Migrar conversas
  UPDATE chat_conversations 
  SET user_id = authenticated_user_id,
      updated_at = timezone('utc', now())
  WHERE user_id = anonymous_user_id;

  GET DIAGNOSTICS conversation_count = ROW_COUNT;
  
  -- Log da migração
  INSERT INTO public.migration_logs (
    from_user_id,
    to_user_id,
    conversations_migrated,
    migrated_at
  ) VALUES (
    anonymous_user_id,
    authenticated_user_id,
    conversation_count,
    timezone('utc', now())
  );

  RETURN conversation_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tabela para logs de migração (opcional)
CREATE TABLE IF NOT EXISTS migration_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID,
  to_user_id UUID REFERENCES auth.users(id),
  conversations_migrated INTEGER DEFAULT 0,
  migrated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Função para estatísticas do usuário
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE (
  total_conversations INTEGER,
  total_messages INTEGER,
  messages_today INTEGER,
  last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM chat_conversations WHERE user_id = user_uuid),
    (SELECT COUNT(*)::INTEGER 
     FROM chat_messages cm 
     JOIN chat_conversations cc ON cm.conversation_id = cc.id 
     WHERE cc.user_id = user_uuid),
    (SELECT COUNT(*)::INTEGER 
     FROM chat_messages cm 
     JOIN chat_conversations cc ON cm.conversation_id = cc.id 
     WHERE cc.user_id = user_uuid 
       AND cm.created_at >= CURRENT_DATE),
    (SELECT MAX(cm.created_at) 
     FROM chat_messages cm 
     JOIN chat_conversations cc ON cm.conversation_id = cc.id 
     WHERE cc.user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Índices adicionais para performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_migration_logs_to_user ON migration_logs(to_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);

-- View para conversas com estatísticas
CREATE OR REPLACE VIEW conversation_stats AS
SELECT 
  c.id,
  c.user_id,
  c.title,
  c.created_at,
  c.updated_at,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_message_at,
  SUBSTRING(
    COALESCE(
      (SELECT content FROM chat_messages 
       WHERE conversation_id = c.id 
       ORDER BY created_at DESC 
       LIMIT 1),
      'Conversa iniciada'
    ), 1, 100
  ) as last_message_preview
FROM chat_conversations c
LEFT JOIN chat_messages m ON c.id = m.conversation_id
GROUP BY c.id, c.user_id, c.title, c.created_at, c.updated_at;

-- Políticas para a view
ALTER VIEW conversation_stats OWNER TO postgres;
GRANT SELECT ON conversation_stats TO authenticated, anon;

-- Função para busca de conversas
CREATE OR REPLACE FUNCTION search_conversations(
  user_uuid UUID,
  search_term TEXT DEFAULT '',
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  message_count BIGINT,
  last_message_preview TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id,
    cs.title,
    cs.created_at,
    cs.updated_at,
    cs.message_count,
    cs.last_message_preview
  FROM conversation_stats cs
  WHERE cs.user_id = user_uuid
    AND (
      search_term = '' OR
      cs.title ILIKE '%' || search_term || '%' OR
      cs.last_message_preview ILIKE '%' || search_term || '%'
    )
  ORDER BY cs.updated_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Configurar autenticação OAuth (executar no Dashboard)
-- Vá em Authentication > Settings > Auth Providers e configure:
-- Google OAuth, GitHub OAuth conforme necessário

-- Comentários de configuração adicional:
-- 1. No Dashboard do Supabase, vá em Authentication > Settings
-- 2. Configure os provedores OAuth desejados (Google, GitHub)
-- 3. Adicione os domínios do seu site em Site URL e Redirect URLs
-- 4. Para produção, adicione as URLs de produção

-- Verificação de integridade
DO $$
BEGIN
  RAISE NOTICE 'Migrações de autenticação aplicadas com sucesso!';
  RAISE NOTICE 'Total de tabelas: %', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public');
  RAISE NOTICE 'Total de funções: %', (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public');
END $$; 