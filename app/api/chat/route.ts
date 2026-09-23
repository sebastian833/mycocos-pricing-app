import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

// Modelos a probar en orden. Los catálogos de Groq cambian seguido, así que si el
// primero ya no existe, probamos los siguientes automáticamente. Se puede fijar uno
// específico con la variable de entorno GROQ_MODEL en Vercel.
const MODELOS_CANDIDATOS = [
  process.env.GROQ_MODEL,
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.1-70b-versatile',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
].filter((m): m is string => !!m)

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY no configurada' }, { status: 500 })
  }

  const client = new Groq({ apiKey })

  try {
    const { messages, context } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    const systemPrompt = `Eres un analista experto en pricing y márgenes para el grupo Shopylibre (marcas: MyCOCOS, MyHUEVOS, MENNT), vendidas en Chile, Colombia y México.

Tu rol es ayudar al equipo a tomar decisiones de pricing inteligentes basadas en los datos reales de ventas de la marca activa.

Responde siempre en español, de forma concisa y directa. El contexto de datos indica al inicio la moneda correcta (CLP, COP o MXN) — úsala siempre, nunca asumas CLP por defecto ni la mezcles entre marcas. Cuando menciones márgenes usa porcentaje. Cuando hagas comparativas usa tablas simples.

Contexto de datos cargados:
${context || 'No hay datos cargados aún. Pide al usuario que cargue un reporte de ventas.'}

Cuando el usuario pregunte por simulaciones de precio, calcula el impacto en margen directamente. Fórmula: Margen% = (Precio neto - Costo) / Precio neto * 100, donde Precio neto = Precio bruto / 1.19 (IVA Chile 19%, ajustar si aplica otro país).`

    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    let lastError: unknown = null
    for (const modelo of MODELOS_CANDIDATOS) {
      try {
        const response = await client.chat.completions.create({
          model: modelo,
          max_tokens: 1024,
          messages: chatMessages,
        })
        const reply = response.choices[0]?.message?.content || 'Sin respuesta.'
        return NextResponse.json({ reply, modeloUsado: modelo })
      } catch (err: unknown) {
        lastError = err
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`Modelo ${modelo} falló:`, msg)
        // Si es un problema de autenticación (API key inválida), no tiene sentido
        // seguir probando otros modelos — fallará igual en todos.
        if (msg.includes('401') || msg.toLowerCase().includes('invalid api key') || msg.toLowerCase().includes('unauthorized')) {
          throw err
        }
        // Cualquier otro error (modelo no existe, descontinuado, rate limit puntual, etc.)
        // probamos el siguiente candidato de la lista.
        continue
      }
    }

    throw lastError || new Error('Ningún modelo de Groq disponible respondió.')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Chat error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
