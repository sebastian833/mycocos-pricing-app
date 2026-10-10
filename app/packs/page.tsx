'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/lib/context'
import { detectarCategoria, margenPorPrecio, type Categoria } from '@/lib/pricing-tiers'
import TierScenarios from '@/components/TierScenarios'
import { Package, Plus, X, Wrench, Trophy, List, Gift, AlertCircle, Plane, Search, Bookmark, Download, Upload, Trash2 } from 'lucide-react'
import { filtrarPorTexto } from '@/lib/search'
import { cargarPacks, eliminarPack, exportarPacks, importarPacks, type PackGuardado } from '@/lib/saved-packs'

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

type Modo = 'ganadores' | 'todos' | 'nuevo' | 'guardados'

export default function Packs() {
  const { data, marcaActual } = useData()
  const router = useRouter()
  const [modo, setModo] = useState<Modo>('ganadores')

  // Ganadores
  const [ganadores, setGanadores] = useState<PackGanador[]>([])
  const [selGanador, setSelGanador] = useState(0)
  const [costosManual, setCostosManual] = useState<Record<string, number>>({})
  const [costosAereo, setCostosAereo] = useState<Record<string, number>>({})
  const [expandido, setExpandido] = useState<string | null>(null)

  // Todos los packs
  const [packs, setPacks] = useState<PackData[]>([])
  const [selIdx, setSelIdx] = useState(0)
  const [overrideCategoria, setOverrideCategoria] = useState<Categoria | null>(null)

  // Catálogo (para armador)
  const [catalogo, setCatalogo] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)

  // Armador nuevo
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [itemsNuevo, setItemsNuevo] = useState<{ sku: string; qty: number }[]>([])
  const [categoriaNuevo, setCategoriaNuevo] = useState<Categoria>('kit')

  useEffect(() => { if (!data) router.push('/') }, [data, router])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(marcaActual.packsFile).then(r => r.json()).catch(() => []),
      fetch(marcaActual.componentesFile).then(r => r.json()).catch(() => []),
      fetch(marcaActual.packsGanadoresFile).then(r => r.json()).catch(() => []),
    ]).then(([packsJson, catJson, ganadoresJson]: [PackData[], CatalogItem[], PackGanador[]]) => {
      const vendidos = packsJson
        .filter(p => p.precio_venta && p.costo_real_bom > 0)
        .sort((a, b) => (b.precio_venta || 0) - (a.precio_venta || 0))
      setPacks(vendidos)
      setCatalogo(catJson)
      setGanadores(ganadoresJson)
      setSelGanador(0)
      setSelIdx(0)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [marcaActual])

  useEffect(() => { setOverrideCategoria(null) }, [selIdx])

  const [guardados, setGuardados] = useState<PackGuardado[]>([])
  const [msgImport, setMsgImport] = useState('')
  useEffect(() => { setGuardados(cargarPacks()) }, [])

  useEffect(() => {
    const skusUnicos = new Set(itemsNuevo.map(i => i.sku))
    setCategoriaNuevo(skusUnicos.size <= 1 ? 'pack' : 'kit')
  }, [itemsNuevo])

  if (!data || loading) return null

  const pack = packs[Math.min(selIdx, packs.length - 1)]
  const categoriaDetectada = pack ? detectarCategoria(pack.componentes) : 'kit'
  const categoriaActiva = overrideCategoria || categoriaDetectada
  const costoPackTodos = pack
    ? pack.componentes.reduce((sum, c) => sum + (c.costo_unit + (costosAereo[c.nombre] || 0)) * c.qty, 0)
    : 0

  const ganador = ganadores[Math.min(selGanador, ganadores.length - 1)]
  const costoGanador = ganador
    ? ganador.componentes.reduce((sum, c) => {
        const costoReal = c.costo ?? costosManual[c.nombre] ?? 0
        const extraAereo = costosAereo[c.nombre] || 0
        return sum + (costoReal + extraAereo) * c.qty
      }, 0)
    : 0
  const faltantes = ganador ? ganador.componentes.filter(c => c.costo === null && !costosManual[c.nombre]) : []

  // Solo ítems sueltos en el armador — sin kits/packs ya armados
  const catalogoSuelto = catalogo.filter(c => c.tipo !== 'PACKS MY COCOS')
  const catalogoFiltrado = filtrarPorTexto(catalogoSuelto, busqueda)

  // Builder helpers
  const agregarItem = (sku: string) => {
    if (itemsNuevo.find(i => i.sku === sku)) return
    setItemsNuevo([...itemsNuevo, { sku, qty: 1 }])
  }
  const quitarItem = (sku: string) => setItemsNuevo(itemsNuevo.filter(i => i.sku !== sku))
  const cambiarQty = (sku: string, qty: number) => setItemsNuevo(itemsNuevo.map(i => i.sku === sku ? { ...i, qty } : i))

  const costoNuevo = itemsNuevo.reduce((sum, it) => {
    const cat = catalogo.find(c => c.sku === it.sku)
    const extra = costosAereo[it.sku] || 0
    return sum + (cat ? (cat.costo + extra) * it.qty : 0)
  }, 0)

  const guardadosMarca = guardados.filter(g => g.marca === marcaActual.id)

  // Productos del armador en el formato que se guarda (con el costo aéreo de cada uno)
  const itemsGuardables = itemsNuevo.flatMap(it => {
    const cat = catalogoSuelto.find(c => c.sku === it.sku)
    return cat ? [{ sku: it.sku, nombre: cat.nombre, qty: it.qty, costoUnit: cat.costo, extraAereo: costosAereo[it.sku] || 0 }] : []
  })

  // Cuánto costaría hoy un pack guardado, con los costos actuales del catálogo
  const costoHoy = (g: PackGuardado) =>
    g.items.reduce((s, it) => {
      const c = catalogo.find(x => x.sku === it.sku)
      return s + ((c ? c.costo : it.costoUnit) + it.extraAereo) * it.qty
    }, 0) + g.regalos.reduce((s, r) => s + r.costo, 0)

  const onImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const n = await importarPacks(file)
      setGuardados(cargarPacks())
      setMsgImport(`Se importaron ${n} pack${n === 1 ? '' : 's'}.`)
    } catch (err) {
      setMsgImport('No pude leer ese archivo: ' + (err instanceof Error ? err.message : 'formato inválido'))
    }
    e.target.value = ''
  }

  const VISTA_TIERS = [
    { key: 'tier1' as const, nombre: 'Oferta Fuerte (Tier 1)', caja: 'bg-red-50 border-red-200', texto: 'text-red-700' },
    { key: 'tier2' as const, nombre: 'Oferta Media (Tier 2)', caja: 'bg-amber-50 border-amber-200', texto: 'text-amber-700' },
    { key: 'tier3' as const, nombre: 'Precio Normal (Tier 3)', caja: 'bg-green-50 border-green-200', texto: 'text-green-700' },
  ]

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
      <div className="flex bg-gray-100 rounded-xl p-1 mb-5 max-w-3xl">
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
        <button
          onClick={() => setModo('guardados')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${modo === 'guardados' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          <Bookmark size={14} /> Guardados{guardadosMarca.length > 0 ? ` (${guardadosMarca.length})` : ''}
        </button>
      </div>

      {/* ===== GANADORES ===== */}
      {modo === 'ganadores' && !ganador && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <Trophy className="text-gray-300 mx-auto mb-3" size={32} />
          <p className="font-medium text-gray-700 mb-1">Aún no hay packs cargados para {marcaActual.nombre}</p>
          <p className="text-sm text-gray-400">Usa &quot;Armar nuevo&quot; para simular combos con los ítems sueltos de esta marca.</p>
        </div>
      )}
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
                const key = c.nombre
                const abierto = expandido === key
                const extra = costosAereo[key] || 0
                const costoBase = c.costo ?? costosManual[key] ?? 0
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        {c.regalo && (
                          <span className="flex items-center gap-1 text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-medium">
                            <Gift size={11} /> Regalo
                          </span>
                        )}
                        <span className="text-sm text-gray-900">{c.nombre}</span>
                        {c.qty > 1 && <span className="text-xs text-gray-400">×{c.qty}</span>}
                        {extra > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-medium">
                            <Plane size={10} /> +{fmt(extra)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {sinCosto ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-amber-600">$</span>
                            <input
                              type="number"
                              placeholder="costo"
                              value={costosManual[key] || ''}
                              onChange={e => setCostosManual({ ...costosManual, [key]: +e.target.value || 0 })}
                              className="w-24 px-2 py-1 text-sm border border-amber-300 bg-amber-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">{fmt((costoBase + extra) * c.qty)}</span>
                        )}
                        <button
                          onClick={() => setExpandido(abierto ? null : key)}
                          className="text-gray-300 hover:text-sky-500 transition-colors"
                          title="Agregar costo aéreo u otro ajuste"
                        >
                          <Plane size={15} />
                        </button>
                      </div>
                    </div>
                    {abierto && (
                      <div className="px-4 pb-3 bg-sky-50">
                        <label className="block text-xs text-sky-700 mb-1.5">
                          Costo aéreo extra (o cualquier ajuste sobre el costo registrado ${fmt(costoBase)})
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-sky-600">+$</span>
                          <input
                            type="number"
                            value={extra || ''}
                            placeholder="0"
                            onChange={e => setCostosAereo({ ...costosAereo, [key]: +e.target.value || 0 })}
                            className="w-28 px-2 py-1 text-sm border border-sky-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
                          />
                          {extra > 0 && (
                            <button
                              onClick={() => { const c2 = { ...costosAereo }; delete c2[key]; setCostosAereo(c2) }}
                              className="text-xs text-sky-500 hover:text-red-500"
                            >
                              Quitar
                            </button>
                          )}
                        </div>
                      </div>
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
      {modo === 'todos' && packs.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <List className="text-gray-300 mx-auto mb-3" size={32} />
          <p className="font-medium text-gray-700 mb-1">Aún no hay historial de packs para {marcaActual.nombre}</p>
          <p className="text-sm text-gray-400">Usa &quot;Armar nuevo&quot; para simular combos con los ítems sueltos de esta marca.</p>
        </div>
      )}
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
              <p className="text-xs text-gray-500 mb-1">Último costo</p>
              <p className="text-lg font-semibold text-indigo-700">{fmt(costoPackTodos)}</p>
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
              costo={costoPackTodos}
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
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Último costo</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Subtotal</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">✈️</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pack.componentes.map((c, i) => {
                  const key = c.nombre
                  const abierto = expandido === key
                  const extra = costosAereo[key] || 0
                  return (
                    <>
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-900">
                          {c.nombre}
                          {extra > 0 && (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">
                              +{fmt(extra)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{c.qty}×</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{c.costo_unit > 0 ? fmt(c.costo_unit) : 'sin dato'}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt((c.costo_unit + extra) * c.qty)}</td>
                        <td className="px-4 py-2.5 text-center">
                          <button onClick={() => setExpandido(abierto ? null : key)} className="text-gray-300 hover:text-sky-500">
                            <Plane size={14} />
                          </button>
                        </td>
                      </tr>
                      {abierto && (
                        <tr className="bg-sky-50">
                          <td colSpan={5} className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-sky-700">Costo aéreo extra:</span>
                              <span className="text-xs text-sky-600">+$</span>
                              <input
                                type="number"
                                value={extra || ''}
                                placeholder="0"
                                onChange={e => setCostosAereo({ ...costosAereo, [key]: +e.target.value || 0 })}
                                className="w-28 px-2 py-1 text-sm border border-sky-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
                              />
                              {extra > 0 && (
                                <button
                                  onClick={() => { const c2 = { ...costosAereo }; delete c2[key]; setCostosAereo(c2) }}
                                  className="text-xs text-sky-500 hover:text-red-500"
                                >
                                  Quitar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===== ARMAR NUEVO ===== */}
      {modo === 'nuevo' && (
        <div className="bg-white border-2 border-indigo-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">1. Elige qué productos van en el pack</h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">
                Ítems sueltos ({busqueda.trim() ? `${catalogoFiltrado.length} de ${catalogoSuelto.length}` : catalogoSuelto.length})
              </p>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar producto (ej: rasuradora 4.0 + daily shaver)"
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                {busqueda && (
                  <button onClick={() => setBusqueda('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500" title="Borrar búsqueda">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
                {catalogoFiltrado.length === 0 && (
                  <p className="text-xs text-gray-400 p-4 text-center">No hay productos que calcen con esa búsqueda</p>
                )}
                {catalogoFiltrado.map(c => (
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
              <p className="text-xs text-gray-500 mb-2 flex justify-between pr-2">
                <span>Lo que ya agregaste ({itemsNuevo.length})</span>
                <span className="text-gray-400">% del costo</span>
              </p>
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100 min-h-[100px]">
                {itemsNuevo.length === 0 && (
                  <p className="text-xs text-gray-300 p-4 text-center">Selecciona productos de la lista</p>
                )}
                {itemsNuevo.map(it => {
                  const cat = catalogoSuelto.find(c => c.sku === it.sku)
                  const extra = costosAereo[it.sku] || 0
                  const subtotal = ((cat?.costo || 0) + extra) * it.qty
                  const pctDelTotal = costoNuevo > 0 ? (subtotal / costoNuevo) * 100 : 0
                  const abierto = expandido === it.sku
                  return (
                    <div key={it.sku}>
                      <div className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="text-gray-700 truncate flex-1">
                          {cat?.nombre}
                          {extra > 0 && (
                            <span className="ml-1.5 inline-flex items-center text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">
                              +{fmt(extra)}
                            </span>
                          )}
                        </span>
                        <input
                          type="number"
                          min={1}
                          value={it.qty}
                          onChange={e => cambiarQty(it.sku, +e.target.value || 1)}
                          className="w-12 px-1 py-0.5 text-center border border-gray-200 rounded mx-2"
                        />
                        <span className="text-gray-400 w-16 text-right">{fmt(subtotal)}</span>
                        <span className="text-indigo-400 w-12 text-right">{pctDelTotal.toFixed(0)}%</span>
                        <button
                          onClick={() => setExpandido(abierto ? null : it.sku)}
                          className="ml-2 text-gray-300 hover:text-sky-500"
                          title="Agregar costo aéreo u otro ajuste"
                        >
                          <Plane size={13} />
                        </button>
                        <button onClick={() => quitarItem(it.sku)} className="ml-1.5 text-gray-300 hover:text-red-500">
                          <X size={13} />
                        </button>
                      </div>
                      {abierto && (
                        <div className="px-3 pb-2 bg-sky-50">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-sky-700">Costo aéreo extra:</span>
                            <span className="text-[11px] text-sky-600">+$</span>
                            <input
                              type="number"
                              value={extra || ''}
                              placeholder="0"
                              onChange={e => setCostosAereo({ ...costosAereo, [it.sku]: +e.target.value || 0 })}
                              className="w-24 px-2 py-1 text-xs border border-sky-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200"
                            />
                            {extra > 0 && (
                              <button
                                onClick={() => { const c2 = { ...costosAereo }; delete c2[it.sku]; setCostosAereo(c2) }}
                                className="text-[11px] text-sky-500 hover:text-red-500"
                              >
                                Quitar
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-900 mb-1.5">
              2. Ponle un nombre <span className="font-normal text-gray-400">(lo necesitas para guardarlo)</span>
            </label>
            <input
              value={nombreNuevo}
              onChange={e => setNombreNuevo(e.target.value)}
              placeholder="Ej: Kit Verano"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {itemsNuevo.length > 0 && (
            <>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
                <span className="text-sm text-indigo-800">
                  {nombreNuevo.trim() && <><strong>{nombreNuevo.trim()}</strong>{' · '}</>}
                  Cuesta en total: <strong>{fmt(costoNuevo)}</strong>
                  {' '}· Es un <strong>{categoriaNuevo === 'pack' ? 'pack de unidades iguales' : 'combo de productos distintos'}</strong>
                </span>
              </div>
              <TierScenarios
                costo={costoNuevo}
                categoria={categoriaNuevo}
                onCategoriaChange={setCategoriaNuevo}
                showCategoriaToggle
                guardar={{ nombre: nombreNuevo, items: itemsGuardables, onGuardado: () => setGuardados(cargarPacks()) }}
              />
            </>
          )}
        </div>
      )}

      {/* ===== GUARDADOS ===== */}
      {modo === 'guardados' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <p className="text-sm text-gray-600">
              {guardadosMarca.length === 0
                ? `Todavía no hay packs guardados de ${marcaActual.nombre}`
                : `${guardadosMarca.length} pack${guardadosMarca.length === 1 ? '' : 's'} guardado${guardadosMarca.length === 1 ? '' : 's'} de ${marcaActual.nombre}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={exportarPacks}
                disabled={guardados.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                <Download size={13} /> Exportar
              </button>
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <Upload size={13} /> Importar
                <input type="file" accept=".json,application/json" className="hidden" onChange={onImportar} />
              </label>
            </div>
          </div>
          {msgImport && <p className="text-xs text-gray-500 mb-3">{msgImport}</p>}

          {guardadosMarca.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
              <Bookmark className="text-gray-300 mx-auto mb-3" size={32} />
              <p className="font-medium text-gray-700 mb-1">Aquí aparecen los packs que guardes</p>
              <p className="text-sm text-gray-400">Arma uno en «Armar nuevo» y usa «Guardar este pack» al final de la página.</p>
            </div>
          )}

          <div className="space-y-4">
            {guardadosMarca.map(g => {
              const ahora = costoHoy(g)
              const cambio = g.costoTotal > 0 && Math.abs(ahora - g.costoTotal) / g.costoTotal >= 0.01
              return (
                <div key={g.id} className="bg-white border border-gray-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-base font-semibold text-gray-900">{g.nombre}</p>
                      <p className="text-xs text-gray-400">
                        {g.categoria === 'pack' ? 'Pack de unidades iguales' : 'Combo de productos distintos'} · guardado el {new Date(g.actualizado).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                    <button
                      onClick={() => { if (confirm(`¿Eliminar "${g.nombre}"?`)) { eliminarPack(g.id); setGuardados(cargarPacks()) } }}
                      className="text-gray-300 hover:text-red-500"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="border border-gray-100 rounded-xl divide-y divide-gray-100 mb-3">
                    {g.items.map(it => (
                      <div key={it.sku} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-gray-800">
                          {it.qty > 1 ? `${it.qty}× ` : ''}{it.nombre}
                          {it.extraAereo > 0 && (
                            <span className="ml-2 text-[11px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">+{fmt(it.extraAereo)} aéreo</span>
                          )}
                        </span>
                        <span className="text-gray-500">{fmt((it.costoUnit + it.extraAereo) * it.qty)}</span>
                      </div>
                    ))}
                    {g.regalos.map(r => (
                      <div key={r.sku} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-gray-800">
                          <span className="inline-flex items-center gap-1 text-[11px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full font-medium mr-2">
                            <Gift size={10} /> Regalo
                          </span>
                          {r.nombre}
                        </span>
                        <span className="text-gray-500">{fmt(r.costo)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 mb-3">
                    <span className="text-sm text-gray-600">Costo total{g.regalos.length > 0 ? ' (con regalos)' : ''}</span>
                    <span className="text-base font-semibold text-gray-900">{fmt(g.costoTotal)}</span>
                  </div>

                  {cambio && (
                    <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 mb-3">
                      Los costos cambiaron desde que lo guardaste: hoy costaría {fmt(ahora)}. Los precios de abajo son los que guardaste.
                    </div>
                  )}

                  {g.precios && (
                    <div className="grid grid-cols-3 gap-3">
                      {VISTA_TIERS.map(t => {
                        const precio = g.precios![t.key]
                        return (
                          <div key={t.key} className={`border-2 rounded-xl p-3 ${t.caja}`}>
                            <p className={`text-xs font-semibold ${t.texto}`}>{t.nombre}</p>
                            <p className="text-xl font-bold text-gray-900">{fmt(precio)}</p>
                            <p className="text-xs text-gray-500">Ganas {margenPorPrecio(g.costoTotal, precio).toFixed(0)}%</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {g.precioUnico && (
                    <div className="flex items-center justify-between border-2 border-emerald-200 bg-emerald-50 rounded-xl p-4">
                      <div>
                        <p className="text-xs text-emerald-700">{g.precioUnico.etiqueta}</p>
                        <p className="text-2xl font-bold text-gray-900">{fmt(g.precioUnico.valor)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Ganas</p>
                        <p className="text-xl font-bold text-emerald-700">{margenPorPrecio(g.costoTotal, g.precioUnico.valor).toFixed(0)}%</p>
                        <p className="text-xs text-gray-500">= {fmt(Math.round(g.precioUnico.valor / 1.19) - g.costoTotal)} c/u</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Los packs guardados quedan en este navegador. Para pasarlos a otra persona o computador, usa Exportar y luego Importar.
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        &quot;Los que más venden&quot; son los combos actuales armados en Shopify. &quot;Todos los packs&quot; viene del historial de ventas y su receta. Puedes cambiar &quot;combo de productos distintos&quot; ↔ &quot;pack de unidades iguales&quot; con los botones si no calza.
      </p>
    </div>
  )
}
