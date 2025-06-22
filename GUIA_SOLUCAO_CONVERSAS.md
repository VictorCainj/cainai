# Guia: Resolver Problema de Conversas que Não Aparecem na Produção

## Problema Identificado

O chat está funcionando no ambiente de produção, mas conversas anteriores que aparecem no ambiente local não estão sendo exibidas, mesmo sendo a mesma conta de usuário.

## Causa Raiz

A diferença está em como o `userId` é gerenciado entre os ambientes:

1. **Ambiente Local**: Usa `sessionManager.getUserId()` que gera UUIDs anônimos armazenados no localStorage
2. **Ambiente Produção**: As políticas RLS (Row Level Security) do Supabase usam `auth.uid()` que só funciona para usuários autenticados
3. **Resultado**: Conversas criadas no modo anônimo ficam "órfãs" quando o usuário se autentica

## Solução Implementada

### 1. Sistema de Detecção Automática

Foi adicionado um sistema que:
- Detecta automaticamente conversas órfãs quando o usuário se autentica
- Mostra um prompt oferecendo migração das conversas
- Permite migração com um clique

### 2. Endpoints de API Criados

#### `/api/conversations/diagnostics`
- Diagnostica conversas órfãs
- Compara IDs anônimos vs autenticados
- Retorna lista de conversas que podem ser migradas

#### `/api/conversations/migrate`
- Executa a migração das conversas
- Atualiza `user_id` das conversas órfãs
- Registra log da migração para auditoria

### 3. Melhorias no Chat Service

Novos métodos adicionados:
- `diagnoseOrphanedConversations()`: Diagnostica conversas órfãs
- `migrateOrphanedConversations()`: Migra conversas órfãs
- `checkUserIntegrity()`: Verifica integridade dos dados do usuário

## Como Usar a Solução

### Para Usuários

1. **Faça login** na aplicação em produção
2. **Aguarde alguns segundos** - o sistema detectará conversas órfãs automaticamente
3. **Se aparecer o prompt amarelo** com "Conversas anteriores encontradas":
   - Clique em **"Migrar"** para recuperar suas conversas
   - Ou clique em **"Ignorar"** se não quiser migrar
4. **Aguarde a migração** - será mostrada uma confirmação de sucesso
5. **Suas conversas antigas** aparecerão na lista

### Para Desenvolvedores

#### Verificar Status de um Usuário
```sql
-- Ver conversas de um usuário específico
SELECT user_id, count(*) as total_conversations
FROM chat_conversations 
WHERE user_id = 'USER_ID_AQUI'
GROUP BY user_id;

-- Ver mensagens associadas
SELECT cc.user_id, cc.title, count(cm.id) as message_count
FROM chat_conversations cc
LEFT JOIN chat_messages cm ON cc.id = cm.conversation_id
WHERE cc.user_id = 'USER_ID_AQUI'
GROUP BY cc.id, cc.user_id, cc.title;
```

#### Migração Manual via SQL
```sql
-- Migrar conversas de ID anônimo para ID autenticado
UPDATE chat_conversations 
SET user_id = 'AUTHENTICATED_USER_ID',
    updated_at = NOW()
WHERE user_id = 'ANONYMOUS_USER_ID';

-- Verificar migração
SELECT user_id, count(*) 
FROM chat_conversations 
WHERE user_id IN ('ANONYMOUS_USER_ID', 'AUTHENTICATED_USER_ID')
GROUP BY user_id;
```

#### Debug via API
```javascript
// Diagnosticar conversas órfãs
fetch('/api/conversations/diagnostics?anonymousId=UUID_ANONIMO&userId=UUID_AUTENTICADO')
  .then(r => r.json())
  .then(console.log)

// Executar migração
fetch('/api/conversations/migrate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromUserId: 'UUID_ANONIMO',
    toUserId: 'UUID_AUTENTICADO'
  })
}).then(r => r.json()).then(console.log)
```

## Políticas RLS Verificadas

As políticas RLS no Supabase estão configuradas para:
- Permitir acesso baseado em `auth.uid()` para usuários autenticados
- Usar fallback para claims JWT quando necessário
- Permitir migração de dados entre IDs

## Prevenção Futura

Para evitar esse problema no futuro:

1. **Durante desenvolvimento**: Sempre teste com usuários autenticados
2. **Antes do deploy**: Execute migração de dados anônimos
3. **Monitoramento**: Use os endpoints de diagnóstico para detectar problemas
4. **Backup**: Sempre faça backup antes de executar migrações

## Troubleshooting

### Se a migração falhar:

1. **Verifique as políticas RLS** no Supabase Dashboard
2. **Confirme as permissões** do usuário autenticado
3. **Verifique logs** no console do navegador
4. **Execute diagnóstico manual** via SQL

### Se conversas ainda não aparecem:

1. **Limpe o cache** do navegador
2. **Faça logout/login** novamente
3. **Verifique o localStorage** - pode ter IDs conflitantes
4. **Execute migração manual** via SQL

### Logs importantes:

- Console do navegador: Erros de autenticação
- Supabase Dashboard: Logs de RLS
- Network tab: Respostas das APIs de migração

## Contato para Suporte

Se a solução não funcionar:
1. Colete logs do console
2. Anote os UUIDs envolvidos (anônimo vs autenticado)
3. Exporte dados das conversas se possível
4. Entre em contato com informações detalhadas

---

**Nota**: Esta solução mantém a integridade dos dados e não afeta conversas de outros usuários. 