import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY no configurada' }, { status: 500 })
  }

  const client = new Groq({ apiKey })

  try {
    const { imageBase64, mimeType } = await req.json()

    if (!imageBase64) {
      return NextResponse.json({ error: 'No se recibió imagen' }, { status: 400 })
    }

    // Modelo de visión de Groq. Si falla, revisar el catálogo actual en
    // console.groq.com/docs/models y actualizar la variable GROQ_VISION_MODEL
    const model = process.env.GROQ_VISION_MODEL || 'llama-3.2-90b-vision-preview'

    const response = await client.chat.completions.create({
      model,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analiza esta captura de pantalla de una tienda online o marketplace. Extrae SOLO un JSON válido, sin texto adicional, sin markdown, con esta estructura exacta:
{"producto": "nombre del producto visible", "precio": numero_entero_sin_puntos_ni_simbolos, "moneda": "CLP o USD u otra", "tienda": "nombre de la tienda si es visible o null"}

Si no logras identificar el precio con claridad, pon "precio": null.
Si el precio tiene formato chileno como $51.990, el número entero es 51990.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
    })

    const raw = response.choices[0]?.message?.content || '{}'
    const clean = raw.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      parsed = { producto: null, precio: null, moneda: null, tienda: null, error_parse: true, raw }
    }

    return NextResponse.json(parsed)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Vision error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
