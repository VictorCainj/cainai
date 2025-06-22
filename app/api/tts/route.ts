import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { text, voice = 'ash' } = await request.json()

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

    // Melhorar texto para voz ash energética e limitar comprimento
    let enhancedText = text
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim()
    
    // Limitar a 1000 caracteres para evitar problemas com textos longos
    if (enhancedText.length > 1000) {
      enhancedText = enhancedText.substring(0, 1000) + '.'
    }

    const response = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'ash',
      input: enhancedText,
      response_format: 'wav',
      instructions: "Fale com entusiasmo e energia positiva. Use uma entonação envolvente, ritmo acelerado e variação emocional na voz. Soe animado, como se estivesse participando de um comercial ou apresentação empolgante."
    })

    if (!response.ok && 'error' in response) {
      throw new Error(`OpenAI TTS Error: ${response.error}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Erro interno no TTS',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 