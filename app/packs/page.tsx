'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/lib/context'
import { Package, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Componente {
  sku: string
  nombre: string
  qty: number
  costo_unit: number
}
interface PackData {
  sku_padre: string
  nombre: string
  componentes: Componente[]
  costo_real_bom: number
  costo_registrado: number | null
  precio_venta: number | null
}

function fmt(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }

export default function Packs() {
  const { data } = useData()
  const router = useRouter()
  const [packs, setPacks] = useState<PackData[]>([])
  const [selIdx, setSelIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (!data) router.push('/') }, [data, router])

  useEffect(() => {
    fetch('/packs.json')
      .then(res => res.json())
      .then((json: PackData[]) => {
        const vendidos = json
          .filter(p => p.precio_venta && p.costo_real_bom > 0)
          .sort((a, b) => (b.precio_venta || 0) - (a.precio_venta || 0))
        setPacks(vendidos)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (!data || loading) return null
  if (packs.length === 0) return <p className="text-sm text-gray-400">No hay recetas de packs cargadas.</p>

  const pack = packs[Math.min(selIdx, packs.length - 1)]
  const diff = pack.costo_registrado !== null ? pack.costo_real_bom - pack.costo_registrado : null
  const diffPct = pack.costo_registrado ? ((diff || 0) / pack.costo_registrado) * 100 : 0

  const margenReal = pack.precio_venta ? ((pack.precio_venta / 1.19 - pack.costo_real_bom) / (pack.precio_venta / 1.19)) * 100 : 0
  const margenRegistrado = pack.precio_venta && pack.costo_registrado
    ? ((pack.precio_venta / 1.19 - pack.costo_registrado) / (pack.precio_venta / 1.19)) * 100
    : null

  const alertaSignificativa = Math.abs(diffPct) > 5

  return (
    <div>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Package className="text-indigo-600" size={20} />
          <h1 className="text-xl font-semibold text-gray-900">Costo real de packs (BOM)</h1>
        </div>
        <p className="text-sm text-gray-500">Costo calculado como la suma de sus componentes, comparado contra lo registrado en ShopyLibre</p>
      </div>

      <select
        value={selIdx}
        onChange={e => setSelIdx(+e.target.value)}
        className="w-full mb-5 px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        {packs.map((p, i) => (
          <option key={p.sku_padre} value={i}>{p.nombre}</option>
        ))}
      </select>

      {/* Alert */}
      {alertaSignificativa && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Diferencia significativa: el costo registrado está {diff! > 0 ? 'subestimado' : 'sobrestimado'} en {fmt(Math.abs(diff || 0))} ({Math.abs(diffPct).toFixed(1)}%)
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Esto afecta el margen real calculado en el Recomendador y Simulador para este pack.
            </p>
          </div>
        </div>
      )}
      {!alertaSignificativa && pack.costo_registrado !== null && (
        <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl p-4 mb-5">
          <CheckCircle2 className="text-green-600 flex-shrink-0" size={18} />
          <p className="text-sm text-green-800">El costo registrado coincide bien con el costo real de sus componentes.</p>
        </div>
      )}

      {/* Comparison cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Costo real (BOM)</p>
          <p className="text-lg font-semibold text-indigo-700">{fmt(pack.costo_real_bom)}</p>
          <p className="text-xs text-gray-400">suma de componentes</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Costo registrado</p>
          <p className="text-lg font-semibold text-gray-900">{pack.costo_registrado ? fmt(pack.costo_registrado) : '—'}</p>
          <p className="text-xs text-gray-400">en ShopyLibre</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Precio de venta</p>
          <p className="text-lg font-semibold text-gray-900">{pack.precio_venta ? fmt(pack.precio_venta) : '—'}</p>
          <p className="text-xs text-gray-400">bruto c/IVA</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Margen real vs registrado</p>
          <div className="flex items-center gap-1.5">
            <p className="text-lg font-semibold text-gray-900">{margenReal.toFixed(1)}%</p>
            {margenRegistrado !== null && (
              <span className={`text-xs flex items-center gap-0.5 ${margenReal >= margenRegistrado ? 'text-green-600' : 'text-red-600'}`}>
                {margenReal >= margenRegistrado ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                vs {margenRegistrado.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Componentes table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700">Componentes del pack ({pack.componentes.length})</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Componente</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">SKU</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Cantidad</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Costo unitario</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pack.componentes.map((c, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-900">{c.nombre}</td>
                <td className="px-4 py-2.5 text-gray-400 text-xs font-mono">{c.sku}</td>
                <td className="px-4 py-2.5 text-right text-gray-700">{c.qty}×</td>
                <td className="px-4 py-2.5 text-right text-gray-500">{c.costo_unit > 0 ? fmt(c.costo_unit) : 'sin dato'}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt(c.costo_unit * c.qty)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td colSpan={4} className="px-4 py-2.5 text-right text-sm font-medium text-gray-700">Total costo real (BOM)</td>
              <td className="px-4 py-2.5 text-right font-semibold text-indigo-700">{fmt(pack.costo_real_bom)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Costo unitario de cada componente = mediana del costo neto registrado en ventas 2025 para ese SKU individual.
        Si un componente muestra &quot;sin dato&quot; es porque no se vendió por separado en 2025 y no hay costo de referencia.
      </p>
    </div>
  )
}
