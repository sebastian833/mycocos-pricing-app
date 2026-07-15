'use client'

import { useState, useEffect } from 'react'
import { useData } from '@/lib/context'
import { useRouter } from 'next/navigation'
import { Calculator, TrendingUp, TrendingDown } from 'lucide-react'

function fmt(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }
function fmtM(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1e9) return (n < 0 ? '-' : '') + '$' + (abs / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return (n < 0 ? '-' : '') + '$' + (abs / 1e6).toFixed(1) + 'M'
  return fmt(n)
}

function NumberInput({ label, value, onChange, prefix, suffix, hint }: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; hint?: string
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>}
        <input
          type="number"
          value={value}
          onChange={e => onChange(+e.target.value || 0)}
          className={`w-full py-2.5 text-base font-medium text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-8' : 'pr-3'}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function Simulador() {
  const { data } = useData()
  const router = useRouter()
  const [selIdx, setSelIdx] = useState(0)
  const [mercado, setMercado] = useState<'nacional' | 'internacional'>('nacional')
  const [packsBOM, setPacksBOM] = useState<Record<string, number>>({})

  // Nacional
  const [precioVenta, setPrecioVenta] = useState(50000)
  const [costo, setCosto] = useState(12000)
  const [descuento, setDescuento] = useState(0)
  const [volumen, setVolumen] = useState(1000)

  // Internacional
  const [precioUSD, setPrecioUSD] = useState(55)
  const [tc, setTc] = useState(950)

  useEffect(() => { if (!data) router.push('/') }, [data, router])

  useEffect(() => {
    fetch('/packs.json')
      .then(res => res.json())
      .then((packs: { nombre: string; costo_real_bom: number }[]) => {
        const map: Record<string, number> = {}
        packs.forEach(p => { if (p.costo_real_bom > 0) map[p.nombre.trim()] = p.costo_real_bom })
        setPacksBOM(map)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!data || !data.productos.length) return
    const p = data.productos[Math.min(selIdx, data.productos.length - 1)]
    const costoBOM = packsBOM[p.nombre.trim()]
    setPrecioVenta(p.precio_bruto_avg)
    setCosto(costoBOM || p.costo_avg)
    setDescuento(0)
    setVolumen(Math.round(p.volumen_total / 12))
    setPrecioUSD(Math.round(p.precio_bruto_avg / 950))
  }, [selIdx, data])

  if (!data || !data.productos || data.productos.length === 0) return null
  const prod = data.productos[Math.min(selIdx, data.productos.length - 1)]
  if (!prod) return null

  const IVA = 1.19
  const precioEfectivo = mercado === 'nacional'
    ? Math.round(precioVenta * (1 - descuento / 100))
    : Math.round(precioUSD * tc)

  const precioNeto = Math.round(precioEfectivo / IVA)
  const margenUnitario = precioNeto - costo
  const margenPct = precioNeto > 0 ? (margenUnitario / precioNeto) * 100 : 0
  const margenTotal = margenUnitario * volumen
  const ventaTotal = precioEfectivo * volumen

  const margenColor = margenPct >= 55 ? 'text-green-600' : margenPct >= 40 ? 'text-amber-600' : 'text-red-600'
  const margenBg = margenPct >= 55 ? 'bg-green-50 border-green-200' : margenPct >= 40 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

  const diffVsHistorico = precioEfectivo - prod.precio_bruto_avg
  const diffPct = prod.precio_bruto_avg > 0 ? (diffVsHistorico / prod.precio_bruto_avg) * 100 : 0

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-5 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-2xl mb-3">
          <Calculator className="text-blue-600" size={22} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Calculadora de precio y margen</h1>
        <p className="text-sm text-gray-500">Ingresa los valores y mira el resultado al instante</p>
      </div>

      <select
        value={selIdx}
        onChange={e => setSelIdx(+e.target.value)}
        className="w-full mb-4 px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        {data.productos.map((p, i) => (
          <option key={p.nombre} value={i}>{p.nombre}</option>
        ))}
      </select>

      {/* Toggle mercado */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
        <button
          onClick={() => setMercado('nacional')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mercado === 'nacional' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          🇨🇱 Nacional (CLP)
        </button>
        <button
          onClick={() => setMercado('internacional')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mercado === 'internacional' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          🌎 Internacional (USD)
        </button>
      </div>

      {/* Inputs card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {mercado === 'nacional' ? (
            <>
              <NumberInput label="Precio de venta" value={precioVenta} onChange={setPrecioVenta} prefix="$" hint="Con IVA incluido" />
              <NumberInput label="Descuento" value={descuento} onChange={setDescuento} suffix="%" hint="Adicional al precio" />
            </>
          ) : (
            <>
              <NumberInput label="Precio de venta" value={precioUSD} onChange={setPrecioUSD} prefix="US$" />
              <NumberInput label="Tipo de cambio" value={tc} onChange={setTc} prefix="$" hint="CLP por USD" />
            </>
          )}
          <NumberInput label="Costo unitario" value={costo} onChange={setCosto} prefix="$" hint={packsBOM[prod.nombre.trim()] ? 'Costo real calculado de sus componentes (pack)' : 'Costo neto del producto'} />
          <NumberInput label="Volumen a vender" value={volumen} onChange={setVolumen} suffix="un." hint="Unidades proyectadas" />
        </div>
      </div>

      {/* Resultado principal */}
      <div className={`border rounded-2xl p-5 mb-4 ${margenBg}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Margen por unidad</span>
          <div className="flex items-center gap-1.5">
            {margenPct >= (prod.margen_avg || 0) ? <TrendingUp size={16} className={margenColor} /> : <TrendingDown size={16} className={margenColor} />}
            <span className={`text-2xl font-bold ${margenColor}`}>{margenPct.toFixed(1)}%</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Precio neto (s/IVA)</span>
            <p className="font-semibold text-gray-900">{fmt(precioNeto)}</p>
          </div>
          <div>
            <span className="text-gray-500">Margen unitario</span>
            <p className="font-semibold text-gray-900">{fmt(margenUnitario)}</p>
          </div>
        </div>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">Venta total</p>
          <p className="text-xl font-bold text-white">
            {mercado === 'internacional' ? 'US$' + Math.round(precioUSD * volumen).toLocaleString() : fmtM(ventaTotal)}
          </p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-1">Margen total</p>
          <p className={`text-xl font-bold ${margenTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtM(margenTotal)}</p>
        </div>
      </div>

      {/* Comparación vs histórico */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        <strong>Referencia:</strong> el precio promedio histórico de este producto es {fmt(prod.precio_bruto_avg)} con margen {prod.margen_avg}%.
        {' '}Tu simulación está {diffPct >= 0 ? <span className="text-green-700 font-medium">+{diffPct.toFixed(1)}% arriba</span> : <span className="text-red-700 font-medium">{diffPct.toFixed(1)}% abajo</span>} del histórico.
      </div>
    </div>
  )
}
