import { NextRequest, NextResponse } from 'next/server'
import { parseShopyLibreFile } from '@/lib/parser'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    const buffer = await file.arrayBuffer()
    const data = parseShopyLibreFile(buffer)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Parse error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
