# 🚀 Checklist de Deploy para Produção

## ✅ **PREPARAÇÃO CONCLUÍDA**

### 🧹 **Limpeza de Código**
- ✅ Logs de debug removidos dos arquivos principais
- ✅ Console.logs limitados apenas a erros em produção
- ✅ Configuração `removeConsole` ativa no next.config.js

### 🗄️ **Banco de Dados**
- ✅ Políticas RLS corrigidas e testadas
- ✅ Conversas sendo salvas corretamente
- ✅ Mensagens sendo persistidas no Supabase
- ✅ Função de exclusão funcionando

---

## 📋 **CHECKLIST PRÉ-DEPLOY**

### 🔑 **Variáveis de Ambiente**
- [ ] **NEXT_PUBLIC_SUPABASE_URL** configurada
- [ ] **NEXT_PUBLIC_SUPABASE_ANON_KEY** configurada  
- [ ] **OPENAI_API_KEY** configurada
- [ ] **SUPABASE_SERVICE_ROLE_KEY** configurada (opcional)

### 🏗️ **Build e Teste**
```bash
# 1. Instalar dependências
npm install

# 2. Build de produção
npm run build

# 3. Testar build localmente
npm start
```

### 🧪 **Testes Finais**
- [ ] Chat responde corretamente
- [ ] Conversas são salvas no banco
- [ ] Mensagens persistem após reload
- [ ] Exclusão de conversas funciona
- [ ] TTS funciona (se necessário)
- [ ] Geração de imagens funciona (se necessário)

---

## 🌐 **OPÇÕES DE DEPLOY**

### **Opção 1: Vercel (Recomendado)**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configurar variáveis de ambiente na dashboard do Vercel
```

### **Opção 2: Netlify**
```bash
# Build manual
npm run build

# Upload da pasta .next e configurar variáveis
```

### **Opção 3: Docker**
```bash
# Build da imagem
docker build -t cdi-chat .

# Run container
docker run -p 3000:3000 --env-file .env.local cdi-chat
```

---

## ⚙️ **CONFIGURAÇÕES DE PRODUÇÃO**

### 🛡️ **Segurança**
- ✅ Headers de segurança configurados
- ✅ RLS ativado no Supabase
- ✅ Validação de input implementada
- ✅ Rate limiting (implementar se necessário)

### 📊 **Performance**
- ✅ Compressão ativada
- ✅ Minificação SWC
- ✅ Otimização de imagens
- ✅ Cache configurado

### 🔍 **Monitoramento**
- [ ] Configurar analytics (opcional)
- [ ] Configurar error tracking (Sentry, etc)
- [ ] Logs de produção (apenas erros)

---

## 🔧 **PÓS-DEPLOY**

### ✅ **Verificações**
- [ ] Site carrega corretamente
- [ ] Chat funciona
- [ ] Banco de dados conecta
- [ ] APIs respondem
- [ ] Mobile responsivo

### 🏥 **Health Checks**
```bash
# Testar endpoints
curl https://seu-site.com/api/health
curl https://seu-site.com/api/chat -X POST
```

### 📱 **Testes de Usuário**
- [ ] Criar nova conversa
- [ ] Enviar mensagem
- [ ] Verificar resposta da IA
- [ ] Testar refresh da página
- [ ] Testar exclusão de conversa

---

## 🚨 **TROUBLESHOOTING**

### **Se o chat não salvar conversas:**
1. Verificar logs do Supabase
2. Testar políticas RLS manualmente
3. Verificar variáveis de ambiente

### **Se a IA não responder:**
1. Verificar OPENAI_API_KEY
2. Verificar cotas da OpenAI
3. Verificar logs da API

### **Se houver erro 500:**
1. Verificar logs da aplicação
2. Verificar conexão com banco
3. Verificar permissões

---

## 📞 **COMANDOS ÚTEIS**

```bash
# Ver logs de build
npm run build 2>&1 | tee build.log

# Testar produção local
npm run start

# Verificar bundle size
npm run build && npx @next/bundle-analyzer

# Limpar cache
rm -rf .next node_modules package-lock.json
npm install
```

---

## 🎯 **RESULTADO ESPERADO**

Após o deploy bem-sucedido:
- ✅ Chat funciona fluidamente
- ✅ Conversas são persistidas 
- ✅ Respostas da IA aparecem
- ✅ Interface responsiva
- ✅ Performance otimizada
- ✅ Logs limpos (apenas erros se houver)

---

**🚀 Seu chat está pronto para produção!** 