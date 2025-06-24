# 🎨 **Guia Completo: Formatação Avançada do CDI Chat**

## 🚀 **Visão Geral**

O CDI Chat agora suporta formatação avançada completa com caracteres especiais populares de todas as principais plataformas sociais: WhatsApp, Discord, Facebook, Instagram, Telegram, Twitter, e muito mais.

---

## ✨ **Funcionalidades Implementadas**

### **📝 Formatação Básica**
- ✅ **Negrito**: `**texto**` ou `*texto*` (WhatsApp)
- ✅ **Itálico**: `*texto*` ou `_texto_` (Telegram/WhatsApp)
- ✅ **Sublinhado**: `__texto__`
- ✅ **Riscado**: `~~texto~~` ou `~texto~` (WhatsApp)
- ✅ **Código inline**: `` `código` ``
- ✅ **Blocos de código**: ``` ```linguagem ```

### **🔗 Links e Referências**
- ✅ **Links markdown**: `[texto](url)`
- ✅ **Auto-links**: URLs automáticas `https://exemplo.com`
- ✅ **Menções**: `@usuário`
- ✅ **Hashtags**: `#tag`

### **💬 Elementos de Redes Sociais**
- ✅ **Spoilers Discord**: `||texto oculto||`
- ✅ **Menções Discord**: `<@123>`, `<#456>`, `<@&789>`
- ✅ **Emojis Discord personalizados**: `<:emoji:123>`

### **😀 Emojis e Símbolos**
- ✅ **Emojis Unicode**: 😀 🎉 🚀 ❤️ 👍 🔥
- ✅ **Símbolos especiais**: → ← ↑ ↓ ★ ☆ ✓ ✗ •
- ✅ **Caracteres especiais**: ™ © ® § ¶ † ‡

### **📊 Elementos Estruturais**
- ✅ **Headers**: `# ## ### #### ##### ######`
- ✅ **Listas**: `• - *` ou numeradas `1. 2. 3.`
- ✅ **Citações**: `> texto`
- ✅ **Quebras de linha**: Duplo espaço + Enter

---

## 🎯 **Como Usar - Exemplos Práticos**

### **💪 Texto em Negrito**
```
**Este texto estará em negrito**
*Negrito no WhatsApp*
```
**Resultado**: **Este texto estará em negrito**

### **🎭 Texto em Itálico**
```
*Este texto estará em itálico*
_Itálico no WhatsApp/Telegram_
```
**Resultado**: *Este texto estará em itálico*

### **📝 Combinações**
```
**Negrito com *itálico* dentro**
~~Texto riscado com **negrito**~~
```
**Resultado**: **Negrito com *itálico* dentro**, ~~Texto riscado com **negrito**~~

