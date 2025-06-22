import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json()

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'URL da imagem é obrigatória' },
        { status: 400 }
      )
    }

    // Validar se é uma URL válida do DALL-E/OpenAI
    if (!imageUrl.includes('oaidalleapiprodscus.blob.core.windows.net')) {
      return NextResponse.json(
        { error: 'URL de imagem não permitida' },
        { status: 400 }
      )
    }

    // Buscar a imagem usando fetch do servidor (sem limitações CORS)
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (!response.ok) {
      throw new Error(`Erro ao buscar imagem: ${response.status}`)
    }

    // Verificar se é realmente uma imagem
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.startsWith('image/')) {
      return NextResponse.json(
        { error: 'O recurso não é uma imagem válida' },
        { status: 400 }
      )
    }

    // Obter o buffer da imagem
    const imageBuffer = await response.arrayBuffer()

    // Retornar a imagem com headers apropriados
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'attachment; filename="dalle-image.png"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Erro no proxy de download:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
} 