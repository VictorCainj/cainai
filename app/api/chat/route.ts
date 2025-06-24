import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { chatService } from '@/lib/chat-service'
import { sessionManager } from '@/lib/session'
import { context7Service } from '@/lib/context7-service'
import { supabase } from '@/lib/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Prompt otimizado para super memória com GPT-4o + Context7 MCP
const SYSTEM_PROMPT = `Você é um assistente especializado em produtividade com SUPER MEMÓRIA, powered by GPT-4o + Context7 MCP. Você tem acesso completo ao histórico da conversa atual e documentação atualizada em tempo real.

**SUAS CAPACIDADES DE MEMÓRIA:**
🧠 **Memória Contextual**: Lembro de tudo que foi discutido nesta conversa
🔗 **Conexões**: Consigo conectar informações de mensagens anteriores
📋 **Continuidade**: Acompanho projetos, tarefas e ideias em andamento
🎯 **Personalização**: Adapto respostas baseado no seu histórico e preferências
🎓 **Aprendizado**: Melhoro com cada interação nossa
🎨 **Geração de Imagens**: Posso criar imagens usando DALL-E 3
📚 **Context7 MCP**: Acesso a documentação atualizada de bibliotecas e frameworks em tempo real

**SUAS ESPECIALIDADES:**

📋 **ORGANIZAÇÃO DE TAREFAS:**
- Ajudar a priorizar usando métodos como Matriz de Eisenhower
- Quebrar projetos grandes em tarefas menores
- Criar cronogramas realistas
- Sugerir ferramentas e metodologias (GTD, Kanban, etc.)
- LEMBRAR de tarefas mencionadas anteriormente

📝 **GESTÃO DE INFORMAÇÕES:**
- Estruturar notas e documentos
- Criar resumos e sínteses
- Organizar conhecimento e aprendizado
- Templates e checklists úteis
- CONECTAR informações de conversas passadas

📅 **PLANEJAMENTO:**
- Rotinas diárias e semanais
- Bloqueio de tempo (time blocking)
- Planejamento de projetos
- Metas SMART
- ACOMPANHAR progressos mencionados antes

🍅 **TÉCNICAS DE FOCO:**
- Pomodoro e variações
- Deep Work
- Gestão de distrações
- Técnicas de concentração
- ADAPTAR baseado em suas preferências já mencionadas

💡 **CRIATIVIDADE E ANÁLISE:**
- Brainstorming estruturado
- Análise de problemas
- Tomada de decisões
- Mapas mentais
- EXPANDIR ideias que você já compartilhou

🎨 **GERAÇÃO DE IMAGENS:**
- Detectar quando o usuário solicita uma imagem
- Criar prompts detalhados para DALL-E 3
- Sugerir melhorias visuais para projetos
- Criar ilustrações para conceitos e ideias

📚 **CONTEXT7 MCP - DOCUMENTAÇÃO ATUALIZADA:**
- Busco automaticamente documentação atualizada quando você menciona bibliotecas
- Detecto frameworks e tecnologias em suas perguntas
- Forneço exemplos de código com versões atuais
- Evito APIs depreciadas e métodos obsoletos
- Bibliotecas suportadas: React, Next.js, Vue, Angular, Node.js, Python, e muito mais

**DETECÇÃO DE SOLICITAÇÕES DE IMAGEM:**
Se o usuário solicitar uma imagem, foto, desenho, ilustração, logo, design, ou qualquer conteúdo visual, você deve responder EXATAMENTE neste formato:

[IMAGEM_SOLICITADA]
Descrição detalhada da imagem em inglês para DALL-E 3
[/IMAGEM_SOLICITADA]

Seguido de uma explicação em português sobre o que será criado.

**COMO USAR SUA SUPER MEMÓRIA:**

1. **SEMPRE referencie** informações relevantes de mensagens anteriores
2. **CONECTE** a pergunta atual com contexto passado quando relevante
3. **ACOMPANHE** projetos e tarefas em andamento
4. **PERSONALIZE** sugestões baseado no que você já aprendeu sobre mim
5. **CONSTRUA** sobre conversas anteriores em vez de começar do zero

**ESTRUTURA DE RESPOSTA:**
- Se relevante, mencione conexões com conversas anteriores
- Forneça sugestões práticas e organizadas
- Inclua próximos passos específicos
- Use formatação clara (listas, subtítulos)
- Seja amigável, motivador e contextualizado

**IMPORTANTE SOBRE CÓDIGOS E EXEMPLOS:**
🚀 **SEMPRE forneça códigos COMPLETOS** quando solicitado - nunca truncar ou encurtar
📝 **NUNCA use comentários como "// ... resto do código ..."** - sempre escreva tudo
🔧 **Inclua todos os imports, funções e componentes necessários**
💯 **Códigos devem estar prontos para uso imediato** sem necessidade de "completar"
📚 **Se o código for muito extenso, divida em seções mas SEMPRE complete cada uma**

**IMPORTANTE**: Use sua memória para dar respostas mais inteligentes e personalizadas!`

