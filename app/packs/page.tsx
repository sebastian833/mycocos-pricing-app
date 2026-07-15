'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/lib/context'
import { detectarCategoria, type Categoria } from '@/lib/pricing-tiers'
import TierScenarios from '@/components/TierScenarios'
import { Package, Plus, X, Wrench } from 'lucide-react'

interface Componente { sku: string; nombre: string; qty: number; costo_unit: number }
interface PackData {
  sku_padre: string
  nombre: string
  componentes: Componente[]
  costo_real_bom: number
  costo_registrado: number | null
  precio_venta: number | null
}
interface CatalogItem { sku: string; nombre: string; costo: number; tipo: string }

function fmt(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }

export default function Packs() {
  const { data } = useData()
  const router = useRouter()
  const [packs, setPacks] = useState<PackData[]>([])
  const [catalogo, setCatalogo] = useState<CatalogItem[]>([])
  const [selIdx, setSelIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [overrideCategoria, setOverrideCategoria] = useState<Categoria | null>(null)

  // Pack builder state
  const [modoBuilder, setModoBuilder] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [itemsNuevo, setItemsNuevo] = useState<{ sku: string; qty: number }[]>([])
  const [categoriaNuevo, setCategoriaNuevo] = useState<Categoria>('kit')

  useEffect(() => { if (!data) router.push('/') }, [data, router])

  useEffect(() => {
    Promise.all([
      fetch('/packs.json').then(r => r.json()),
      fetch('/componentes.json').then(r => r.json()),
    ]).then(([packsJson, catJson]: [PackData[], CatalogItem[]]) => {
      const vendidos = packsJson
        .filter(p => p.precio_venta && p.costo_real_bom > 0)
        .sort((a, b) => (b.precio_venta || 0) - (a.precio_venta || 0))
      setPacks(vendidos)
      setCatalogo(catJson)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { setOverrideCategoria(null) }, [selIdx])

  if (!data || loading) return null

  const pack = packs[Math.min(selIdx, packs.length - 1)]
  const categoriaDetectada = pack ? detectarCategoria(pack.componentes) : 'kit'
  const categoriaActiva = overrideCategoria || categoriaDetectada

  // Builder helpers
  const agregarItem = (sku: string) => {
    if (itemsNuevo.find(i => i.sku === sku)) return
    setItemsNuevo([...itemsNuevo, { sku, qty: 1 }])
  }
  const quitarItem = (sku: string) => setItemsNuevo(itemsNuevo.filter(i => i.sku !== sku))
  const cambiarQty = (sku: string, qty: number) => setItemsNuevo(itemsNuevo.map(i => i.sku === sku ? { ...i, qty } : i))

  const costoNuevo = itemsNuevo.reduce((sum, it) => {
    const cat = catalogo.find(c => c.sku === it.sku)
    return sum + (cat ? cat.costo * it.qty : 0)
  }, 0)

  useEffect(() => {
    const skusUnicos = new Set(itemsNuevo.map(i => i.sku))
    setCategoriaNuevo(skusUnicos.size <= 1 ? 'pack' : 'kit')
  }, [itemsNuevo])

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="text-indigo-600" size={20} />
            <h1 className="text-xl font-semibold text-gray-900">Packs y armador de precios</h1>
          </div>
          <p className="text-sm text-gray-500">Costo real desde receta (BOM) y precio sugerido en 3 escenarios</p>
        </div>
        <button
          onClick={() => setModoBuilder(!modoBuilder)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
        >
          {modoBuilder ? <X size={15} /> : <Wrench size={15} />}
          {modoBuilder ? 'Cerrar armador' : 'Armar pack nuevo'}
        </button>
      </div>

      {/* PACK BUILDER */}
      {modoBuilder && (
        <div className="bg-white border-2 border-indigo-200 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Arma tu pack seleccionando componentes</h2>

          <input
            value={nombreNuevo}
            onChange={e => setNombreNuevo(e.target.value)}
            placeholder="Nombre del pack (ej: Kit Verano Rasuradora + Nasal)"
            className="w-full mb-4 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Catalog selector */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Catálogo de componentes ({catalogo.length})</p>
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
                {catalogo.map(c => (
                  <button
                    key={c.sku}
                    onClick={() => agregarItem(c.sku)}
                    disabled={!!itemsNuevo.find(i => i.sku === c.sku)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="text-gray-700 truncate">{c.nombre}</span>
                    <span className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-gray-400">{fmt(c.costo)}</span>
                      <Plus size={12} className="text-indigo-500" />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected items */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Componentes seleccionados ({itemsNuevo.length})</p>
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100 min-h-[100px]">
                {itemsNuevo.length === 0 && (
                  <p className="text-xs text-gray-300 p-4 text-center">Selecciona componentes del catálogo</p>
                )}
                {itemsNuevo.map(it => {
                  const cat = catalogo.find(c => c.sku === it.sku)
                  return (
                    <div key={it.sku} className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-gray-700 truncate flex-1">{cat?.nombre}</span>
                      <input
                        type="number"
                        min={1}
                        value={it.qty}
                        onChange={e => cambiarQty(it.sku, +e.target.value || 1)}
                        className="w-12 px-1 py-0.5 text-center border border-gray-200 rounded mx-2"
                      />
                      <span className="text-gray-400 w-16 text-right">{fmt((cat?.costo || 0) * it.qty)}</span>
                      <button onClick={() => quitarItem(it.sku)} className="ml-2 text-gray-300 hover:text-red-500">
                        <X size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {itemsNuevo.length > 0 && (
            <>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                <span className="text-sm text-indigo-800">
                  Costo total del pack: <strong>{fmt(costoNuevo)}</strong>
                  {' '}· Clasificado como <strong>{categoriaNuevo === 'pack' ? 'Pack (multi-unidad)' : 'Kit (combo curado)'}</strong>
                </span>
              </div>
              <TierScenarios costo={costoNuevo} categoria={categoriaNuevo} onCategoriaChange={setCategoriaNuevo} showCategoriaToggle />
            </>
          )}
        </div>
      )}

      {/* EXISTING PACKS */}
      {!modoBuilder && packs.length > 0 && (
        <>
          <select
            value={selIdx}
            onChange={e => setSelIdx(+e.target.value)}
            className="w-full mb-5 px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {packs.map((p, i) => (
              <option key={p.sku_padre} value={i}>{p.nombre}</option>
            ))}
          </select>

          {pack && (
            <>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Costo real (BOM)</p>
                  <p className="text-lg font-semibold text-indigo-700">{fmt(pack.costo_real_bom)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Costo registrado</p>
                  <p className="text-lg font-semibold text-gray-900">{pack.costo_registrado ? fmt(pack.costo_registrado) : '—'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Precio actual de venta</p>
                  <p className="text-lg font-semibold text-gray-900">{pack.precio_venta ? fmt(pack.precio_venta) : '—'}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Escenarios de precio sugerido</h2>
                <TierScenarios
                  costo={pack.costo_real_bom}
                  categoria={categoriaActiva}
                  onCategoriaChange={setOverrideCategoria}
                  showCategoriaToggle
                />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Componentes ({pack.componentes.length})</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Componente</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Cantidad</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Costo unitario</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pack.componentes.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-900">{c.nombre}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{c.qty}×</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{c.costo_unit > 0 ? fmt(c.costo_unit) : 'sin dato'}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt(c.costo_unit * c.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Clasificación automática: si el pack repite el mismo SKU (multi-compra) se trata como &quot;Pack&quot;; si combina productos distintos, como &quot;Kit&quot;. Puedes corregirlo manualmente con el selector.
      </p>
    </div>
  )
}
