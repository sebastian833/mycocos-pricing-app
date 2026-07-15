'use client'

import { useState, useEffect, useCallback } from 'react'
import { useData } from '@/lib/context'
import { useRouter } from 'next/navigation'
import {
  CompetitorEntry, loadCompetitorsLocal, saveCompetitorsLocal,
  loadCompetitorsBase, resizeImage,
} from '@/lib/competitors'
import { Camera, Sparkles, Trash2, Download, TrendingUp, TrendingDown, Loader2, Check } from 'lucide-react'

function fmt(n: number) { return '$' + Math.round(n).toLocaleString('es-CL') }

export default function Competidores() {
  const { data } = useData()
  const router = useRouter()

  const [entries, setEntries] = useState<CompetitorEntry[]>([])
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  // Form state (post-analysis, editable)
  const [competidor, setCompetidor] = useState('')
  const [productoInterno, setProductoInterno] = useState('')
  const [productoDetectado, setProductoDetectado] = useState('')
  const [precioDetectado, setPrecioDetectado] = useState<number | ''>('')
  const [moneda, setMoneda] = useState('CLP')
  const [notas, setNotas] = useState('')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { if (!data) router.push('/') }, [data, router])

  useEffect(() => {
    async function init() {
      const base = await loadCompetitorsBase()
      const local = loadCompetitorsLocal()
      const merged = [...base]
      local.forEach(l => { if (!merged.find(m => m.id === l.id)) merged.push(l) })
      setEntries(merged)
    }
    init()
  }, [])

  const processImage = useCallback(async (file: File) => {
    setError('')
    setAnalyzing(true)
    try {
      const { base64, mimeType } = await resizeImage(file)
      setImagePreview(`data:${mimeType};base64,${base64}`)

      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      })
      const json = await res.json()

      if (json.error) {
        setError('Error al analizar: ' + json.error)
      } else {
        setProductoDetectado(json.producto || '')
        setPrecioDetectado(json.precio ?? '')
        setMoneda(json.moneda || 'CLP')
        setCompetidor(json.tienda || '')
        if (!json.precio) {
          setError('La IA no pudo leer el precio con claridad. Complétalo manualmente.')
        }
      }
      setShowForm(true)
    } catch (e: unknown) {
      setError('Error procesando la imagen: ' + (e instanceof Error ? e.message : 'desconocido'))
      setShowForm(true)
    } finally {
      setAnalyzing(false)
    }
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processImage(file)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processImage(file)
  }

  const guardar = () => {
    if (!competidor || !productoInterno || precioDetectado === '') return
    const entry: CompetitorEntry = {
      id: Date.now().toString(),
      fecha: new Date().toISOString().split('T')[0],
      competidor,
      productoInterno,
      productoDetectado,
      precioDetectado: Number(precioDetectado),
      moneda,
      notas,
    }
    const updated = [...entries, entry]
    setEntries(updated)
    saveCompetitorsLocal(updated)
    // reset form
    setImagePreview(null)
    setCompetidor('')
    setProductoInterno('')
    setProductoDetectado('')
    setPrecioDetectado('')
    setMoneda('CLP')
    setNotas('')
    setShowForm(false)
  }

  const eliminar = (id: string) => {
    const updated = entries.filter(e => e.id !== id)
    setEntries(updated)
    saveCompetitorsLocal(updated)
  }

  const exportar = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'competidores.json'
    a.click()
  }

  if (!data) return null

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Precios de la competencia</h1>
        <p className="text-sm text-gray-500">Sube una captura de pantalla y la IA lee el precio automáticamente</p>
      </div>

      {/* Upload zone */}
      {!showForm && (
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer mb-5 ${
            dragging ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-purple-300 hover:bg-gray-50'
          }`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => document.getElementById('imgInput')?.click()}
        >
          <input id="imgInput" type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          {analyzing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-purple-500" size={32} />
              <p className="text-sm text-gray-600">Analizando captura con IA...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Camera className="text-gray-400" size={32} />
              <div>
                <p className="font-medium text-gray-700">Sube o arrastra la captura de pantalla</p>
                <p className="text-sm text-gray-400 mt-1">Página de producto de la competencia con precio visible</p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Confirmation form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-purple-600" />
            <span className="text-sm font-medium text-gray-900">Confirma los datos detectados</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {imagePreview && (
              <div className="row-span-3">
                <img src={imagePreview} alt="Captura" className="w-full rounded-xl border border-gray-200" />
              </div>
            )}
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Competidor / tienda</label>
                <input value={competidor} onChange={e => setCompetidor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Producto interno (mapea al nuestro)</label>
                <select value={productoInterno} onChange={e => setProductoInterno(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200">
                  <option value="">Selecciona...</option>
                  {data.productos.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Producto detectado (texto libre)</label>
                <input value={productoDetectado} onChange={e => setProductoDetectado(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Precio detectado</label>
                <input type="number" value={precioDetectado} onChange={e => setPrecioDetectado(e.target.value ? +e.target.value : '')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Moneda</label>
                <select value={moneda} onChange={e => setMoneda(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200">
                  <option value="CLP">CLP</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Notas (opcional)</label>
                <input value={notas} onChange={e => setNotas(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200" />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={guardar} disabled={!competidor || !productoInterno || precioDetectado === ''}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 text-white text-sm font-medium rounded-lg transition-colors">
              <Check size={14} /> Guardar
            </button>
            <button onClick={() => { setShowForm(false); setImagePreview(null); setError('') }}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {entries.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">{entries.length} precios registrados</span>
            <button onClick={exportar} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
              <Download size={13} /> Exportar JSON
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Fecha','Competidor','Producto interno','Precio competencia','Nuestro precio','Diferencia','Notas',''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.slice().reverse().map(e => {
                  const nuestro = data.productos.find(p => p.nombre === e.productoInterno)
                  const nuestroPrecio = nuestro?.precio_bruto_avg || 0
                  const precioCompCLP = e.moneda === 'USD' ? e.precioDetectado * 950 : e.precioDetectado
                  const delta = nuestroPrecio > 0 ? ((nuestroPrecio - precioCompCLP) / precioCompCLP) * 100 : 0
                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{e.fecha}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">{e.competidor}</td>
                      <td className="px-3 py-2.5 text-gray-700 text-xs max-w-[180px] truncate">{e.productoInterno}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{e.moneda === 'USD' ? 'US$' : '$'}{e.precioDetectado.toLocaleString('es-CL')}</td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{nuestroPrecio ? fmt(nuestroPrecio) : '—'}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {nuestroPrecio > 0 && (
                          <span className={`flex items-center gap-1 text-xs font-medium ${delta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-gray-400 text-xs max-w-[150px] truncate">{e.notas}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => eliminar(e.id)} className="text-gray-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <p className="text-center text-sm text-gray-400 mt-8">Aún no hay precios de competencia registrados.</p>
      )}

      <p className="text-xs text-gray-400 mt-4">
        La diferencia % positiva (rojo) significa que estamos más caros que la competencia. Negativa (verde) significa que somos más baratos.
        Los datos se guardan en tu navegador — usa &quot;Exportar JSON&quot; y súbelo como <code>public/competidores.json</code> en el repo para compartirlo con el equipo.
      </p>
    </div>
  )
}
