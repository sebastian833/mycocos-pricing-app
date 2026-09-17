'use client'

import { useState, useEffect } from 'react'
import { calcularEscenarios, margenPorPrecio, roundChilean, type Categoria } from '@/lib/pricing-tiers'
import { Flame, Star, Leaf, Gift, Boxes } from 'lucide-react'

function fmt(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }

const TIER_INFO = {
  tier1: { icon: Flame, nombre: 'Oferta Fuerte', cuando: 'Para Cyber Day y Black Friday', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  tier2: { icon: Star, nombre: 'Oferta Media', cuando: 'Para promociones normales', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  tier3: { icon: Leaf, nombre: 'Precio Normal', cuando: 'El precio de todos los días', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
}

export default function TierScenarios({
  costo,
  categoria,
  onCategoriaChange,
  showCategoriaToggle = false,
}: {
  costo: number
  categoria: Categoria
  onCategoriaChange?: (c: Categoria) => void
  showCategoriaToggle?: boolean
}) {
  const [inflarPct, setInflarPct] = useState(12)
  const [precioCustom, setPrecioCustom] = useState<number | ''>('')

  const escenarios = calcularEscenarios(costo, categoria)
  const evergreen = escenarios[2]

  useEffect(() => {
    setPrecioCustom(evergreen.precioSugerido)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costo, categoria])

  const margenCustom = precioCustom !== '' ? margenPorPrecio(costo, Number(precioCustom)) : 0

  if (costo <= 0) {
    return <p className="text-sm text-gray-400">Ingresa un costo válido para ver los precios sugeridos.</p>
  }

  return (
    <div>
      {showCategoriaToggle && onCategoriaChange && (
        <div className="mb-5">
          <p className="text-sm font-medium text-gray-700 mb-2.5">¿Qué tipo de combo es este?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onCategoriaChange('kit')}
              className={`text-left p-4 rounded-2xl border-2 transition-colors ${
                categoria === 'kit' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <Gift className={categoria === 'kit' ? 'text-indigo-600' : 'text-gray-400'} size={24} />
              <p className={`text-sm font-semibold mt-2 ${categoria === 'kit' ? 'text-indigo-900' : 'text-gray-700'}`}>
                Productos distintos juntos
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Ej: rasuradora + cortaúñas + bolso</p>
            </button>
            <button
              onClick={() => onCategoriaChange('pack')}
              className={`text-left p-4 rounded-2xl border-2 transition-colors ${
                categoria === 'pack' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <Boxes className={categoria === 'pack' ? 'text-indigo-600' : 'text-gray-400'} size={24} />
              <p className={`text-sm font-semibold mt-2 ${categoria === 'pack' ? 'text-indigo-900' : 'text-gray-700'}`}>
                Varias unidades iguales
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Ej: 3 desodorantes iguales</p>
            </button>
          </div>
        </div>
      )}

      <p className="text-sm font-medium text-gray-700 mb-2.5">Estos son los precios sugeridos</p>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {escenarios.map(e => {
          const info = TIER_INFO[e.tier.key]
          const Icon = info.icon
          const precioTachado = roundChilean(evergreen.precioSugerido * (1 + inflarPct / 100))
          const gananciaPct = categoria === 'unitario' && e.margenRango
            ? `${(e.margenRango[0] * 100).toFixed(0)}–${(e.margenRango[1] * 100).toFixed(0)}%`
            : `${(e.margenObjetivo * 100).toFixed(0)}%`
          return (
            <div key={e.tier.key} className={`border-2 rounded-2xl p-4 ${info.bg} ${info.border}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={16} className={info.text} />
                <span className={`text-sm font-bold ${info.text}`}>{info.nombre}</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">{info.cuando}</p>
              {e.tier.key !== 'tier3' && (
                <p className="text-xs text-gray-400 line-through mb-0.5">{fmt(precioTachado)}</p>
              )}
              <p className="text-2xl font-bold text-gray-900">{fmt(e.precioSugerido)}</p>
              <div className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${info.bg} ${info.text} border ${info.border}`}>
                Ganas {gananciaPct}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
        <p className="text-sm text-gray-700 font-medium mb-1">Precio &quot;antes&quot; para mostrar el descuento</p>
        <p className="text-xs text-gray-500 mb-2.5">
          Este precio se muestra tachado arriba de la Oferta Fuerte y Oferta Media, para que se note el descuento
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={inflarPct}
            onChange={e => setInflarPct(+e.target.value || 0)}
            className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <span className="text-xs text-gray-400">% más caro que el precio normal</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl p-4">
        <p className="text-sm text-white font-medium mb-1">¿Quieres poner otro precio?</p>
        <p className="text-xs text-gray-400 mb-3">Escríbelo y te decimos cuánto ganas</p>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-[160px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={precioCustom}
              onChange={e => setPrecioCustom(e.target.value ? +e.target.value : '')}
              className="w-full pl-7 pr-3 py-2.5 text-base font-medium bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <span className="text-xs text-gray-400 block">Ganas</span>
            <p className={`text-2xl font-bold ${margenCustom >= 55 ? 'text-green-400' : margenCustom >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {margenCustom.toFixed(0)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
