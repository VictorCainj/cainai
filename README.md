# 🤖 CDI - Chat com IA Avançado

> **Assistente de IA completo com TTS, geração de imagens e super memória**

[![Next.js](https://img.shields.io/badge/Next.js-14.2.30-black?logo=next.js)](https://nextjs.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4%20Turbo-blue?logo=openai)](https://openai.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.2-blue?logo=typescript)](https://typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green?logo=supabase)](https://supabase.com/)

## ✨ Funcionalidades Principais

### 🧠 **Inteligência Artificial Avançada**
- **GPT-4o** com super memória contextual
- **Conversas persistentes** entre sessões
- **Context7 MCP** para documentação dinâmica
- **Histórico inteligente** com busca
- **📊 Resumo Inteligente** - Análise automática de temas e tendências

### 🎨 **Interface Moderna e Fluida**
- **Design 3D** com gradientes e sombras avançadas
- **Animações suaves** com Framer Motion
- **Micro-interações** responsivas
- **Painel deslizante** para resumo de conversas
- **Cards de sugestões** interativos

### 🎵 **Text-to-Speech Premium**
- **6 vozes humanas realistas** da OpenAI
- **TTS-1-HD** para máxima qualidade
- **Controles individuais** por mensagem
- **Configurações personalizáveis**

### 🎨 **Geração de Imagens**
- **DALL-E 3** integrado
- **Qualidade profissional** 1024x1024
- **Visualização em tela cheia**
- **Download automático**

### 🔐 **Autenticação Segura**
- **Login social** (Google, GitHub, Discord)
- **Sessões persistentes** com Supabase
- **Proteção de rotas** automática

## 🚀 Instalação Rápida

### 1. Clonar e Instalar
```bash
git clone <repository-url>
cd cdi
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie `.env.local`:
```env
# OpenAI - Obrigatório
OPENAI_API_KEY=sk-...

# Supabase - Obrigatório  
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# URL do Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Executar
```bash
npm run dev
```

Acesse: **http://localhost:3000**

## 🏗️ Arquitetura

```
CDI/
├── app/                    # Next.js App Router
│   ├── api/               # APIs REST (chat, tts, images)
│   ├── chatbot/           # Interface principal
│   ├── auth/              # Autenticação
│   └── landing/           # Página inicial
├── components/            # Componentes React
│   ├── chat/              # Interface de chat e TTS
│   ├── ui/                # Componentes de UI
│   └── auth/              # Autenticação
├── lib/                   # Serviços e utilitários
├── docs/                  # Documentação técnica
└── types/                 # Tipos TypeScript
```

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL
- **AI**: OpenAI GPT-4o, DALL-E 3, TTS-1-HD
- **Auth**: Supabase Auth
- **Icons**: Lucide React

## 📚 Funcionalidades

### 🎯 Interface Principal
- Acesse `/chatbot` (requer login)
- Interface de chat intuitiva
- Histórico de conversas persistente
- Controles de TTS integrados

### 🔧 Configuração Avançada
- Context7 MCP para documentação dinâmica
- Múltiplos provedores de autenticação
- Configurações personalizáveis de voz

## 🎯 Como Usar

### Interface Principal
1. **Acesse** `/chatbot` (requer login)
2. **Digite** qualquer pergunta
3. **Clique** no botão "🔊 Ouvir" para TTS
4. **Peça** imagens: "Crie uma imagem de..."

### Funcionalidades TTS
- **Configurar voz**: Seletor no canto superior direito
- **Testar vozes**: Clique no ícone de volume
- **Controles**: Play/Pause individual por mensagem

### Geração de Imagens
- **Criar**: "Desenhe...", "Crie uma imagem de...", "Faça um logo..."
- **Visualizar**: Botão "👁️ Visualizar" para tela cheia
- **Baixar**: Botão "📥 Baixar" para salvar localmente

### 📊 Resumo Inteligente de Conversas
- **Acesso**: Botão flutuante "📊" no canto superior direito ou menu lateral
- **Geração sob demanda**: Apenas quando você solicitar (botão ou comando de texto)
- **Salvamento automático**: Resumos ficam persistentes no banco de dados
- **Análise por IA**: GPT-4 analisa tópicos, pontos-chave e sentimentos
- **Comandos de texto**: Digite "gerar resumo", "resumir conversa" ou "resumo"
- **Persistência**: Último resumo sempre disponível para cada conversa

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento (porta 3000)
npm run build        # Build para produção
npm run start        # Servidor de produção
npm run lint         # Verificação de código
```

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório no [Vercel](https://vercel.com)
2. Configure as variáveis de ambiente
3. Deploy automático a cada commit

### Configuração de Produção
- ✅ Configure `NEXT_PUBLIC_SITE_URL` com seu domínio
- ✅ Use HTTPS para OAuth funcionar
- ✅ Configure CORS no Supabase para seu domínio

## 🔒 Segurança

- ✅ **Zero vulnerabilidades** detectadas
- ✅ **Validação** de entrada em todas APIs
- ✅ **Sanitização** de conteúdo
- ✅ **Rate limiting** implementado
- ✅ **Tokens JWT** seguros

## 📊 Status do Projeto

- ✅ **Produção Ready**
- ✅ **Todas as funcionalidades implementadas**
- ✅ **Código limpo e organizado**
- ✅ **Documentação completa**
- ✅ **Zero dependências desnecessárias**

## 🆘 Suporte

### Problemas Comuns
1. **TTS não funciona**: Verifique chave OpenAI
2. **Login falha**: Configure OAuth no Supabase
3. **Imagens não geram**: Confirme créditos OpenAI
4. **Erro 500**: Verifique variáveis de ambiente

### Logs de Debug
Abra DevTools (F12) → Console para logs detalhados

---

## 📄 Licença

Este projeto é privado e proprietário.

**Desenvolvido com ❤️ usando Next.js e OpenAI**