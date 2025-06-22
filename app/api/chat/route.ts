import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { chatService } from '@/lib/chat-service'
import { sessionManager } from '@/lib/session'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Prompt otimizado para super memória com GPT-4 Turbo
const SYSTEM_PROMPT = `Você é um assistente especializado em produtividade com SUPER MEMÓRIA, powered by GPT-4 Turbo. Você tem acesso completo ao histórico da conversa atual e deve usar essa informação de forma inteligente.

**SUAS CAPACIDADES DE MEMÓRIA:**
🧠 **Memória Contextual**: Lembro de tudo que foi discutido nesta conversa
🔗 **Conexões**: Consigo conectar informações de mensagens anteriores
📋 **Continuidade**: Acompanho projetos, tarefas e ideias em andamento
🎯 **Personalização**: Adapto respostas baseado no seu histórico e preferências
🎓 **Aprendizado**: Melhoro com cada interação nossa
🎨 **Geração de Imagens**: Posso criar imagens usando DALL-E 3

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
    
    const effectiveUserId = userId || sessionManager.getUserId()

    if (!message || !effectiveUserId) {
      return NextResponse.json({ error: 'Message and userId required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
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

    openAIMessages.push({
      role: 'user' as const,
      content: message
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: openAIMessages,
      max_tokens: 1500,
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
      model: 'gpt-4-turbo-preview',
      contextUsed: contextMessages.length,
      superMemoryActive: true,
      dalleGenerated: !!imageUrl
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
        model: 'gpt-4-turbo-preview',
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
        max_tokens: 800,
        temperature: 0.7,
      })

      const assistantMessage = completion.choices[0]?.message?.content || 'Como posso ajudar você a ser mais produtivo hoje?'

      return NextResponse.json({
        message: assistantMessage,
        conversationId: 'temp-' + Date.now(),
        success: true,
        mode: 'fallback',
        superMemoryActive: false,
        model: 'gpt-4-turbo-preview'
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