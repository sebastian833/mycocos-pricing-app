'use client'

import { useState, useEffect, useRef } from 'react'
import { useData } from '@/lib/context'
import { useRouter } from 'next/navigation'
import { Send, Bot, User, Loader2, Lightbulb } from 'lucide-react'
import type { ChatMessage } from '@/types'

const SUGGESTIONS = [
  '¿Cuál es el producto con mayor margen?',
  '¿En qué mes debería subir el precio de la Rasuradora 4.0?',
  '¿Cómo impacta bajar un 10% el precio en el margen del Kit Prime?',
  '¿Cuál fue el precio más bajo del año y en qué temporada fue?',
  'Compara el margen de 2024 vs 2025 para las rasuradoras',
  '¿Qué producto tiene mayor volatilidad de precio?',
]

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-blue-600' : 'bg-gray-900'}`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'}`}>
        {msg.content.split('\n').map((line, i) => {
          if (line.startsWith('**') && line.endsWith('**')) {
            return <p key={i} className="font-semibold mt-1">{line.slice(2, -2)}</p>
          }
          if (line.startsWith('- ') || line.startsWith('• ')) {
            return <p key={i} className="ml-2">· {line.slice(2)}</p>
          }
          if (line.startsWith('| ')) {
            return <p key={i} className="font-mono text-xs mt-0.5">{line}</p>
          }
          return line ? <p key={i} className="mt-0.5">{line}</p> : <br key={i} />
        })}
      </div>
    </div>
  )
}

export default function Chat() {
  const { data } = useData()
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (!data) router.push('/') }, [data])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  if (!data) return null

  const send = async (text?: string) => {
    const content = text || input.trim()
    if (!content || loading) return
    setInput('')
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, context: data.raw_context }),
      })
      const json = await res.json()
      if (json.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + json.error }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: json.reply || 'Sin respuesta.' }])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de conexión'
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + msg }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Chat con tus datos</h1>
        <p className="text-sm text-gray-500">
          Pregúntame sobre precios, márgenes, temporadas o simulaciones — tengo el contexto completo del reporte cargado.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-white" />
              </div>
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Hola, soy tu analista de pricing.</p>
                <p className="text-gray-500">Tengo cargado el reporte con <strong className="text-gray-700">{data.productos.length} productos</strong> y datos de {data.años.join(' y ')}. Puedo ayudarte con análisis de precios, temporadas, márgenes y simulaciones.</p>
              </div>
            </div>

            <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-400">
              <Lightbulb size={13} />
              Sugerencias
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 size={16} className="text-gray-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 bg-white border border-gray-200 rounded-2xl flex items-center gap-2 px-4 py-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Pregunta sobre precios, márgenes, temporadas..."
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none py-1.5"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
        >
          <Send size={14} className={loading ? 'text-gray-400' : 'text-white'} />
        </button>
      </div>
    </div>
  )
}
