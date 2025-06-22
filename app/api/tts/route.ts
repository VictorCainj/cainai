import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'nova', speed = 1.1, model = 'tts-1-hd' } = await request.json()

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Texto é obrigatório para TTS' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key não configurada' },
        { status: 500 }
      )
    }

    // Processar texto para melhor qualidade de voz
    let processedText = text
      // Remover formatação markdown
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove negrito
      .replace(/\*(.*?)\*/g, '$1')      // Remove itálico
      .replace(/`(.*?)`/g, '$1')        // Remove código inline
      .replace(/#{1,6}\s/g, '')         // Remove headers
      .replace(/- /g, '')               // Remove bullet points
      .replace(/\[.*?\]\(.*?\)/g, '')   // Remove links markdown
      // Remover emojis e símbolos especiais
      .replace(/[🎯🔄📋🎓🎨⚡🧠🌐⚙️❌✅🚀📊💡🔧🔒📱🎵📝💾🔍🏷️📁⭐🤖🗣️👁️🤝🔌🏪🔗🪝🛡️🧹📋🚫🔐📇🔍🏊📖⚖️📈💬📄💻🎤👥💬🔔🔄📅]/g, '')
      // Normalizar espaços e quebras de linha
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .replace(/\.+/g, '.')
      .trim()

    // Limitar comprimento para otimizar performance
    if (processedText.length > 4000) {
      processedText = processedText.substring(0, 4000).trim()
      // Tentar cortar em uma frase completa
      const lastPeriod = processedText.lastIndexOf('.')
      if (lastPeriod > 3000) {
        processedText = processedText.substring(0, lastPeriod + 1)
      } else {
        processedText += '.'
      }
    }

    // Adicionar pontuação para melhor entonação
    if (!processedText.endsWith('.') && !processedText.endsWith('!') && !processedText.endsWith('?')) {
      processedText += '.'
    }

    console.log(`🎵 TTS Request: ${processedText.length} chars, voice: ${voice}, speed: ${speed}`)

    const startTime = Date.now()

    const response = await openai.audio.speech.create({
      model: model, // 'tts-1-hd' para alta qualidade ou 'tts-1' para mais rápido
      voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
      input: processedText,
      speed: speed, // 0.25 a 4.0, onde 1.0 é velocidade normal
      response_format: 'mp3' // MP3 para melhor compatibilidade
    })

    const buffer = Buffer.from(await response.arrayBuffer())
    const generationTime = Date.now() - startTime

    console.log(`🎵 TTS Success: ${buffer.length} bytes in ${generationTime}ms`)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache por 24 horas
        'X-Generation-Time': generationTime.toString(),
        'X-Text-Length': processedText.length.toString(),
        'X-Voice-Used': voice
      }
    })

  } catch (error) {
    console.error('🎵 TTS Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro ao gerar áudio',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Erro desconhecido') : 
          'Tente novamente em alguns momentos'
      },
      { status: 500 }
    )
  }
} 