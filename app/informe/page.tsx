'use client'

import { useState, useEffect } from 'react'
import { useData } from '@/lib/context'
import { useRouter } from 'next/navigation'
import { Chart } from 'react-chartjs-2'
import type { ChartData } from 'chart.js'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, BarController, LineController, Title, Tooltip, Legend, Filler
} from 'chart.js'
import type { ProductData } from '@/types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, BarController, LineController, Title, Tooltip, Legend, Filler)

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const TEMP  = ['Año nuevo','Verano','Vuelta clases','Otoño','Día Mamá','CyberDay','Invierno','Invierno','Fiestas Patrias','Pre HotSale','HotSale','Navidad/CyberMonday']

function fmt(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }

export default function Informe() {
  const { data } = useData()
  const router = useRouter()
  const [selected, setSelected] = useState(0)

  useEffect(() => { if (!data) router.push('/') }, [data, router])
  if (!data || !data.productos || data.productos.length === 0) return null

  const prod: ProductData = data.productos[Math.min(selected, data.productos.length - 1)]
  if (!prod) return null
  const meses = prod.meses

  const pb25 = meses.map(m => m.pb25 || null)
  const pl25 = meses.map(m => m.pl25 || null)
  const pb24 = meses.map(m => m.pb24 || null)
  const q25  = meses.map(m => m.q25 || 0)

  const maxPb = Math.max(...meses.map(m => m.pb25).filter(Boolean))
  const minPb = Math.min(...meses.map(m => m.pb25).filter(Boolean))
  const maxQ  = meses.reduce((a, b) => a.q25 > b.q25 ? a : b, meses[0])
  const spread = minPb > 0 ? Math.round((maxPb - minPb) / minPb * 100) : 0

  const latest = data.años[data.años.length - 1]
  const prev   = latest - 1

  const chartData = {
    labels: MESES,
    datasets: [
      {
        label: `Precio lista ${latest}`,
        data: pl25,
        borderColor: '#5DCAA5',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [4, 3],
        tension: 0.3,
        yAxisID: 'y',
        pointRadius: 3,
        order: 3,
      },
      {
        label: `Precio bruto ${latest}`,
        data: pb25,
        borderColor: '#378ADD',
        backgroundColor: 'rgba(55,138,221,0.07)',
        borderWidth: 2.5,
        tension: 0.3,
        yAxisID: 'y',
        pointRadius: 4,
        fill: true,
        order: 2,
      },
      {
        label: `Precio bruto ${prev}`,
        data: pb24,
        borderColor: 'rgba(239,159,39,0.7)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 3],
        tension: 0.3,
        yAxisID: 'y',
        pointRadius: 3,
        order: 4,
      },
      {
        type: 'bar' as const,
        label: `Unidades ${latest}`,
        data: q25,
        backgroundColor: 'rgba(55,138,221,0.10)',
        borderColor: 'rgba(55,138,221,0.2)',
        borderWidth: 1,
        yAxisID: 'yq',
        order: 5,
      },
    ],
  }

  const maxQ2 = Math.max(...q25)
  const yMax  = Math.max(...[...pb25, ...pl25, ...pb24].filter((v): v is number => v !== null)) * 1.12
  const yMin  = Math.min(...[...pb25, ...pb24].filter((v): v is number => v !== null)) * 0.88

  const options = {
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
        min: 0, max: maxQ2 * 3,
        ticks: { callback: (v: number|string) => +v >= 1000 ? (+v/1000).toFixed(1)+'K' : String(Math.round(+v)), font: { size: 10 } },
        grid: { display: false },
      },
    },
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Informe de precios por temporada</h1>
        <p className="text-sm text-gray-500">Evolución mensual de precio, descuento y volumen</p>
      </div>

      <select
        value={selected}
        onChange={e => setSelected(+e.target.value)}
        className="w-full mb-5 px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        {data.productos.map((p, i) => (
          <option key={p.nombre} value={i}>{p.nombre}</option>
        ))}
      </select>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Precio máximo', value: fmt(maxPb), sub: MESES[meses.findIndex(m => m.pb25 === maxPb)] },
          { label: 'Precio mínimo', value: fmt(minPb), sub: MESES[meses.findIndex(m => m.pb25 === minPb)] },
          { label: 'Spread anual', value: spread + '%', sub: 'máx vs mín' },
          { label: 'Mes top volumen', value: MESES[meses.indexOf(maxQ)], sub: maxQ.q25.toLocaleString() + ' unidades' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className="text-lg font-semibold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-400">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-500 mb-3 flex-wrap">
        {[
          { color: '#378ADD', label: `Precio bruto ${latest}`, solid: true },
          { color: '#5DCAA5', label: `Precio lista ${latest}`, solid: false },
          { color: '#EF9F27', label: `Precio bruto ${prev}`, solid: false },
          { color: 'rgba(55,138,221,0.3)', label: `Volumen ${latest}`, solid: true, bar: true },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5">
            {l.bar
              ? <span className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
              : <span className="w-5 h-0.5 rounded" style={{ background: l.color, borderTop: l.solid ? 'none' : '1.5px dashed ' + l.color, display: 'block' }} />
            }
            {l.label}
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5">
        <div style={{ height: 280 }}>
          <Chart type='bar' data={chartData as ChartData<'bar'>} options={options as object} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Mes','Temporada','Precio bruto','Precio lista','Dcto %','Margen %',`Unid. ${latest}`,`P. bruto ${prev}`,'Δ vs ant.'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {meses.map((m, i) => {
                const isMax = m.pb25 === maxPb
                const isMin = m.pb25 === minPb
                const delta = m.pb24 ? m.pb25 - m.pb24 : null
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-900">{MESES[i]}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{TEMP[i]}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${isMax ? 'bg-green-100 text-green-800' : isMin ? 'bg-red-100 text-red-800' : 'text-gray-900'}`}>
                        {fmt(m.pb25)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{fmt(m.pl25)}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{m.d25.toFixed(1)}%</td>
                    <td className="px-3 py-2.5 text-xs font-medium" style={{ color: m.mg25 >= 50 ? '#3B6D11' : m.mg25 >= 30 ? '#854F0B' : '#A32D2D' }}>
                      {m.mg25.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 text-xs">{m.q25.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs">{m.pb24 ? fmt(m.pb24) : '—'}</td>
                    <td className="px-3 py-2.5 text-xs font-medium whitespace-nowrap">
                      {delta !== null
                        ? <span style={{ color: delta >= 0 ? '#3B6D11' : '#A32D2D' }}>
                            {delta >= 0 ? '+' : ''}{fmt(delta)}
                          </span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
