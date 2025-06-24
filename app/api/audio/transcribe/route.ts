import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { TranscriptionResult } from '@/types/audio'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const language = formData.get('language') as string || 'pt'
    const autoSummarize = formData.get('autoSummarize') === 'true'

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Arquivo de áudio é obrigatório' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    if (!audioFile.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'Arquivo deve ser um áudio válido' },
        { status: 400 }
      )
    }

    // Validar tamanho (25MB máximo)
    const maxSize = 25 * 1024 * 1024
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo: 25MB' },
        { status: 400 }
      )
    }

    console.log(`🎵 Iniciando transcrição: ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(2)}MB)`)

    const startTime = Date.now()

    // Transcrever com OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: language,
      response_format: 'verbose_json', // Para obter timestamps e metadados
      temperature: 0.2 // Mais determinístico
    })

    const transcriptionTime = Date.now() - startTime

    // Extrair informações da transcrição
    const fullText = transcription.text
    const duration = transcription.duration || 0
    const segments = transcription.segments || []

    console.log(`✅ Transcrição concluída em ${transcriptionTime}ms - ${fullText.length} caracteres`)

    // Gerar resumo automaticamente se solicitado
    let summary = ''
    let summaryTime = 0

    if (autoSummarize && fullText.length > 100) {
      const summaryStartTime = Date.now()
      
      try {
        const summaryResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Você é um assistente especializado em resumir áudios transcritos. 
              Crie um resumo conciso e informativo em português do áudio a seguir.
              O resumo deve:
              - Ter no máximo 200 palavras
              - Destacar os pontos principais
              - Manter o tom e contexto original
              - Ser claro e objetivo`
            },
            {
              role: 'user',
              content: `Transcrição do áudio:\n\n${fullText}`
            }
          ],
          temperature: 0.3,
          max_tokens: 300
        })

        summary = summaryResponse.choices[0].message.content || 'Não foi possível gerar resumo'
        summaryTime = Date.now() - summaryStartTime
        
        console.log(`📝 Resumo gerado em ${summaryTime}ms`)
      } catch (error) {
        console.error('❌ Erro ao gerar resumo:', error)
        summary = 'Erro ao gerar resumo automático'
      }
    } else {
      // Resumo simples para textos curtos
      summary = fullText.length > 200 
        ? fullText.substring(0, 200) + '...'
        : fullText
    }

    // Calcular confiança média dos segments
    let averageConfidence = 0.8 // Default se não houver segments
    if (segments && segments.length > 0) {
      const confidences = segments
        .map((s: any) => s.avg_logprob || 0)
        .filter(conf => conf !== 0)
      
      if (confidences.length > 0) {
        // Converter logprob para confiança (aproximação)
        const avgLogProb = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
        averageConfidence = Math.max(0, Math.min(1, Math.exp(avgLogProb)))
      }
    }

    // Preparar resposta
    const result: TranscriptionResult = {
      id: `transcription_${Date.now()}`,
      text: fullText,
      summary: summary,
      confidence: averageConfidence,
      duration: duration,
      timestamp: new Date(),
      language: transcription.language || language,
      segments: segments.map((segment: any) => ({
        start: segment.start,
        end: segment.end,
        text: segment.text,
        confidence: Math.exp(segment.avg_logprob || -1)
      }))
    }

    const totalTime = Date.now() - startTime

    console.log(`🎯 Processamento completo em ${totalTime}ms`)

    return NextResponse.json(result, {
      headers: {
        'X-Transcription-Time': transcriptionTime.toString(),
        'X-Summary-Time': summaryTime.toString(),
        'X-Total-Time': totalTime.toString(),
        'X-Text-Length': fullText.length.toString(),
        'X-Audio-Duration': duration.toString()
      }
    })

  } catch (error) {
    console.error('🎵 Erro na transcrição:', error)
    
    // Tratamento específico de erros da OpenAI
    if (error instanceof Error) {
      if (error.message.includes('audio_too_long')) {
        return NextResponse.json(
          { error: 'Áudio muito longo. Máximo: 30 minutos' },
          { status: 400 }
        )
      }
      
      if (error.message.includes('rate_limit')) {
        return NextResponse.json(
          { error: 'Limite de uso atingido. Tente novamente em alguns minutos' },
          { status: 429 }
        )
      }
      
      if (error.message.includes('invalid_file_format')) {
        return NextResponse.json(
          { error: 'Formato de arquivo não suportado' },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Erro interno na transcrição',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Erro desconhecido') : 
          'Tente novamente em alguns momentos'
      },
      { status: 500 }
    )
  }
} 