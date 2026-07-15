'use client'

import { useState, useEffect } from 'react'
import { useData } from '@/lib/context'
import { useRouter } from 'next/navigation'
import { analyzePricing } from '@/lib/pricing-engine'
import { Sparkles, TrendingUp, TrendingDown, Minus, Info, Package } from 'lucide-react'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

interface PackBOM {
  nombre: string
  costo_real_bom: number
  costo_registrado: number | null
}

function fmt(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }

export default function Recomendador() {
  const { data } = useData()
  const router = useRouter()
  const [selIdx, setSelIdx] = useState(0)
  const [packsBOM, setPacksBOM] = useState<Record<string, number>>({})

  useEffect(() => { if (!data) router.push('/') }, [data, router])

  useEffect(() => {
    fetch('/packs.json')
      .then(res => res.json())
      .then((packs: PackBOM[]) => {
        const map: Record<string, number> = {}
        packs.forEach(p => {
          if (p.costo_real_bom > 0) map[p.nombre.trim()] = p.costo_real_bom
        })
        setPacksBOM(map)
      })
      .catch(() => {})
  }, [])

  if (!data || !data.productos || data.productos.length === 0) return null

  const prod = data.productos[Math.min(selIdx, data.productos.length - 1)]
  if (!prod) return null

  const costoBOM = packsBOM[prod.nombre.trim()]
  const analysis = analyzePricing(prod, costoBOM)
  const currentMonth = new Date().getMonth()

  const elasticidadInfo = {
    'elástico': { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', desc: 'El volumen responde fuertemente al precio. Los descuentos en eventos multiplican las ventas — conviene ser agresivo en CyberDay y Navidad.' },
    'inelástico': { icon: Minus, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', desc: 'El volumen casi no responde al precio. Los descuentos regalan margen sin ganar ventas — mantén precios altos incluso en eventos.' },
    'neutro': { icon: TrendingDown, color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200', desc: 'Respuesta moderada al precio. Replica el patrón histórico que balanceó precio y volumen.' },
  }[analysis.clasificacionElasticidad]

  const EIcon = elasticidadInfo.icon

  return (
    <div>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="text-purple-600" size={20} />
          <h1 className="text-xl font-semibold text-gray-900">Recomendador de precios</h1>
        </div>
        <p className="text-sm text-gray-500">Precio sugerido por mes basado en piso de margen, estacionalidad y elasticidad del histórico</p>
      </div>

      <select
        value={selIdx}
        onChange={e => setSelIdx(+e.target.value)}
        className="w-full mb-5 px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-200"
      >
        {data.productos.map((p, i) => (
          <option key={p.nombre} value={i}>{p.nombre}</option>
        ))}
      </select>

      {analysis.costoFuente === 'bom' && (
        <div className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 mb-4">
          <Package className="text-indigo-600 flex-shrink-0" size={16} />
          <p className="text-xs text-indigo-800">
            Este producto es un pack. Usando el <strong>costo real calculado de sus componentes</strong> ({fmt(analysis.costo)})
            {analysis.costoRegistrado > 0 && analysis.costoRegistrado !== analysis.costo && (
              <> en vez del registrado en ShopyLibre ({fmt(analysis.costoRegistrado)}).</>
            )}
            {' '}Ver detalle en la pestaña <strong>Packs</strong>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Precio evergreen</p>
          <p className="text-lg font-semibold text-gray-900">{fmt(analysis.precioEvergreen)}</p>
          <p className="text-xs text-gray-400">mediana meses normales</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Precio piso</p>
          <p className="text-lg font-semibold text-red-700">{fmt(analysis.precioPiso)}</p>
          <p className="text-xs text-gray-400">margen mín. 55%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Costo neto</p>
          <p className="text-lg font-semibold text-gray-900">{fmt(analysis.costo)}</p>
          <p className="text-xs text-gray-400">{analysis.costoFuente === 'bom' ? 'real (BOM)' : 'unitario'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Elasticidad</p>
          <p className="text-lg font-semibold text-gray-900">{analysis.elasticidad}</p>
          <p className="text-xs text-gray-400">{analysis.clasificacionElasticidad}</p>
        </div>
      </div>

      <div className={`border rounded-xl p-4 mb-5 flex gap-3 ${elasticidadInfo.bg}`}>
        <EIcon className={elasticidadInfo.color + ' flex-shrink-0 mt-0.5'} size={18} />
        <div>
          <p className={`text-sm font-medium ${elasticidadInfo.color}`}>
            Producto {analysis.clasificacionElasticidad} (e = {analysis.elasticidad})
          </p>
          <p className="text-xs text-gray-600 mt-1">{elasticidadInfo.desc}</p>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl p-4 mb-5">
        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
          <Info size={12} /> Fórmula aplicada
        </p>
        <code className="text-xs text-green-400 font-mono block">
          P(mes) = max( P_piso , P_evergreen × Índice_estacional × Ajuste_elasticidad )
        </code>
        <code className="text-xs text-gray-500 font-mono block mt-1">
          P_piso = Costo / (1 - 55%) × 1.19 IVA → redondeo a .990
        </code>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Mes','Temporada','Precio recomendado','Precio histórico','Δ','Margen esperado','Vol. esperado','Razonamiento'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analysis.recomendaciones.map((r, i) => {
                const delta = r.precioHistorico > 0 ? r.precioRecomendado - r.precioHistorico : null
                const isCurrent = i === currentMonth
                return (
                  <tr key={i} className={isCurrent ? 'bg-purple-50' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-3 font-medium text-gray-900">
                      {MESES[i]}
                      {isCurrent && <span className="ml-1.5 text-xs bg-purple-600 text-white px-1.5 py-0.5 rounded">hoy</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.evento ? 'bg-orange-100 text-orange-700 font-medium' : 'text-gray-500'}`}>
                        {r.temporada}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-semibold text-purple-700 whitespace-nowrap">{fmt(r.precioRecomendado)}</span>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {r.precioHistorico > 0 ? fmt(r.precioHistorico) : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs font-medium whitespace-nowrap">
                      {delta !== null ? (
                        <span style={{ color: delta >= 0 ? '#3B6D11' : '#A32D2D' }}>
                          {delta >= 0 ? '+' : ''}{fmt(delta)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs font-medium" style={{ color: r.margenEsperado >= 60 ? '#3B6D11' : r.margenEsperado >= 50 ? '#854F0B' : '#A32D2D' }}>
                      {r.margenEsperado}%
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{r.volumenEsperado.toLocaleString()}</td>
                    <td className="px-3 py-3 text-gray-400 text-xs max-w-[280px]">{r.razonamiento}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Metodología: piso de precio garantiza margen mínimo 55% neto · precio evergreen = mediana de meses sin evento · índice estacional del histórico 2024-2025 · elasticidad estimada de pares precio-volumen consecutivos · redondeo psicológico a terminación .990.
      </p>
    </div>
  )
}
