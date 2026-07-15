'use client'

import { useState, useEffect } from 'react'
import { calcularEscenarios, margenPorPrecio, roundChilean, type Categoria } from '@/lib/pricing-tiers'
import { Zap, Gauge, Leaf } from 'lucide-react'

function fmt(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }

const TIER_ICONS = { tier1: Zap, tier2: Gauge, tier3: Leaf }
const TIER_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  tier1: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  tier2: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  tier3: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
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
    return <p className="text-sm text-gray-400">Ingresa un costo válido para ver los escenarios.</p>
  }

  return (
    <div>
      {showCategoriaToggle && onCategoriaChange && (
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4 max-w-xs">
          <button
            onClick={() => onCategoriaChange('kit')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoria === 'kit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            Kit (combo curado)
          </button>
          <button
            onClick={() => onCategoriaChange('pack')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${categoria === 'pack' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            Pack (multi-unidad)
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4">
        {escenarios.map(e => {
          const Icon = TIER_ICONS[e.tier.key]
          const style = TIER_STYLES[e.tier.key]
          const precioTachado = roundChilean(evergreen.precioSugerido * (1 + inflarPct / 100))
          return (
            <div key={e.tier.key} className={`border rounded-2xl p-4 ${style.bg} ${style.border}`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={14} className={style.text} />
                <span className={`text-xs font-semibold ${style.text}`}>{e.tier.label}</span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{e.tier.sublabel}</p>
              {e.tier.key !== 'tier3' && (
                <p className="text-xs text-gray-400 line-through mb-0.5">{fmt(precioTachado)}</p>
              )}
              <p className="text-xl font-bold text-gray-900">{fmt(e.precioSugerido)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Margen {categoria === 'unitario' && e.margenRango
                  ? `${(e.margenRango[0] * 100).toFixed(0)}-${(e.margenRango[1] * 100).toFixed(0)}%`
                  : `${(e.margenObjetivo * 100).toFixed(0)}%`}
              </p>
            </div>
          )
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-3">
        <label className="block text-xs text-gray-500 mb-1.5">
          Inflar precio tachado (%) — ancla visual para resaltar la oferta en Tier 1 y 2
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={inflarPct}
            onChange={e => setInflarPct(+e.target.value || 0)}
            className="w-24 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <span className="text-xs text-gray-400">% sobre el precio evergreen</span>
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl p-4">
        <p className="text-xs text-gray-400 mb-2">¿Quieres probar otro precio?</p>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-[160px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={precioCustom}
              onChange={e => setPrecioCustom(e.target.value ? +e.target.value : '')}
              className="w-full pl-7 pr-3 py-2 text-sm font-medium bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <span className="text-xs text-gray-400 block">Margen resultante</span>
            <p className={`text-lg font-bold ${margenCustom >= 55 ? 'text-green-400' : margenCustom >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {margenCustom.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
