# 🗄️ Configuração de Persistência de Conversas - Supabase

Este guia mostra como configurar a persistência de conversas de chat no Supabase para que as conversas sejam salvas e recuperadas entre sessões.

## 📋 Pré-requisitos

- Conta no Supabase (gratuita)
- Projeto Next.js configurado
- Chave da API OpenAI

## 🚀 Passo a Passo

### 1. Configurar Projeto Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Aguarde a inicialização (pode levar alguns minutos)
4. Anote a **URL do projeto** e a **chave anônima**

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
```

**Como obter as chaves:**
- URL e chave anônima: Dashboard → Settings → API
- Service role key: Dashboard → Settings → API → service_role (mantenha secreta!)

### 3. Executar Migrações SQL

1. No dashboard do Supabase, vá para **SQL Editor**
2. Copie e execute o código do arquivo `supabase-migrations.sql`
3. Verifique se as tabelas foram criadas:
   - `profiles`
   - `chat_conversations` 
   - `chat_messages`

### 4. Verificar Configuração

Execute o projeto e teste:

```bash
npm run dev
```

1. Inicie uma conversa
2. Envie algumas mensagens
3. Recarregue a página
4. Verifique se a conversa persiste na sidebar

## 🔒 Segurança e RLS (Row Level Security)

As políticas RLS estão configuradas para:

- ✅ Usuários podem ver apenas suas próprias conversas
- ✅ Usuários podem criar/editar apenas suas próprias conversas
- ✅ Mensagens são protegidas por conversa
- ✅ Suporte a usuários anônimos temporários

## 📊 Estrutura do Banco de Dados

### Tabela: `chat_conversations`
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- title (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Tabela: `chat_messages`
```sql
- id (UUID, PK)
- conversation_id (UUID, FK)
- role (TEXT: 'user' | 'assistant' | 'system')
- content (TEXT)
- metadata (JSONB)
- created_at (TIMESTAMP)
```

### Tabela: `profiles` (opcional)
```sql
- id (UUID, PK, FK to auth.users)
- username (TEXT)
- full_name (TEXT)
- avatar_url (TEXT)
- preferences (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## 🛠️ Funcionalidades Implementadas

### ✅ Persistência de Conversas
- Conversas são salvas automaticamente
- Carregamento das conversas na sidebar
- Histórico completo de mensagens

### ✅ Sistema de Sessão
- Usuários anônimos temporários
- IDs únicos por sessão
- Migração de dados para usuários autenticados

### ✅ Modo Fallback
- Funciona mesmo se o banco estiver indisponível
- Conversas temporárias em memória
- Graceful degradation

### ✅ Performance
- Índices otimizados
- Consultas eficientes
- Limpeza automática de dados antigos

## 🧹 Manutenção

### Limpeza de Dados Antigos
O sistema inclui uma função para limpar conversas antigas:

```sql
SELECT cleanup_old_conversations(); -- Remove conversas > 90 dias
```

### Monitoramento
Verifique logs do Supabase para:
- Erros de RLS
- Performance das queries
- Uso de storage

## 🔧 Troubleshooting

### Problema: "RLS policy violation"
**Solução:** Verifique se as políticas RLS estão configuradas corretamente

### Problema: "Table doesn't exist"
**Solução:** Execute as migrações SQL novamente

### Problema: Conversas não aparecem
**Solução:** 
1. Verifique o userId na sessão
2. Confirme se as políticas RLS permitem acesso
3. Verifique logs do Supabase

### Problema: Performance lenta
**Solução:**
1. Verifique se os índices foram criados
2. Monitore uso de queries no dashboard
3. Considere implementar paginação

## 📈 Próximos Passos

Para melhorar ainda mais o sistema:

1. **Autenticação Real:** Implementar login com Supabase Auth
2. **Compartilhamento:** Permitir compartilhar conversas
3. **Busca:** Implementar busca full-text nas mensagens
4. **Backup:** Exportar conversas em JSON/PDF
5. **Analytics:** Métricas de uso e engagement

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs do console do navegador
2. Verifique os logs do Supabase Dashboard
3. Confirme se todas as variáveis de ambiente estão corretas
4. Teste se a API do OpenAI está funcionando

## 🎯 Recursos Úteis

- [Documentação Supabase](https://supabase.com/docs)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables) 