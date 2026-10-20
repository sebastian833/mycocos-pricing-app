'use client'

import { useRouter } from 'next/navigation'
import { useData } from '@/lib/context'
import { Clock, BarChart2, Package, Sliders, MessageCircle, HelpCircle } from 'lucide-react'

const ATAJOS = [
  { href: '/informe', titulo: 'Informe', texto: 'Cómo se vendió cada producto mes a mes: a qué precio, cuántas unidades y cuánto dejó.', icono: BarChart2, caja: 'bg-blue-50 hover:bg-blue-100', color: 'text-blue-600', titulo_color: 'text-blue-800' },
  { href: '/packs', titulo: 'Packs', texto: 'Cuánto cuesta cada combo, a qué precio venderlo, armar combos nuevos y guardarlos.', icono: Package, caja: 'bg-indigo-50 hover:bg-indigo-100', color: 'text-indigo-600', titulo_color: 'text-indigo-800' },
  { href: '/simulador', titulo: 'Simulador', texto: 'Escribe un precio y mira cuánto ganas. Te dice qué precio usar cada mes del año.', icono: Sliders, caja: 'bg-green-50 hover:bg-green-100', color: 'text-green-600', titulo_color: 'text-green-800' },
  { href: '/chat', titulo: 'Chat IA', texto: 'Pregúntale lo que quieras sobre las ventas, los precios y los márgenes de esta marca.', icono: MessageCircle, caja: 'bg-purple-50 hover:bg-purple-100', color: 'text-purple-600', titulo_color: 'text-purple-800' },
]

export default function Home() {
  const { data, marcaActual, loading: cargandoMarca } = useData()
  const router = useRouter()

  if (cargandoMarca) return null

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-4 text-3xl">
          {marcaActual.emoji}
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">{marcaActual.nombre} · {marcaActual.pais}</h1>
        <p className="text-gray-500 text-sm">
          {data
            ? '¿Qué quieres hacer? Elige una opción. Para cambiar de marca, usa el selector de arriba.'
            : 'Todavía no hay ventas cargadas para esta marca.'}
        </p>
      </div>

      {!data ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <Clock className="text-gray-300 mx-auto mb-3" size={36} />
          <p className="font-medium text-gray-700 mb-1">Esperando las ventas de {marcaActual.nombre}</p>
          <p className="text-sm text-gray-400">Cuando se carguen, aquí vas a ver el resumen. Mientras tanto puedes cambiar de marca arriba.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {ATAJOS.map(a => (
              <button
                key={a.href}
                onClick={() => router.push(a.href)}
                className={`flex items-start gap-3 p-4 rounded-2xl text-left transition-colors ${a.caja}`}
              >
                <a.icono className={`${a.color} flex-shrink-0 mt-0.5`} size={22} />
                <div>
                  <p className={`text-sm font-semibold ${a.titulo_color}`}>{a.titulo}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{a.texto}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
            <p className="text-sm font-medium text-gray-900 mb-3">Resumen de ventas de {marcaActual.nombre}</p>
            <div className="grid grid-cols-2 gap-3">
              {data.resumen.map(r => (
                <div key={r.año} className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Año {r.año} · vendido (con IVA)</p>
                  <p className="text-xl font-semibold text-gray-900">${(r.ventas_brutas / 1e6).toFixed(1)}M</p>
                  <p className="text-xs text-gray-400">{r.unidades.toLocaleString()} unidades</p>
                  {r.margen_total > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Margen total (lo que quedó después del costo): <span className="font-semibold text-gray-700">${(r.margen_total / 1e6).toFixed(1)}M</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <button
        onClick={() => router.push('/ayuda')}
        className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors py-2"
      >
        <HelpCircle size={15} /> ¿Primera vez? Lee la guía rápida
      </button>
    </div>
  )
}
