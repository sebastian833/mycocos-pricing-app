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
import type { ProductData, ProductMonth } from '@/types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, BarController, LineController, Title, Tooltip, Legend, Filler)

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const TEMP  = ['Año nuevo','Verano','Vuelta clases','Otoño','Día Mamá','CyberDay','Invierno','Invierno','Fiestas Patrias','Pre HotSale','HotSale','Navidad/CyberMonday']

function fmt(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }
// Montos grandes en millones ($161,5 M); los chicos completos
function fmtPlata(n: number) {
  return Math.abs(n) >= 1e6
    ? '$' + (n / 1e6).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M'
    : fmt(n)
}

export default function Informe() {
  const { data, marcaActual } = useData()
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

  // Margen en plata: lo que realmente dejó cada mes (suma de las ventas), no solo el porcentaje
  const margenMes = (m: ProductMonth) => m.m25 ?? Math.round((m.pn25 - m.c25) * m.q25)
  const totUnid = meses.reduce((s, m) => s + m.q25, 0)
  const totMargen = meses.reduce((s, m) => s + margenMes(m), 0)
  const totMargenPrev = meses.reduce((s, m) => s + (m.m24 ?? 0), 0)
  const mesTopMargen = meses.reduce((a, b) => margenMes(a) >= margenMes(b) ? a : b, meses[0])

  const chartData = {
    labels: MESES,
    datasets: [
      {
        label: `Precio sin descuento ${latest}`,
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
        label: `Precio de venta ${latest}`,
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
        label: `Precio de venta ${prev}`,
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
        <p className="text-sm text-gray-500">Mira cómo se vendió este producto mes a mes: a qué precio, cuántas unidades y cuánto margen (ganancia) dejó.</p>
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

      <details className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-5">
        <summary className="text-sm font-medium text-gray-700 cursor-pointer">¿Cómo leo esta página?</summary>
        <div className="mt-3 space-y-1.5 text-xs text-gray-600">
          <p><b>Precio de venta:</b> el precio al que se vendió ese mes, con IVA.</p>
          <p><b>Precio sin descuento:</b> el precio de lista, antes de cualquier descuento.</p>
          <p><b>Descuento:</b> cuánto se rebajó en promedio.</p>
          <p><b>Margen (%):</b> de cada $100 de venta sin IVA, cuántos quedan después de pagar el costo.</p>
          <p><b>Margen por unidad ($):</b> lo que deja cada unidad vendida, en pesos.</p>
          <p><b>Margen total ($):</b> lo que dejó el mes completo, sumando todas las ventas. Sirve para ver qué mes fue mejor de verdad.</p>
          <p><b>Cambio de precio:</b> cuánto subió o bajó el precio frente al mismo mes del año anterior.</p>
          <p><b>Colores:</b> el precio más alto del año va en verde y el más bajo en rojo. En el margen: verde desde 50%, amarillo entre 30% y 50%, rojo bajo 30%.</p>
        </div>
      </details>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        {[
          { label: 'Precio máximo', value: fmt(maxPb), sub: MESES[meses.findIndex(m => m.pb25 === maxPb)] },
          { label: 'Precio mínimo', value: fmt(minPb), sub: MESES[meses.findIndex(m => m.pb25 === minPb)] },
          { label: 'Diferencia máx–mín', value: spread + '%', sub: 'el precio más alto sobre el más bajo' },
          { label: 'Mes que más se vendió', value: MESES[meses.indexOf(maxQ)], sub: maxQ.q25.toLocaleString() + ' unidades' },
          { label: `Margen total ${latest}`, value: fmtPlata(totMargen), sub: totUnid > 0 ? `${totUnid.toLocaleString()} un. · ${fmt(totMargen / totUnid)} por unidad` : 'sin ventas' },
          { label: 'Mes que más margen dejó', value: totMargen > 0 ? MESES[mesTopMargen.mes - 1] : '—', sub: totMargen > 0 ? fmtPlata(margenMes(mesTopMargen)) : '' },
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
          { color: '#378ADD', label: `Precio de venta ${latest}`, solid: true },
          { color: '#5DCAA5', label: `Precio sin descuento ${latest}`, solid: false },
          { color: '#EF9F27', label: `Precio de venta ${prev}`, solid: false },
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
                {[
                  ['Mes', ''],
                  ['Temporada', 'Evento o época del año'],
                  ['Precio de venta', 'Precio al que se vendió, con IVA'],
                  ['Precio sin descuento', 'Precio de lista, antes de descuentos'],
                  ['Descuento', 'Cuánto se rebajó en promedio'],
                  ['Margen (%)', 'De cada $100 de venta sin IVA, cuántos quedan después de pagar el costo'],
                  ['Margen por unidad ($)', 'Lo que deja cada unidad vendida, en pesos'],
                  [`Unidades ${latest}`, 'Cuántas unidades se vendieron en el mes'],
                  [`Margen total ${latest} ($)`, 'Lo que dejó el mes completo: suma de todas las ventas'],
                  [`Precio de venta ${prev}`, 'El mismo mes del año anterior'],
                  [`Margen total ${prev} ($)`, 'Lo que dejó el mismo mes del año anterior'],
                  [`Cambio de precio vs ${prev}`, 'Cuánto subió o bajó el precio frente al año anterior'],
                ].map(([h, tip]) => (
                  <th key={h} title={tip} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
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
                      {m.q25 > 0 ? (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${isMax ? 'bg-green-100 text-green-800' : isMin ? 'bg-red-100 text-red-800' : 'text-gray-900'}`}>
                          {fmt(m.pb25)}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{m.q25 > 0 ? fmt(m.pl25) : <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{m.q25 > 0 ? m.d25.toFixed(1) + '%' : <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2.5 text-xs font-medium" style={{ color: m.mg25 >= 50 ? '#3B6D11' : m.mg25 >= 30 ? '#854F0B' : '#A32D2D' }}>
                      {m.q25 > 0 ? m.mg25.toFixed(1) + '%' : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ color: m.mg25 >= 50 ? '#3B6D11' : m.mg25 >= 30 ? '#854F0B' : '#A32D2D' }}>
                      {m.q25 > 0 && m.pn25 > 0 ? fmt(m.pn25 - m.c25) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 text-xs">{m.q25.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-xs font-medium text-gray-900 whitespace-nowrap">{m.q25 > 0 ? fmtPlata(margenMes(m)) : '—'}</td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs">{m.pb24 ? fmt(m.pb24) : '—'}</td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap">{m.m24 ? fmtPlata(m.m24) : '—'}</td>
                    <td className="px-3 py-2.5 text-xs font-medium whitespace-nowrap">
                      {delta !== null
                        ? <span style={{ color: delta >= 0 ? '#3B6D11' : '#A32D2D' }}>
                            {delta >= 0 ? '+' : '−'}{fmt(Math.abs(delta))}
                          </span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                  </tr>
                )
              })}
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                <td className="px-3 py-2.5 text-gray-900">Total</td>
                <td className="px-3 py-2.5" colSpan={5}></td>
                <td className="px-3 py-2.5 text-xs text-gray-700">{totUnid > 0 ? fmt(totMargen / totUnid) + ' prom.' : '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-900">{totUnid.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-xs text-gray-900 whitespace-nowrap">{fmtPlata(totMargen)}</td>
                <td className="px-3 py-2.5"></td>
                <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{totMargenPrev ? fmtPlata(totMargenPrev) : '—'}</td>
                <td className="px-3 py-2.5"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Los precios incluyen IVA (19%) y el margen se calcula sobre el precio sin IVA. El margen total suma lo que dejó cada venta del mes. El margen por unidad usa el precio y el costo típicos del mes, por eso puede no multiplicar exacto con las unidades.
        {marcaActual.id === 'myhuevos' && ' En MyHUEVOS Colombia el reporte de ventas no trae costo: se usa el costo actual de la maestra en todos los meses.'}
      </p>
    </div>
  )
}