### **💻 Código**
```
Código inline: `console.log('Hello World')`

Bloco de código:
```javascript
function saudacao(nome) {
  return `Olá, ${nome}!`;
}
```

### **🔗 Links e Menções**
```
[Visite nosso site](https://exemplo.com)
https://github.com/exemplo - link automático
@usuario - menção a usuário
#tecnologia - hashtag
```

### **🕵️ Spoilers (Discord)**
```
||Este texto estará oculto até clicar||
<spoiler>Conteúdo secreto</spoiler>
```

### **📱 Formatação WhatsApp**
```
*negrito no WhatsApp*
_itálico no WhatsApp_
~riscado no WhatsApp~
```código monoespaçado```
```

### **✈️ Formatação Telegram**
```
**negrito no Telegram**
__itálico no Telegram__
`código inline`
```código em bloco```
```

### **🎮 Formatação Discord**
```
**negrito**
*itálico*
__sublinhado__
~~riscado~~
||spoiler||
<@123456> - menção de usuário
<#789012> - menção de canal
<@&345678> - menção de cargo
<:emoji:123456> - emoji personalizado
```

---

## 🌈 **Suporte por Plataforma**

### **📱 WhatsApp**
| Formatação | Sintaxe | Exemplo |
|------------|---------|---------|
| Negrito | `*texto*` | *negrito* |
| Itálico | `_texto_` | _itálico_ |
| Riscado | `~texto~` | ~riscado~ |
| Monoespaçado | ``` ```texto``` ``` | ```código``` |

### **🎮 Discord**
| Formatação | Sintaxe | Exemplo |
|------------|---------|---------|
| Negrito | `**texto**` | **negrito** |
| Itálico | `*texto*` | *itálico* |
| Sublinhado | `__texto__` | __sublinhado__ |
| Riscado | `~~texto~~` | ~~riscado~~ |
| Spoiler | `\|\|texto\|\|` | ||spoiler|| |
| Código | `` `texto` `` | `código` |
| Bloco | ``` ```texto``` ``` | ```bloco``` |

### **✈️ Telegram**
| Formatação | Sintaxe | Exemplo |
|------------|---------|---------|
| Negrito | `**texto**` | **negrito** |
| Itálico | `__texto__` | __itálico__ |
| Código | `` `texto` `` | `código` |
| Pré-formatado | ``` ```texto``` ``` | ```pré``` |

### **🐦 Twitter**
| Elemento | Sintaxe | Exemplo |
|----------|---------|---------|
| Hashtag | `#tag` | #tecnologia |
| Menção | `@usuario` | @cdibrasil |

---

## 🎨 **Estilos Visuais**

### **🎨 Cores por Plataforma**
- **WhatsApp**: Verde (`#25d366`)
- **Discord**: Roxo (`#5865f2`)
- **Telegram**: Azul (`#0088cc`)
- **Twitter**: Azul claro (`#1d9bf0`)
- **Facebook**: Azul (`#1877f2`)
- **Instagram**: Gradiente rosa/roxo

### **✨ Efeitos Interativos**
- **Hover**: Elementos destacam ao passar o mouse
- **Animações**: Entrada suave dos elementos
- **Spoilers**: Clique para revelar
- **Links**: Abertura em nova aba
- **Menções**: Logs no console (personalizável)

---

## 🔧 **Implementação Técnica**

### **📦 Arquivos Principais**
```
lib/
  ├── advanced-text-formatter.ts     # Serviço principal
components/ui/
  ├── advanced-text-renderer.tsx     # Componente React
app/
  ├── globals.css                    # Estilos CSS
```

### **🔧 Como Configurar**

1. **Importar o componente**:
```tsx
import { AdvancedTextRenderer } from '@/components/ui/advanced-text-renderer'
```

2. **Usar no componente**:
```tsx
<AdvancedTextRenderer
  content="**Texto formatado** com #hashtag e @mencao"
  messageRole="assistant"
  enableInteractions={true}
  options={{
    allowEmojis: true,
    allowMarkdown: true,
    platform: 'universal' // ou 'whatsapp', 'discord', etc.
  }}
  onLinkClick={(url) => window.open(url, '_blank')}
  onMentionClick={(username) => console.log('Menção:', username)}
  onHashtagClick={(tag) => console.log('Hashtag:', tag)}
/>
```

### **⚙️ Opções de Configuração**
```typescript
interface FormattingOptions {
  allowEmojis?: boolean          // Permitir emojis
  allowMarkdown?: boolean        // Permitir markdown
  allowHtml?: boolean           // Permitir HTML
  maxLength?: number            // Limite de caracteres
  platform?: 'whatsapp' | 'discord' | 'telegram' | 'twitter' | 'facebook' | 'instagram' | 'universal'
}
```

---

## 🎯 **Casos de Uso Populares**

### **💼 Comunicação Empresarial**
```
**Reunião importante** 📅
📍 *Local*: Sala de conferências
🕐 *Horário*: 14:00
👥 *Participantes*: @joao @maria @pedro

**Agenda**:
• Revisão do projeto
• Definição de prazos
• Próximos passos

🔗 [Link da apresentação](https://slides.com/reuniao)
```

### **🎮 Gaming/Discord**
```
**Raid hoje às 20h!** 🗡️

||Spoiler: Boss final tem vulnerabilidade ao fogo||

**Grupo**:
<@123> - Tank
<@456> - Healer  
<@789> - DPS

**Canal**: <#raid-geral>
```

### **📱 WhatsApp Business**
```
*Promoção Especial* 🎉

_De 25/12 até 31/12_

~R$ 199,90~ ➡️ *R$ 149,90*

```CUPOM2024``` para *10% extra*

📞 (11) 99999-9999
🌐 https://loja.exemplo.com
```

### **📰 Conteúdo Editorial**
```
# **As Tendências de IA em 2024**

## 🤖 **Principais Avanços**

### **1. GPT-4 Turbo**
*Capacidades aprimoradas* em:
• Compreensão contextual
• Geração de código
• Análise multimodal

### **2. Automação Empresarial**
**Setores impactados**:
- Atendimento ao cliente
- Análise de dados
- Criação de conteúdo

> "A IA não substitui humanos, mas amplifica suas capacidades"
> — Especialista em tecnologia

**Saiba mais**: https://ia-trends.com

#IA #Tecnologia #Futuro #Inovação
```

---

## 🚀 **Próximos Passos**

### **🔮 Funcionalidades Futuras**
- [ ] **Tabelas markdown**
- [ ] **LaTeX/Matemática**
- [ ] **Diagramas Mermaid**
- [ ] **GIFs animados**
- [ ] **Reações emoji**
- [ ] **Threads/Respostas**
- [ ] **Formatação rica no input**

### **🎨 Melhorias Visuais**
- [ ] **Temas por plataforma**
- [ ] **Modo escuro otimizado**
- [ ] **Animações avançadas**
- [ ] **Efeitos de hover personalizados**

### **⚡ Performance**
- [ ] **Lazy loading de elementos**
- [ ] **Cache de formatação**
- [ ] **Compressão de mensagens longas**

---

## 🐛 **Solução de Problemas**

### **❗ Problemas Comuns**

**1. Formatação não aparece**
- Verifique se `allowMarkdown: true`
- Confirme sintaxe correta

**2. Emojis não renderizam**
- Verifique se `allowEmojis: true`
- Confirme suporte Unicode do navegador

**3. Links não funcionam**
- Verifique handler `onLinkClick`
- Confirme URL válida

**4. Spoilers não interagem**
- Verifique `enableInteractions: true`
- Confirme evento de clique

### **🔧 Logs de Debug**
```javascript
// No console do navegador
console.log('Elementos formatados:', formattedElements)
console.log('Opções de formatação:', options)
```

---

## 📞 **Suporte e Feedback**

### **💬 Como Reportar Bugs**
1. Descreva o problema detalhadamente
2. Inclua exemplo do texto não formatado
3. Mencione plataforma/navegador
4. Anexe screenshot se possível

### **💡 Sugestões de Melhoria**
- Novas sintaxes de formatação
- Suporte a outras plataformas
- Recursos visuais adicionais
- Integrações específicas

---

**🎉 Agora você pode usar formatação rica e profissional em todas as suas conversas no CDI Chat!**

*Criado com ❤️ pela equipe CDI* 