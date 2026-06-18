import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  console.log('GROQ_API_KEY present:', !!apiKey, 'length:', apiKey?.length)

  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY no configurada' }, { status: 500 })
  }

  const client = new Groq({ apiKey })

  try {
    const { messages, context } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    const systemPrompt = `Eres un analista experto en pricing y márgenes para MyCOCOS, una marca de accesorios de aseo personal vendida en ShopyLibre Chile.

Tu rol es ayudar al equipo a tomar decisiones de pricing inteligentes basadas en los datos reales de ventas.

Responde siempre en español, de forma concisa y directa. Cuando menciones precios usa formato $XX.XXX CLP. Cuando menciones márgenes usa porcentaje. Cuando hagas comparativas usa tablas simples.

Contexto de datos cargados:
${context || 'No hay datos cargados aún. Pide al usuario que cargue un reporte de ventas.'}

Cuando el usuario pregunte por simulaciones de precio, calcula el impacto en margen directamente. Fórmula: Margen% = (Precio neto - Costo) / Precio neto * 100, donde Precio neto = Precio bruto / 1.19 (IVA Chile 19%).`

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    })

    const reply = response.choices[0]?.message?.content || 'Sin respuesta.'
    return NextResponse.json({ reply })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Chat error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
