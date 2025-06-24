CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_updated 
ON chat_conversations(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_title_search 
ON chat_conversations(title);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created 
ON chat_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_latest 
ON chat_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_role_count 
ON chat_messages(conversation_id, role);

CREATE INDEX IF NOT EXISTS idx_chat_messages_unread 
ON chat_messages(conversation_id, role, created_at);

CREATE INDEX IF NOT EXISTS idx_conversations_with_stats 
ON chat_conversations(user_id, id, updated_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_join 
ON chat_messages(conversation_id, created_at DESC, role);

CREATE INDEX IF NOT EXISTS idx_conversations_pagination 
ON chat_conversations(user_id, updated_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_conversations_cleanup 
ON chat_conversations(created_at, updated_at);

CREATE INDEX IF NOT EXISTS idx_messages_daily_stats 
ON chat_messages(conversation_id, created_at, role);

CREATE INDEX IF NOT EXISTS idx_messages_date_range 
ON chat_messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_metadata 
ON chat_messages USING gin(metadata);

ANALYZE chat_conversations;
ANALYZE chat_messages; 