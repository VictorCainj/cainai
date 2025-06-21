# 🧪 Teste de Persistência de Conversas - Guia Completo

Este guia te ajudará a verificar se a persistência de conversas está funcionando corretamente.

## 🚀 **Antes de Começar**

### 1. Configure as Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase (obrigatório para persistência completa)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# OpenAI (obrigatório para chat)
OPENAI_API_KEY=sua_chave_openai
```

### 2. Execute o Projeto
```bash
npm run dev
```

## 🔍 **Testes de Funcionamento**

### **Teste 1: Sistema de Debug**
1. **Abra o aplicativo** em `http://localhost:3001`
2. **Na sidebar**, procure o ícone de bug (🐛) no "Status do Sistema"
3. **Clique no ícone** para abrir o painel de debug
4. **Clique em "Testar Conexão"**

**✅ Resultados Esperados:**
- Se configurado: "Conexão com Supabase funcionando!"
- Se não configurado: Mensagem de erro + "Modo temporário"

### **Teste 2: Persistência Local (SEMPRE FUNCIONA)**
1. **Inicie uma nova conversa**
2. **Envie algumas mensagens** (ex: "Olá", "Como você está?")
3. **Recarregue a página** (F5)
4. **Verifique a sidebar** - deve mostrar a conversa

**✅ Resultados Esperados:**
- Conversa aparece na sidebar
- Mensagens são preservadas
- Status: "X conversas" na sidebar

### **Teste 3: Múltiplas Conversas**
1. **Crie a primeira conversa** e envie mensagens
2. **Clique em "Nova Conversa"**
3. **Envie mensagens diferentes** na segunda conversa
4. **Recarregue a página**
5. **Clique em ambas as conversas** na sidebar

**✅ Resultados Esperados:**
- Duas conversas distintas na sidebar
- Cada uma mantém suas mensagens
- Títulos diferentes baseados na primeira mensagem

### **Teste 4: Persistência com Supabase (SE CONFIGURADO)**
1. **Configure o Supabase** (veja SUPABASE_SETUP.md)
2. **Execute as migrações SQL**
3. **Teste conexão** no painel de debug
4. **Crie conversas e mensagens**
5. **Abra o Supabase Dashboard** → Table Editor
6. **Verifique tabelas:**
   - `chat_conversations` - deve ter suas conversas
   - `chat_messages` - deve ter suas mensagens

**✅ Resultados Esperados:**
- Status: "Supabase conectado"
- Dados visíveis no dashboard do Supabase
- Conversas sincronizam entre dispositivos (mesmo user_id)

## 🐛 **Diagnóstico de Problemas**

### **Problema: "Conversas não aparecem após recarregar"**

**Diagnóstico:**
1. Abra **Console do Navegador** (F12)
2. Clique no **ícone de bug** na sidebar
3. Clique em **"Ver Logs"**
4. Verifique mensagens com `[LOCAL_BACKUP]`

**Soluções:**
- ✅ Se há logs `LOCAL_BACKUP`: Sistema funcionando, pode ser problema visual
- ❌ Se não há logs: Problema no JavaScript - verifique erros no console
- 🔄 Experimente **"Limpar Logs"** e teste novamente

### **Problema: "Modo temporário sempre ativo"**

**Diagnóstico:**
1. Verifique arquivo `.env.local` existe e está correto
2. Use **"Testar Conexão"** no debug
3. Verifique **Console** para erros de rede

**Soluções:**
- 📝 Crie/corrija arquivo `.env.local`
- 🌐 Verifique URL do Supabase (deve terminar com `.supabase.co`)
- 🔑 Verifique chaves (não devem ter espaços ou quebras de linha)
- 🔄 Reinicie o servidor após mudanças no .env

### **Problema: "Mensagens não são salvas"**

**Diagnóstico:**
1. Abra **Console** e procure por erros
2. Verifique logs com `[ADD_MESSAGE]`
3. Teste com mensagem simples como "teste"

**Soluções:**
- 🤖 Verifique chave da OpenAI
- 💾 Mesmo sem OpenAI, mensagens devem ser salvas localmente
- 🔄 Tente **"Exportar Debug"** e examine o arquivo

## 📊 **Entendendo os Status**

### **Status do Sistema:**
- 🟢 **"Supabase conectado"**: Tudo funcionando perfeitamente
- 🟡 **"Testando..."**: Verificando conexão
- 🔴 **"Modo temporário"**: Só armazenamento local (ainda funciona!)
- ⚪ **"Desconhecido"**: Sistema inicializando

### **Indicadores na Sidebar:**
- 💬 **"X conversas"**: Número de conversas encontradas
- 🔄 **Botão atualizar**: Recarrega conversas
- 🗑️ **Botão lixeira**: Deleta conversa (hover sobre conversa)

## 🛠️ **Ferramentas de Debug**

### **Painel de Debug** (ícone 🐛):
- **"Testar Conexão"**: Verifica Supabase
- **"Ver Logs"**: Mostra atividade no console
- **"Exportar Debug"**: Baixa arquivo JSON com dados técnicos
- **"Limpar Logs"**: Reset dos logs

### **Dados Exportados** incluem:
- Logs completos de atividade
- Informações do navegador
- Status das conexões
- Útil para suporte técnico

## ✅ **Checklist de Funcionalidades**

### **Básico (DEVE funcionar sempre):**
- [ ] Criar nova conversa
- [ ] Enviar mensagens
- [ ] Conversas aparecem na sidebar
- [ ] Mensagens persistem após recarregar
- [ ] Múltiplas conversas funcionam
- [ ] Deletar conversas

### **Avançado (com Supabase configurado):**
- [ ] Status "Supabase conectado"
- [ ] Dados no dashboard do Supabase
- [ ] Sincronização entre sessões
- [ ] Performance otimizada

### **Debug (sempre disponível):**
- [ ] Painel de debug abre
- [ ] Teste de conexão funciona
- [ ] Logs são gerados
- [ ] Export de debug funciona

## 🆘 **Ainda não funciona?**

### **Opção 1: Debug Completo**
1. **Abra Console** (F12)
2. **Limpe logs** existentes
3. **Recarregue** a página
4. **Faça teste** completo
5. **Copie TODOS** os logs do console
6. **Exporte debug** da sidebar

### **Opção 2: Modo Manual**
```javascript
// Cole no Console para debug manual:

// Verificar dados locais
console.log('Sessão:', localStorage.getItem('chat_session_user'))
console.log('Backup:', localStorage.getItem('chat_conversations_backup'))

// Verificar variáveis
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Tem OpenAI:', !!process.env.OPENAI_API_KEY)

// Testar serviços
import('./lib/chat-service').then(({chatService}) => {
  chatService.healthCheck().then(console.log)
})
```

## 📝 **Logs Importantes**

### **Logs que indicam funcionamento:**
- `[CHAT_SERVICE] Inicializando serviço de chat`
- `[LOCAL_BACKUP] Backup local criado`
- `[CREATE_CONV] Conversa criada`
- `[ADD_MESSAGE] Mensagem salva`

### **Logs que indicam problemas:**
- `[CONNECTION] Erro ao conectar com Supabase`
- `[ERROR]` qualquer mensagem
- Ausência de logs `LOCAL_BACKUP`

**Lembre-se:** O sistema foi projetado para SEMPRE funcionar, mesmo sem Supabase. Se as conversas não persistem nem localmente, há um problema no código que precisa ser investigado. 