interface MessageContext {
  role: string
  content: string
  timestamp: Date
}

// Função para detectar e gerar imagem com DALL-E 3
async function generateImageIfRequested(messageContent: string): Promise<{hasImage: boolean, imageUrl?: string, imagePrompt?: string}> {
  const imageRegex = /\[IMAGEM_SOLICITADA\]([\s\S]*?)\[\/IMAGEM_SOLICITADA\]/
  const match = messageContent.match(imageRegex)
  
  if (!match) {
    return { hasImage: false }
  }

  const imagePrompt = match[1].trim()
  
  try {
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid"
    })

    const imageUrl = imageResponse.data?.[0]?.url
    
    if (imageUrl) {
      return { 
        hasImage: true, 
        imageUrl, 
        imagePrompt 
      }
    }
  } catch (error) {
    // Silent fail
  }
  
  return { hasImage: false }
}

export async function POST(request: NextRequest) {
  let message = ''
  
  try {
    const body = await request.json()
    const bodyData = body
    message = bodyData.message
    const { conversationId, userId, fullContext } = bodyData
    
    // Tentar obter usuário autenticado do Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Priorizar usuário autenticado, depois providedUserId, depois sessionManager
    const effectiveUserId = user?.id || userId || sessionManager.getUserId()

    if (!message || !effectiveUserId) {
      return NextResponse.json({ error: 'Message and userId required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    // Detectar comandos de resumo
    const lowerMessage = message.toLowerCase().trim()
    const isResumeCommand = lowerMessage.includes('gere um resumo') || 
                          lowerMessage.includes('faça um resumo') || 
                          lowerMessage.includes('gerar resumo') ||
                          lowerMessage.includes('resumir conversa') ||
                          lowerMessage.includes('fazer resumo') ||
                          lowerMessage === 'resumo' ||
                          lowerMessage.includes('resumir esta conversa') ||
                          lowerMessage.includes('criar resumo')

    if (isResumeCommand && conversationId && !conversationId.startsWith('temp')) {
      // Redirecionar para geração de resumo
      try {
        const summaryResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/conversations/${conversationId}/generate-summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: effectiveUserId })
        })
        
        const summaryData = await summaryResponse.json()
        
        if (summaryData.success) {
          const summary = summaryData.summary
          const responseText = `📊 **Cronologia da Conversa Gerada**

**Contexto:**
${summary.summaryText}

**Cronologia de Ações:**
${summary.timeline && summary.timeline.length > 0 
  ? summary.timeline.map((entry: any) => `🕐 **${entry.time}** (${entry.period}): ${entry.action}`).join('\n')
  : 'Nenhuma ação cronológica identificada'
}

**Análise:**
• **Sentimento:** ${summary.sentiment === 'positive' ? '😊 Positivo' : summary.sentiment === 'negative' ? '😔 Negativo' : '😐 Neutro'}
• **Gerado em:** ${new Date(summary.generatedAt).toLocaleString('pt-BR')}

💡 *Cronologia salva automaticamente. Você pode acessá-la a qualquer momento através do painel lateral ou do botão flutuante.*`

          return NextResponse.json({
            message: responseText,
            conversationId,
            summaryGenerated: true,
            success: true
          })
        } else {
          return NextResponse.json({
            message: "❌ **Erro ao gerar resumo**\n\nNão foi possível gerar o resumo da conversa. Certifique-se de que há mensagens suficientes na conversa (mínimo de 2 mensagens).",
            conversationId,
            success: true
          })
        }
      } catch (error) {
        console.error('Erro ao gerar resumo via chat:', error)
        return NextResponse.json({
          message: "❌ **Erro de conexão**\n\nOcorreu um erro ao tentar gerar o resumo. Tente novamente em alguns instantes.",
          conversationId,
          success: true
        })
      }
    }

    const isServiceHealthy = await chatService.healthCheck()
    
    let conversation: any = null
    let allMessages: any[] = []
    let isTemporaryMode = false

    if (isServiceHealthy) {
      try {
        if (conversationId && !conversationId.startsWith('temp')) {
          const result = await chatService.getConversationWithMessages(conversationId, effectiveUserId)
          conversation = result.conversation
          allMessages = result.messages
        }

        if (!conversation) {
          const title = message.slice(0, 50) + (message.length > 50 ? '...' : '')
          conversation = await chatService.createConversation({
            title,
            userId: effectiveUserId
          })
          
          if (!conversation) {
            conversation = await chatService.createConversationFallback(title)
            isTemporaryMode = true
          }
        }

        if (!isTemporaryMode && conversation && !conversationId?.startsWith('temp')) {
          await chatService.addMessage({
            conversationId: conversation.id,
            role: 'user',
            content: message
          })
        }

      } catch (dbError) {
        isTemporaryMode = true
        conversation = await chatService.createConversationFallback(
          message.slice(0, 50) + (message.length > 50 ? '...' : '')
        )
      }
    } else {
      isTemporaryMode = true
      conversation = await chatService.createConversationFallback(
        message.slice(0, 50) + (message.length > 50 ? '...' : '')
      )
    }

    let contextMessages = []
    
    if (allMessages.length > 0) {
      contextMessages = allMessages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
    }
    else if (fullContext && fullContext.length > 0) {
      contextMessages = fullContext
        .filter((msg: MessageContext) => msg.role === 'user' || msg.role === 'assistant')
        .map((msg: MessageContext) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
    }

    const openAIMessages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
      {
        role: 'system' as const,
        content: SYSTEM_PROMPT
      }
    ]

    if (contextMessages.length > 0) {
      const maxContextMessages = 30
      const recentMessages = contextMessages.slice(-maxContextMessages)
      
      if (contextMessages.length > maxContextMessages) {
        openAIMessages.push({
          role: 'system' as const,
          content: `[CONTEXTO HISTÓRICO]: Esta conversa tem ${contextMessages.length} mensagens no total. Abaixo estão as ${recentMessages.length} mais recentes. Use essa informação para dar respostas contextualizadas e personalizadas.`
        })
      }
      
      for (const msg of recentMessages) {
        openAIMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })
      }
    }

    // Integração Context7 MCP - Buscar documentação relevante
    let context7Documentation = ''
    let context7Info: { librariesDetected: string[], tokensUsed: number } = { 
      librariesDetected: [], 
      tokensUsed: 0 
    }
    
    try {
      const context7Result = await context7Service.processMessage(message)
      context7Documentation = context7Result.documentation
      context7Info = {
        librariesDetected: context7Result.librariesDetected,
        tokensUsed: context7Result.tokensUsed
      }
      
      if (context7Documentation) {
        // Adicionar documentação Context7 ao contexto do sistema
        openAIMessages.push({
          role: 'system' as const,
          content: context7Documentation
        })
      }
    } catch (context7Error) {
      // Falha silenciosa do Context7 - não impede o chat de funcionar
      if (process.env.NODE_ENV === 'development') {
        console.warn('Context7 error:', context7Error)
      }
    }

    openAIMessages.push({
      role: 'user' as const,
      content: message
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: openAIMessages,
      max_tokens: 4096,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
    })

    let assistantMessage = completion.choices[0]?.message?.content || 'Desculpe, não consegui processar sua mensagem com minha super memória.'

    const imageResult = await generateImageIfRequested(assistantMessage)
    
    let finalMessage = assistantMessage
    let imageUrl = null
    
    if (imageResult.hasImage && imageResult.imageUrl) {
      finalMessage = assistantMessage.replace(/\[IMAGEM_SOLICITADA\][\s\S]*?\[\/IMAGEM_SOLICITADA\]/, '')
      imageUrl = imageResult.imageUrl
      finalMessage = `${finalMessage}\n\n🎨 **Imagem gerada com DALL-E 3:**\n*"${imageResult.imagePrompt?.slice(0, 100)}..."*\n\nA imagem foi criada e anexada abaixo!`
    }

    if (!isTemporaryMode && conversation && !conversationId?.startsWith('temp')) {
      await chatService.addMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: finalMessage + (imageUrl ? `\n\n[IMAGE]:${imageUrl}` : '')
      })
    }

    return NextResponse.json({
      message: finalMessage,
      imageUrl: imageUrl,
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      success: true,
      isTemporary: isTemporaryMode,
      usage: completion.usage,
      model: 'gpt-4o',
      contextUsed: contextMessages.length,
      superMemoryActive: true,
      dalleGenerated: !!imageUrl,
      context7: {
        enabled: !!context7Documentation,
        librariesDetected: context7Info.librariesDetected,
        tokensUsed: context7Info.tokensUsed
      }
    })

  } catch (error) {
    // Log apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('Error in chat API:', error)
    }
    
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured')
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente de produtividade brasileiro especializado em organização, planejamento e eficiência. Seja prático, objetivo e útil. Você também pode gerar imagens com DALL-E 3 quando solicitado.'
          },
          {
            role: 'user',
            content: typeof message === 'string' ? message : 'Olá! Como posso ajudar com sua produtividade hoje?'
          }
        ],
        max_tokens: 4096,
        temperature: 0.7,
      })

      const assistantMessage = completion.choices[0]?.message?.content || 'Como posso ajudar você a ser mais produtivo hoje?'

      return NextResponse.json({
        message: assistantMessage,
        conversationId: 'temp-' + Date.now(),
        success: true,
        mode: 'fallback',
        superMemoryActive: false,
        model: 'gpt-4o'
      })

    } catch (fallbackError) {
      return NextResponse.json(
        { 
          error: 'Serviço temporariamente indisponível',
          details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
        },
        { status: 500 }
      )
    }
  }
} 