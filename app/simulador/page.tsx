'use client'

import { useState, useEffect } from 'react'
import { useData } from '@/lib/context'
import { useRouter } from 'next/navigation'
import { Chart } from 'react-chartjs-2'
import type { ChartData } from 'chart.js'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function fmt(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }
function fmtM(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1e9) return (n < 0 ? '-' : '') + '$' + (abs / 1e9).toFixed(2) + 'B'
  if (abs >= 1e6) return (n < 0 ? '-' : '') + '$' + (abs / 1e6).toFixed(1) + 'M'
  return fmt(n)
}

function SliderRow({ label, value, min, max, step, onChange, display }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display: string
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-900">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)}
        className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  )
}

export default function Simulador() {
  const { data } = useData()
  const router = useRouter()
  const [selIdx, setSelIdx] = useState(0)
  const [pbNac, setPbNac] = useState(50000)
  const [costoNac, setCostoNac] = useState(12000)
  const [dcto, setDcto] = useState(5)
  const [volNac, setVolNac] = useState(1000)
  const [pbUSD, setPbUSD] = useState(55)
  const [tc, setTc] = useState(950)
  const [costoIntl, setCostoIntl] = useState(12000)
  const [volIntl, setVolIntl] = useState(100)

  useEffect(() => { if (!data) router.push('/') }, [data, router])

  useEffect(() => {
    if (!data) return
    const p = data.productos[selIdx]
    const avgPb = Math.round(p.meses.reduce((s, m) => s + m.pb25, 0) / 12)
    const avgQ = Math.round(p.volumen_total / 12)
    setPbNac(avgPb)
    setCostoNac(p.costo_avg)
    setDcto(5)
    setVolNac(avgQ)
    setPbUSD(Math.round(avgPb / 950))
    setCostoIntl(p.costo_avg)
    setVolIntl(Math.round(avgQ * 0.1))
  }, [selIdx, data])

  if (!data || !data.productos || data.productos.length === 0) return null

  const prod = data.productos[Math.min(selIdx, data.productos.length - 1)]
  if (!prod) return null
  const latest = data.años[data.años.length - 1]

  // Nacional calc
  const pbEfec = Math.round(pbNac * (1 - dcto / 100))
  const pnNac = Math.round(pbEfec / 1.19)
  const muNac = pnNac - costoNac
  const mpNac = pnNac > 0 ? (muNac / pnNac) * 100 : 0
  const mtNac = muNac * volNac
  const vtNac = pbEfec * volNac

  // Internacional calc
  const pbIntlCLP = pbUSD * tc
  const pnIntl = Math.round(pbIntlCLP / 1.19)
  const muIntl = pnIntl - costoIntl
  const mpIntl = pnIntl > 0 ? (muIntl / pnIntl) * 100 : 0
  const mtIntl = muIntl * volIntl
  const vtIntlUSD = pbUSD * volIntl

  // Consolidated
  const totalVenta = vtNac + pbIntlCLP * volIntl
  const totalMargen = mtNac + mtIntl
  const totalPct = totalVenta > 0 ? (totalMargen / totalVenta) * 100 : 0
  const totalUnits = volNac + volIntl

  const histPb = prod.meses.map(m => m.pb25)
  const maxHistQ = Math.max(...prod.meses.map(m => m.q25))
  const yMax = Math.max(...histPb, pbEfec) * 1.12
  const yMin = Math.min(...histPb, pbEfec) * 0.88

  const chartData = {
    labels: MESES,
    datasets: [
      {
        label: `Precio histórico ${latest}`,
        data: histPb,
        borderColor: '#378ADD',
        backgroundColor: 'rgba(55,138,221,0.07)',
        borderWidth: 2,
        tension: 0.3,
        yAxisID: 'y',
        pointRadius: 3,
        fill: true,
      },
      {
        label: 'Precio simulado',
        data: new Array(12).fill(pbEfec),
        borderColor: '#D85A30',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 3],
        tension: 0,
        yAxisID: 'y',
        pointRadius: 0,
      },
      {
        type: 'bar' as const,
        label: 'Volumen histórico',
        data: prod.meses.map(m => m.q25),
        backgroundColor: 'rgba(55,138,221,0.10)',
        borderColor: 'rgba(55,138,221,0.2)',
        borderWidth: 1,
        yAxisID: 'yq',
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { font: { size: 11 } } },
      y: {
        position: 'left' as const,
        min: yMin, max: yMax,
        ticks: { callback: (v: number|string) => '$' + Math.round(+v / 1000) + 'K', font: { size: 10 } },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      yq: {
        position: 'right' as const,
        min: 0, max: maxHistQ * 3,
        ticks: { callback: (v: number|string) => +v >= 1000 ? (+v/1000).toFixed(1)+'K' : String(Math.round(+v)), font: { size: 10 } },
        grid: { display: false },
      },
    },
  }

  const mpColor = (v: number) => v >= 50 ? 'text-green-700' : v >= 30 ? 'text-amber-700' : 'text-red-700'

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Simulador de precios</h1>
        <p className="text-sm text-gray-500">Ajusta precio, costo y volumen para proyectar márgenes</p>
      </div>

      <select
        value={selIdx}
        onChange={e => setSelIdx(+e.target.value)}
        className="w-full mb-5 px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        {data.productos.map((p, i) => (
          <option key={p.nombre} value={i}>{p.nombre}</option>
        ))}
      </select>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-xs text-blue-700 mb-5 leading-relaxed">
        <strong>Base {latest}:</strong> Precio bruto prom {fmt(prod.precio_bruto_avg)} · Precio lista prom {fmt(prod.precio_lista_avg)} · Costo {fmt(prod.costo_avg)} · Margen {prod.margen_avg}% · {prod.volumen_total.toLocaleString()} un.
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Nacional */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Precio nacional (CLP)</h2>
          <SliderRow label="Precio bruto c/IVA" value={pbNac} min={1000} max={Math.max(200000, prod.precio_lista_avg * 2)} step={500} onChange={setPbNac} display={fmt(pbNac)} />
          <SliderRow label="Costo neto unitario" value={costoNac} min={500} max={Math.max(80000, prod.costo_avg * 3)} step={100} onChange={setCostoNac} display={fmt(costoNac)} />
          <SliderRow label="Descuento adicional" value={dcto} min={0} max={50} step={1} onChange={setDcto} display={dcto + '%'} />
          <SliderRow label="Volumen proyectado" value={volNac} min={100} max={Math.max(30000, prod.volumen_total * 2)} step={100} onChange={setVolNac} display={volNac.toLocaleString() + ' un.'} />
          <div className="border-t border-gray-100 pt-3 mt-1 space-y-2">
            <div className="flex justify-between text-xs"><span className="text-gray-500">Precio efectivo</span><span>{fmt(pbEfec)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Precio neto s/IVA</span><span>{fmt(pnNac)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Margen unitario</span><span>{fmt(muNac)}</span></div>
            <div className="flex justify-between text-sm font-semibold"><span className="text-gray-700">% Margen</span><span className={mpColor(mpNac)}>{mpNac.toFixed(1)}%</span></div>
            <div className="flex justify-between text-sm font-semibold"><span className="text-gray-700">Margen total</span><span className={mpColor(mpNac)}>{fmtM(mtNac)}</span></div>
            <div className="flex justify-between text-sm font-semibold"><span className="text-gray-700">Venta bruta</span><span className="text-gray-900">{fmtM(vtNac)}</span></div>
          </div>
        </div>

        {/* Internacional */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Precio internacional (USD)</h2>
          <SliderRow label="Precio USD" value={pbUSD} min={5} max={300} step={1} onChange={setPbUSD} display={'US$' + pbUSD} />
          <SliderRow label="Tipo de cambio CLP/USD" value={tc} min={700} max={1300} step={10} onChange={setTc} display={tc.toLocaleString()} />
          <SliderRow label="Costo neto unitario (CLP)" value={costoIntl} min={500} max={Math.max(80000, prod.costo_avg * 3)} step={100} onChange={setCostoIntl} display={fmt(costoIntl)} />
          <SliderRow label="Volumen proyectado" value={volIntl} min={0} max={10000} step={50} onChange={setVolIntl} display={volIntl.toLocaleString() + ' un.'} />
          <div className="border-t border-gray-100 pt-3 mt-1 space-y-2">
            <div className="flex justify-between text-xs"><span className="text-gray-500">Precio CLP equiv.</span><span>{fmt(pbIntlCLP)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Precio neto s/IVA</span><span>{fmt(pnIntl)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-gray-500">Margen unitario</span><span>{fmt(muIntl)}</span></div>
            <div className="flex justify-between text-sm font-semibold"><span className="text-gray-700">% Margen</span><span className={mpColor(mpIntl)}>{mpIntl.toFixed(1)}%</span></div>
            <div className="flex justify-between text-sm font-semibold"><span className="text-gray-700">Margen total</span><span className={mpColor(mpIntl)}>{fmtM(mtIntl)}</span></div>
            <div className="flex justify-between text-sm font-semibold"><span className="text-gray-700">Venta bruta (USD)</span><span className="text-gray-900">US${Math.round(vtIntlUSD).toLocaleString()}</span></div>
          </div>
        </div>
      </div>

      {/* Consolidated */}
      <div className="bg-gray-900 rounded-xl p-5 mb-5">
        <h2 className="text-sm font-semibold text-white mb-4">Resultado consolidado</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Venta bruta total', value: fmtM(totalVenta), color: 'text-white' },
            { label: 'Margen total', value: fmtM(totalMargen), color: totalMargen >= 0 ? 'text-green-400' : 'text-red-400' },
            { label: '% Margen global', value: totalPct.toFixed(1) + '%', color: totalPct >= 50 ? 'text-green-400' : totalPct >= 30 ? 'text-amber-400' : 'text-red-400' },
            { label: 'Unidades totales', value: totalUnits.toLocaleString(), color: 'text-white' },
          ].map(c => (
            <div key={c.label} className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">{c.label}</p>
              <p className={`text-base font-semibold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Variación margen nacional vs histórico:{' '}
          <span className={mpNac - prod.margen_avg >= 0 ? 'text-green-400' : 'text-red-400'}>
            {mpNac - prod.margen_avg >= 0 ? '+' : ''}{(mpNac - prod.margen_avg).toFixed(1)} pp
          </span>
        </p>
      </div>

      {/* Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex gap-4 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-blue-400 block rounded" />Precio histórico</span>
          <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-orange-500 block rounded" style={{ borderTop: '1.5px dashed #D85A30' }} />Precio simulado</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-200" />Volumen</span>
        </div>
        <div style={{ height: 220 }}>
          <Chart type='bar' data={chartData as ChartData<'bar'>} options={chartOptions as object} />
        </div>
      </div>
    </div>
  )
}
