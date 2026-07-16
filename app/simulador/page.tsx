'use client'

import { useState, useEffect } from 'react'
import { useData } from '@/lib/context'
import { useRouter } from 'next/navigation'
import { Calculator, TrendingUp, TrendingDown, Minus, CalendarDays } from 'lucide-react'
import TierScenarios from '@/components/TierScenarios'
import { calcularElasticidad, calcularEscenarios, CALENDARIO_MESES } from '@/lib/pricing-tiers'

const MESES_NOMBRE = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const TIER_BADGE = {
  tier1: { label: 'Oferta Fuerte', bg: 'bg-red-100', text: 'text-red-700' },
  tier2: { label: 'Oferta Media', bg: 'bg-amber-100', text: 'text-amber-700' },
  tier3: { label: 'Precio Normal', bg: 'bg-green-100', text: 'text-green-700' },
}

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

  // Nacional
  const [precioVenta, setPrecioVenta] = useState(50000)
  const [costo, setCosto] = useState(12000)
  const [descuento, setDescuento] = useState(0)
  const [volumen, setVolumen] = useState(1000)

  // Internacional
  const [precioUSD, setPrecioUSD] = useState(55)
  const [tc, setTc] = useState(950)

  useEffect(() => { if (!data) router.push('/') }, [data, router])

  // Solo productos unitarios — los packs/kits tienen su propia pestaña dedicada
  const productos = data?.productos.filter(p => p.tipo !== 'PACKS MY COCOS') || []

  useEffect(() => {
    if (!productos.length) return
    const p = productos[Math.min(selIdx, productos.length - 1)]
    setPrecioVenta(p.precio_bruto_avg)
    setCosto(p.costo_avg)
    setDescuento(0)
    setVolumen(Math.round(p.volumen_total / 12))
    setPrecioUSD(Math.round(p.precio_bruto_avg / 950))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selIdx, data])

  if (!data || productos.length === 0) return null
  const prod = productos[Math.min(selIdx, productos.length - 1)]
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

  const { clasificacion: elasticidadClass } = calcularElasticidad(prod.meses)
  const escenariosMensuales = calcularEscenarios(costo, 'unitario')
  const maxVolumen = Math.max(...prod.meses.map(m => m.q25), 1)

  const elasticidadInfo = {
    'elástico': { icon: TrendingUp, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', texto: 'Cuando bajas el precio, las ventas suben harto. Vale la pena dar descuentos fuertes en fechas como Cyber Day o Black Friday.' },
    'inelástico': { icon: Minus, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', texto: 'Aunque bajes el precio, no vendes mucho más. Mejor mantener el precio alto incluso en ofertas.' },
    'neutro': { icon: TrendingDown, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', texto: 'Las ventas suben un poco con descuentos, sin ser un cambio grande.' },
  }[elasticidadClass]
  const ElastIcon = elasticidadInfo.icon

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-2xl mb-3">
          <Calculator className="text-blue-600" size={22} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Calculadora de precio</h1>
        <p className="text-sm text-gray-500">Escribe los números y mira el resultado al instante</p>
      </div>

      <select
        value={selIdx}
        onChange={e => setSelIdx(+e.target.value)}
        className="w-full mb-4 px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        {productos.map((p, i) => (
          <option key={p.nombre} value={i}>{p.nombre}</option>
        ))}
      </select>

      {/* Elasticidad */}
      <div className={`flex items-start gap-2.5 border rounded-xl p-4 mb-5 ${elasticidadInfo.bg}`}>
        <ElastIcon className={`${elasticidadInfo.color} flex-shrink-0 mt-0.5`} size={18} />
        <p className={`text-sm ${elasticidadInfo.color}`}>{elasticidadInfo.texto}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">¿A qué precio venderlo?</h2>
        <TierScenarios costo={costo} categoria="unitario" />
      </div>

      {/* Calendario mensual */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays size={16} className="text-gray-700" />
          <h2 className="text-sm font-semibold text-gray-900">Qué precio usar cada mes</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">Según cuándo son las fechas importantes y cuánto se vendió el año pasado</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="py-2 text-left text-xs font-medium text-gray-500">Mes</th>
                <th className="py-2 text-left text-xs font-medium text-gray-500">Fecha importante</th>
                <th className="py-2 text-left text-xs font-medium text-gray-500">Ventas el año pasado</th>
                <th className="py-2 text-left text-xs font-medium text-gray-500">Qué usar</th>
                <th className="py-2 text-right text-xs font-medium text-gray-500">Precio sugerido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {CALENDARIO_MESES.map((cm, i) => {
                const mesData = prod.meses[i]
                const badge = TIER_BADGE[cm.tierSugerido]
                const escenario = escenariosMensuales[cm.tierSugerido === 'tier1' ? 0 : cm.tierSugerido === 'tier2' ? 1 : 2]
                const barWidth = mesData ? Math.max(4, (mesData.q25 / maxVolumen) * 100) : 0
                return (
                  <tr key={cm.mes}>
                    <td className="py-2 font-medium text-gray-900">{MESES_NOMBRE[i]}</td>
                    <td className="py-2 text-gray-500 text-xs">{cm.temporada}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${barWidth}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{mesData?.q25?.toLocaleString() || 0}</span>
                      </div>
                    </td>
                    <td className="py-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>{badge.label}</span>
                    </td>
                    <td className="py-2 text-right font-semibold text-gray-900">{fmt(escenario.precioSugerido)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6 mb-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Si vendes varias unidades, calcula el total aquí</p>
      </div>

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
          <NumberInput label="Cuánto cuesta hacerlo" value={costo} onChange={setCosto} prefix="$" hint="El costo de producción o compra" />
          <NumberInput label="Cuántas unidades vas a vender" value={volumen} onChange={setVolumen} suffix="un." hint="Cuántas esperas vender" />
        </div>
      </div>

      {/* Resultado principal */}
      <div className={`border rounded-2xl p-5 mb-4 ${margenBg}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Ganas por cada unidad</span>
          <div className="flex items-center gap-1.5">
            {margenPct >= (prod.margen_avg || 0) ? <TrendingUp size={16} className={margenColor} /> : <TrendingDown size={16} className={margenColor} />}
            <span className={`text-2xl font-bold ${margenColor}`}>{margenPct.toFixed(1)}%</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Precio sin IVA</span>
            <p className="font-semibold text-gray-900">{fmt(precioNeto)}</p>
          </div>
          <div>
            <span className="text-gray-500">Ganancia por unidad</span>
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
          <p className="text-xs text-gray-400 mb-1">Ganancia total</p>
          <p className={`text-xl font-bold ${margenTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtM(margenTotal)}</p>
        </div>
      </div>

      {/* Comparación vs histórico */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
        <strong>Dato de referencia:</strong> normalmente este producto se vende a {fmt(prod.precio_bruto_avg)} y se gana {prod.margen_avg}%.
        {' '}Tu cálculo está {diffPct >= 0 ? <span className="text-green-700 font-medium">+{diffPct.toFixed(1)}% más caro</span> : <span className="text-red-700 font-medium">{diffPct.toFixed(1)}% más barato</span>} que lo normal.
      </div>
    </div>
  )
}
