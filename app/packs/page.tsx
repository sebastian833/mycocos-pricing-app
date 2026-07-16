'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/lib/context'
import { detectarCategoria, type Categoria } from '@/lib/pricing-tiers'
import TierScenarios from '@/components/TierScenarios'
import { Package, Plus, X, Wrench, Trophy, List, Gift, AlertCircle } from 'lucide-react'

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
interface GanadorComponente { nombre: string; qty: number; costo: number | null; regalo: boolean }
interface PackGanador { nombre: string; componentes: GanadorComponente[] }

function fmt(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }

type Modo = 'ganadores' | 'todos' | 'nuevo'

export default function Packs() {
  const { data } = useData()
  const router = useRouter()
  const [modo, setModo] = useState<Modo>('ganadores')

  // Ganadores
  const [ganadores, setGanadores] = useState<PackGanador[]>([])
  const [selGanador, setSelGanador] = useState(0)
  const [costosManual, setCostosManual] = useState<Record<string, number>>({})

  // Todos los packs
  const [packs, setPacks] = useState<PackData[]>([])
  const [selIdx, setSelIdx] = useState(0)
  const [overrideCategoria, setOverrideCategoria] = useState<Categoria | null>(null)

  // Catálogo (para armador)
  const [catalogo, setCatalogo] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)

  // Armador nuevo
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [itemsNuevo, setItemsNuevo] = useState<{ sku: string; qty: number }[]>([])
  const [categoriaNuevo, setCategoriaNuevo] = useState<Categoria>('kit')

  useEffect(() => { if (!data) router.push('/') }, [data, router])

  useEffect(() => {
    Promise.all([
      fetch('/packs.json').then(r => r.json()),
      fetch('/componentes.json').then(r => r.json()),
      fetch('/packs-ganadores.json').then(r => r.json()),
    ]).then(([packsJson, catJson, ganadoresJson]: [PackData[], CatalogItem[], PackGanador[]]) => {
      const vendidos = packsJson
        .filter(p => p.precio_venta && p.costo_real_bom > 0)
        .sort((a, b) => (b.precio_venta || 0) - (a.precio_venta || 0))
      setPacks(vendidos)
      setCatalogo(catJson)
      setGanadores(ganadoresJson)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => { setOverrideCategoria(null) }, [selIdx])

  useEffect(() => {
    const skusUnicos = new Set(itemsNuevo.map(i => i.sku))
    setCategoriaNuevo(skusUnicos.size <= 1 ? 'pack' : 'kit')
  }, [itemsNuevo])

  if (!data || loading) return null

  const pack = packs[Math.min(selIdx, packs.length - 1)]
  const categoriaDetectada = pack ? detectarCategoria(pack.componentes) : 'kit'
  const categoriaActiva = overrideCategoria || categoriaDetectada

  const ganador = ganadores[Math.min(selGanador, ganadores.length - 1)]
  const costoGanador = ganador
    ? ganador.componentes.reduce((sum, c) => {
        const costoReal = c.costo ?? costosManual[c.nombre] ?? 0
        return sum + costoReal * c.qty
      }, 0)
    : 0
  const faltantes = ganador ? ganador.componentes.filter(c => c.costo === null && !costosManual[c.nombre]) : []

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

  return (
    <div>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Package className="text-indigo-600" size={20} />
          <h1 className="text-xl font-semibold text-gray-900">Packs y combos</h1>
        </div>
        <p className="text-sm text-gray-500">Revisa los combos que más se venden y arma otros nuevos</p>
      </div>

      {/* Selector de modo */}
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5 max-w-xl">
        <button
          onClick={() => setModo('ganadores')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${modo === 'ganadores' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          <Trophy size={14} /> Los que más venden
        </button>
        <button
          onClick={() => setModo('todos')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${modo === 'todos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          <List size={14} /> Todos los packs
        </button>
        <button
          onClick={() => setModo('nuevo')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${modo === 'nuevo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          <Wrench size={14} /> Armar nuevo
        </button>
      </div>

      {/* ===== GANADORES ===== */}
      {modo === 'ganadores' && ganador && (
        <>
          <select
            value={selGanador}
            onChange={e => setSelGanador(+e.target.value)}
            className="w-full mb-5 px-3 py-2.5 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {ganadores.map((g, i) => (
              <option key={g.nombre} value={i}>{g.nombre}</option>
            ))}
          </select>

          {faltantes.length > 0 && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-medium text-amber-800">Faltan algunos costos para calcular el total exacto</p>
                <p className="text-xs text-amber-700 mt-1">Escríbelos abajo en la lista de productos (están marcados en amarillo).</p>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-5">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">Qué trae este pack</span>
            </div>
            <div className="divide-y divide-gray-100">
              {ganador.componentes.map((c, i) => {
                const sinCosto = c.costo === null
                return (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      {c.regalo && (
                        <span className="flex items-center gap-1 text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-medium">
                          <Gift size={11} /> Regalo
                        </span>
                      )}
                      <span className="text-sm text-gray-900">{c.nombre}</span>
                      {c.qty > 1 && <span className="text-xs text-gray-400">×{c.qty}</span>}
                    </div>
                    {sinCosto ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-amber-600">$</span>
                        <input
                          type="number"
                          placeholder="costo"
                          value={costosManual[c.nombre] || ''}
                          onChange={e => setCostosManual({ ...costosManual, [c.nombre]: +e.target.value || 0 })}
                          className="w-24 px-2 py-1 text-sm border border-amber-300 bg-amber-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">{fmt((c.costo || 0) * c.qty)}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">¿A qué precio venderlo?</h2>
            <TierScenarios costo={costoGanador} categoria="kit" />
          </div>
        </>
      )}

      {/* ===== TODOS LOS PACKS ===== */}
      {modo === 'todos' && packs.length > 0 && pack && (
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

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Lo que cuesta hacerlo</p>
              <p className="text-lg font-semibold text-indigo-700">{fmt(pack.costo_real_bom)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Lo que dice el sistema</p>
              <p className="text-lg font-semibold text-gray-900">{pack.costo_registrado ? fmt(pack.costo_registrado) : '—'}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Precio actual de venta</p>
              <p className="text-lg font-semibold text-gray-900">{pack.precio_venta ? fmt(pack.precio_venta) : '—'}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">¿A qué precio venderlo?</h2>
            <TierScenarios
              costo={pack.costo_real_bom}
              categoria={categoriaActiva}
              onCategoriaChange={setOverrideCategoria}
              showCategoriaToggle
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">Qué trae este pack ({pack.componentes.length})</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Producto</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Cantidad</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Cuánto cuesta</th>
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

      {/* ===== ARMAR NUEVO ===== */}
      {modo === 'nuevo' && (
        <div className="bg-white border-2 border-indigo-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Elige qué productos van en el pack</h2>

          <input
            value={nombreNuevo}
            onChange={e => setNombreNuevo(e.target.value)}
            placeholder="Nombre del pack (ej: Kit Verano Rasuradora + Nasal)"
            className="w-full mb-4 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">Todos los productos ({catalogo.length})</p>
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

            <div>
              <p className="text-xs text-gray-500 mb-2">Lo que ya agregaste ({itemsNuevo.length})</p>
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100 min-h-[100px]">
                {itemsNuevo.length === 0 && (
                  <p className="text-xs text-gray-300 p-4 text-center">Selecciona productos de la lista</p>
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
                  Cuesta en total: <strong>{fmt(costoNuevo)}</strong>
                  {' '}· Es un <strong>{categoriaNuevo === 'pack' ? 'pack de unidades iguales' : 'combo de productos distintos'}</strong>
                </span>
              </div>
              <TierScenarios costo={costoNuevo} categoria={categoriaNuevo} onCategoriaChange={setCategoriaNuevo} showCategoriaToggle />
            </>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        &quot;Los que más venden&quot; son los combos actuales armados en Shopify. &quot;Todos los packs&quot; viene del historial de ventas y su receta. Puedes cambiar &quot;combo de productos distintos&quot; ↔ &quot;pack de unidades iguales&quot; con los botones si no calza.
      </p>
    </div>
  )
}
