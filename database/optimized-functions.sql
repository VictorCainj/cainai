-- 🚀 FUNÇÕES SQL OTIMIZADAS PARA CDI
-- Resolver problema N+1 e melhorar performance drasticamente

-- ========================================
-- 1. FUNÇÃO PRINCIPAL: Conversas com Estatísticas
-- ========================================
-- Substitui múltiplas queries por uma única query otimizada
CREATE OR REPLACE FUNCTION get_user_conversations_with_stats(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  title TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  message_count BIGINT,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  has_unread BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH conversation_stats AS (
    SELECT 
      c.id,
      c.user_id,
      c.title,
      c.created_at,
      c.updated_at,
      COALESCE(COUNT(m.id), 0) as message_count,
      MAX(m.created_at) as last_message_time,
      -- Buscar última mensagem de forma eficiente
      (
        SELECT m2.content 
        FROM chat_messages m2 
        WHERE m2.conversation_id = c.id 
        ORDER BY m2.created_at DESC 
        LIMIT 1
      ) as last_message,
      -- Verificar se há mensagens não lidas (exemplo)
      EXISTS(
        SELECT 1 
        FROM chat_messages m3 
        WHERE m3.conversation_id = c.id 
        AND m3.role = 'assistant'
        AND m3.created_at > COALESCE(c.last_read_at, '1970-01-01'::timestamptz)
      ) as has_unread
    FROM chat_conversations c
    LEFT JOIN chat_messages m ON c.id = m.conversation_id
    WHERE c.user_id = p_user_id
    GROUP BY c.id, c.user_id, c.title, c.created_at, c.updated_at, c.last_read_at
  )
  SELECT 
    cs.id,
    cs.user_id,
    cs.title,
    cs.created_at,
    cs.updated_at,
    cs.message_count,
    SUBSTRING(COALESCE(cs.last_message, 'Sem mensagens'), 1, 100) as last_message,
    cs.last_message_time,
    cs.has_unread
  FROM conversation_stats cs
  ORDER BY 
    CASE 
      WHEN cs.last_message_time IS NULL THEN cs.updated_at 
      ELSE cs.last_message_time 
    END DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================
-- 2. FUNÇÃO: Buscar Mensagens Otimizada
-- ========================================
-- Para lazy loading eficiente de mensagens
CREATE OR REPLACE FUNCTION get_conversation_messages_paginated(
  p_conversation_id UUID,
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  conversation_id UUID,
  role TEXT,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  has_more BOOLEAN
) AS $$
DECLARE
  v_has_more BOOLEAN := FALSE;
BEGIN
  -- Verificar se usuário tem acesso à conversa
  IF NOT EXISTS(
    SELECT 1 FROM chat_conversations 
    WHERE id = p_conversation_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Conversa não encontrada ou sem permissão';
  END IF;

  -- Buscar mensagens com cursor
  RETURN QUERY
  WITH messages_with_next AS (
    SELECT 
      m.id,
      m.conversation_id,
      m.role,
      m.content,
      m.metadata,
      m.created_at,
      -- Verificar se há mais mensagens
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY m.created_at ASC) <= p_limit THEN FALSE
        ELSE TRUE
      END as is_extra
    FROM chat_messages m
    WHERE m.conversation_id = p_conversation_id
      AND (p_cursor IS NULL OR m.created_at > p_cursor)
    ORDER BY m.created_at ASC
    LIMIT p_limit + 1
  )
  SELECT 
    m.id,
    m.conversation_id,
    m.role,
    m.content,
    m.metadata,
    m.created_at,
    EXISTS(SELECT 1 FROM messages_with_next WHERE is_extra = TRUE) as has_more
  FROM messages_with_next m
  WHERE m.is_extra = FALSE
  ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================
-- 3. FUNÇÃO: Estatísticas Rápidas
-- ========================================
-- Para dashboards e métricas
CREATE OR REPLACE FUNCTION get_user_chat_stats(p_user_id UUID)
RETURNS TABLE(
  total_conversations BIGINT,
  total_messages BIGINT,
  messages_today BIGINT,
  avg_messages_per_conversation NUMERIC,
  most_active_day TEXT,
  last_activity TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(DISTINCT c.id) as total_conversations,
      COUNT(m.id) as total_messages,
      COUNT(CASE 
        WHEN DATE(m.created_at) = CURRENT_DATE THEN 1 
      END) as messages_today,
      CASE 
        WHEN COUNT(DISTINCT c.id) > 0 
        THEN ROUND(COUNT(m.id)::NUMERIC / COUNT(DISTINCT c.id), 2)
        ELSE 0
      END as avg_messages_per_conversation,
      MAX(m.created_at) as last_activity
    FROM chat_conversations c
    LEFT JOIN chat_messages m ON c.id = m.conversation_id
    WHERE c.user_id = p_user_id
  ),
  daily_activity AS (
    SELECT 
      TO_CHAR(m.created_at, 'Day') as day_name,
      COUNT(*) as message_count,
      ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rn
    FROM chat_conversations c
    JOIN chat_messages m ON c.id = m.conversation_id
    WHERE c.user_id = p_user_id
      AND m.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY TO_CHAR(m.created_at, 'Day')
  )
  SELECT 
    s.total_conversations,
    s.total_messages,
    s.messages_today,
    s.avg_messages_per_conversation,
    COALESCE(d.day_name, 'N/A') as most_active_day,
    s.last_activity
  FROM stats s
  LEFT JOIN daily_activity d ON d.rn = 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================
-- 4. FUNÇÃO: Busca Inteligente
-- ========================================
-- Para buscar conversas e mensagens por texto
CREATE OR REPLACE FUNCTION search_conversations_and_messages(
  p_user_id UUID,
  p_search_term TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  conversation_id UUID,
  conversation_title TEXT,
  message_id UUID,
  message_content TEXT,
  message_role TEXT,
  created_at TIMESTAMPTZ,
  relevance_score REAL,
  context_snippet TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    -- Buscar em títulos de conversas
    SELECT 
      c.id as conversation_id,
      c.title as conversation_title,
      NULL::UUID as message_id,
      NULL::TEXT as message_content,
      'conversation'::TEXT as message_role,
      c.created_at,
      1.0::REAL as relevance_score,
      SUBSTRING(c.title, 1, 200) as context_snippet
    FROM chat_conversations c
    WHERE c.user_id = p_user_id
      AND c.title ILIKE '%' || p_search_term || '%'
    
    UNION ALL
    
    -- Buscar em conteúdo de mensagens
    SELECT 
      m.conversation_id,
      c.title as conversation_title,
      m.id as message_id,
      m.content as message_content,
      m.role as message_role,
      m.created_at,
      0.8::REAL as relevance_score,
      -- Snippet com contexto
      SUBSTRING(
        m.content, 
        GREATEST(1, POSITION(LOWER(p_search_term) IN LOWER(m.content)) - 50),
        200
      ) as context_snippet
    FROM chat_messages m
    JOIN chat_conversations c ON m.conversation_id = c.id
    WHERE c.user_id = p_user_id
      AND m.content ILIKE '%' || p_search_term || '%'
  )
  SELECT * FROM search_results
  ORDER BY relevance_score DESC, created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================
-- 5. FUNÇÃO: Limpeza Automática
-- ========================================
-- Para manter performance em conversas antigas
CREATE OR REPLACE FUNCTION cleanup_old_conversations(
  p_days_old INTEGER DEFAULT 90,
  p_dry_run BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
  action TEXT,
  conversation_id UUID,
  title TEXT,
  message_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_cutoff_date TIMESTAMPTZ;
  v_deleted_count INTEGER := 0;
BEGIN
  v_cutoff_date := CURRENT_TIMESTAMP - (p_days_old || ' days')::INTERVAL;
  
  -- Mostrar o que seria deletado
  RETURN QUERY
  SELECT 
    CASE WHEN p_dry_run THEN 'WOULD_DELETE' ELSE 'DELETED' END as action,
    c.id as conversation_id,
    c.title,
    COUNT(m.id) as message_count,
    c.created_at
  FROM chat_conversations c
  LEFT JOIN chat_messages m ON c.id = m.conversation_id
  WHERE c.created_at < v_cutoff_date
    AND c.updated_at < v_cutoff_date
  GROUP BY c.id, c.title, c.created_at
  ORDER BY c.created_at ASC;

  -- Se não for dry run, executar limpeza
  IF NOT p_dry_run THEN
    -- Deletar mensagens primeiro
    DELETE FROM chat_messages 
    WHERE conversation_id IN (
      SELECT id FROM chat_conversations 
      WHERE created_at < v_cutoff_date
        AND updated_at < v_cutoff_date
    );
    
    -- Deletar conversas
    DELETE FROM chat_conversations 
    WHERE created_at < v_cutoff_date
      AND updated_at < v_cutoff_date;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- COMENTÁRIOS E NOTAS
-- ========================================
-- Para aplicar estas funções no Supabase:
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Certifique-se que as tabelas existem
-- 3. Execute os índices no arquivo indexes.sql
-- 4. Teste as funções antes de usar em produção

-- Exemplos de uso:
-- SELECT * FROM get_user_conversations_with_stats('user-uuid-here');
-- SELECT * FROM get_conversation_messages_paginated('conv-uuid', 'user-uuid', 20);
-- SELECT * FROM search_conversations_and_messages('user-uuid', 'termo busca'); 