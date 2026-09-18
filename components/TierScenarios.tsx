'use client'

import { useState, useEffect } from 'react'
import { calcularEscenarios, margenPorPrecio, roundChilean, type Categoria } from '@/lib/pricing-tiers'
import { useData } from '@/lib/context'
import { Flame, Star, Leaf, Gift, Boxes, Plus, X } from 'lucide-react'

function fmt(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }

const TIER_INFO = {
  tier1: { icon: Flame, nombre: 'Oferta Fuerte', cuando: 'Para Cyber Day y Black Friday', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  tier2: { icon: Star, nombre: 'Oferta Media', cuando: 'Para promociones normales', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  tier3: { icon: Leaf, nombre: 'Precio Normal', cuando: 'El precio de todos los días', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
}

interface CatalogItem { sku: string; nombre: string; costo: number }
interface RegaloAgregado { sku: string; nombre: string; costo: number }

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
  const { marcaActual } = useData()
  const [inflarPct, setInflarPct] = useState(12)
  const [precioCustom, setPrecioCustom] = useState<number | ''>('')
  const [catalogo, setCatalogo] = useState<CatalogItem[]>([])
  const [regalos, setRegalos] = useState<RegaloAgregado[]>([])
  const [mostrarSelector, setMostrarSelector] = useState(false)

  useEffect(() => {
    fetch(marcaActual.componentesFile)
      .then(r => r.json())
      .then(setCatalogo)
      .catch(() => setCatalogo([]))
    setRegalos([])
  }, [marcaActual, costo])

  const costoRegalos = regalos.reduce((s, r) => s + r.costo, 0)
  const costoTotal = costo + costoRegalos

  const escenarios = calcularEscenarios(costoTotal, categoria)
  const evergreen = escenarios[2]

  useEffect(() => {
    setPrecioCustom(evergreen.precioSugerido)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costoTotal, categoria])

  const margenCustom = precioCustom !== '' ? margenPorPrecio(costoTotal, Number(precioCustom)) : 0

  const agregarRegalo = (item: CatalogItem) => {
    if (regalos.find(r => r.sku === item.sku)) return
    setRegalos([...regalos, { sku: item.sku, nombre: item.nombre, costo: item.costo }])
    setMostrarSelector(false)
  }
  const quitarRegalo = (sku: string) => setRegalos(regalos.filter(r => r.sku !== sku))

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
              <Boxes className={categoria === 'kit' ? 'text-indigo-600' : 'text-gray-400'} size={24} />
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

      {/* Sección de regalos */}
      <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Gift size={15} className="text-pink-600" />
            <p className="text-sm font-medium text-pink-800">¿Le agregas algún regalo a este pack?</p>
          </div>
          <button
            onClick={() => setMostrarSelector(!mostrarSelector)}
            className="flex items-center gap-1 text-xs font-medium text-pink-700 bg-pink-100 hover:bg-pink-200 px-2.5 py-1 rounded-lg transition-colors"
          >
            <Plus size={12} /> Agregar regalo
          </button>
        </div>
        <p className="text-xs text-pink-600 mb-2">
          Sube el costo total y baja la ganancia, pero así sabes el número real
        </p>

        {mostrarSelector && (
          <div className="border border-pink-200 bg-white rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100 mb-2">
            {catalogo.length === 0 && (
              <p className="text-xs text-gray-400 p-3 text-center">No hay productos en el catálogo todavía</p>
            )}
            {catalogo.map(item => (
              <button
                key={item.sku}
                onClick={() => agregarRegalo(item)}
                disabled={!!regalos.find(r => r.sku === item.sku)}
                className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-pink-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span className="text-gray-700 truncate">{item.nombre}</span>
                <span className="text-gray-400 flex-shrink-0 ml-2">{fmt(item.costo)}</span>
              </button>
            ))}
          </div>
        )}

        {regalos.length > 0 && (
          <div className="space-y-1.5">
            {regalos.map(r => (
              <div key={r.sku} className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 text-sm">
                <span className="text-gray-700 truncate">{r.nombre}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-gray-500 text-xs">+{fmt(r.costo)}</span>
                  <button onClick={() => quitarRegalo(r.sku)} className="text-gray-300 hover:text-red-500">
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 pt-1.5 border-t border-pink-200 text-sm font-medium">
              <span className="text-pink-800">Costo con regalos</span>
              <span className="text-pink-800">{fmt(costo)} + {fmt(costoRegalos)} = {fmt(costoTotal)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Resumen de costo — siempre visible */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-5">
        <span className="text-sm text-gray-600">
          {regalos.length > 0 ? 'Costo total (con regalos)' : 'Cuánto cuesta hacerlo'}
        </span>
        <span className="text-base font-semibold text-gray-900">
          {regalos.length > 0 ? `${fmt(costo)} + ${fmt(costoRegalos)} = ${fmt(costoTotal)}` : fmt(costoTotal)}
        </span>
      </div>

      <p className="text-sm font-medium text-gray-700 mb-2.5">Estos son los precios sugeridos</p>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {escenarios.map(e => {
          const info = TIER_INFO[e.tier.key]
          const Icon = info.icon
          const precioTachado = roundChilean(evergreen.precioSugerido * (1 + inflarPct / 100))
          const gananciaPct = categoria === 'unitario' && e.margenRango
            ? `${(e.margenRango[0] * 100).toFixed(0)}–${(e.margenRango[1] * 100).toFixed(0)}%`
            : `${(e.margenObjetivo * 100).toFixed(0)}%`
          const gananciaPesos = e.precioNeto - costoTotal
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
              <p className="text-xs text-gray-500 mt-1.5">= {fmt(gananciaPesos)} de ganancia c/u</p>
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
        <p className="text-xs text-gray-400 mb-3">Escríbelo y te decimos cuánto ganas (costo: {fmt(costoTotal)})</p>
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
            <p className="text-xs text-gray-400">
              {precioCustom !== '' ? fmt(Math.round(Number(precioCustom) / 1.19) - costoTotal) : '—'} por unidad
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
