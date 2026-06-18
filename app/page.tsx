'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useData } from '@/lib/context'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, TrendingUp, BarChart2, Sliders, MessageCircle } from 'lucide-react'

export default function Home() {
  const { data, setData, setFileName } = useData()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const router = useRouter()

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Por favor sube un archivo .xlsx o .xls')
      return
    }
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/parse', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Error procesando el archivo')
      const parsed = await res.json()
      setData(parsed)
      setFileName(file.name)
    } catch {
      setError('No se pudo procesar el archivo. Asegúrate de que sea un reporte de ShopyLibre.')
    } finally {
      setLoading(false)
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-4">
          <TrendingUp className="text-blue-600" size={28} />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">MyCOCOS Pricing Dashboard</h1>
        <p className="text-gray-500 text-sm">Sube el reporte de ventas de ShopyLibre para comenzar el análisis</p>
      </div>

      {!data ? (
        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
            dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <input id="fileInput" type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-600 text-sm">Procesando archivo...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <FileSpreadsheet className="text-gray-400" size={40} />
              <div>
                <p className="font-medium text-gray-700">Arrastra tu archivo aquí</p>
                <p className="text-sm text-gray-400 mt-1">o haz clic para seleccionarlo</p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                Reporte de ventas ShopyLibre (.xlsx)
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle className="text-green-500" size={22} />
            <div>
              <p className="font-medium text-gray-900">Archivo cargado exitosamente</p>
              <p className="text-sm text-gray-500">
                {data.resumen.map(r => `${r.año}: ${r.unidades.toLocaleString()} unidades`).join(' · ')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {data.resumen.map(r => (
              <div key={r.año} className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{r.año}</p>
                <p className="text-xl font-semibold text-gray-900">${(r.ventas_brutas / 1e6).toFixed(1)}M</p>
                <p className="text-xs text-gray-400">{r.unidades.toLocaleString()} unidades</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            <button onClick={() => router.push('/informe')} className="flex flex-col items-center gap-1.5 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
              <BarChart2 className="text-blue-600" size={20} />
              <span className="text-xs font-medium text-blue-700">Ver Informe</span>
            </button>
            <button onClick={() => router.push('/simulador')} className="flex flex-col items-center gap-1.5 p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors">
              <Sliders className="text-green-600" size={20} />
              <span className="text-xs font-medium text-green-700">Simulador</span>
            </button>
            <button onClick={() => router.push('/chat')} className="flex flex-col items-center gap-1.5 p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors">
              <MessageCircle className="text-purple-600" size={20} />
              <span className="text-xs font-medium text-purple-700">Chat IA</span>
            </button>
          </div>

          <button
            onClick={() => { setData(null); setFileName('') }}
            className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cargar otro archivo
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {!data && (
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: BarChart2, title: 'Informe de precios', desc: 'Evolución mes a mes y temporadas' },
            { icon: Sliders, title: 'Simulador', desc: 'Precio nacional e internacional' },
            { icon: MessageCircle, title: 'Chat IA', desc: 'Consultas sobre tus datos' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-gray-200 rounded-xl p-4">
              <Icon className="text-gray-400 mx-auto mb-2" size={22} />
              <p className="text-sm font-medium text-gray-700">{title}</p>
              <p className="text-xs text-gray-400 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
