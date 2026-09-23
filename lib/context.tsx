'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ParsedData } from '@/types'
import { BRANDS, getBrand, MARCA_STORAGE_KEY, type MarcaId, type Brand } from '@/lib/brands'

interface DataContextType {
  data: ParsedData | null
  setData: (d: ParsedData | null) => void
  fileName: string
  setFileName: (n: string) => void
  loading: boolean
  marca: MarcaId
  setMarca: (m: MarcaId) => void
  marcaActual: Brand
  tieneDatos: boolean
}

const DataContext = createContext<DataContextType>({
  data: null,
  setData: () => {},
  fileName: '',
  setFileName: () => {},
  loading: true,
  marca: 'mycocos',
  setMarca: () => {},
  marcaActual: BRANDS[0],
  tieneDatos: false,
})

const MONEDA_POR_PAIS: Record<string, { code: string; locale: string }> = {
  'Chile': { code: 'CLP', locale: 'es-CL' },
  'Colombia': { code: 'COP', locale: 'es-CO' },
  'México': { code: 'MXN', locale: 'es-MX' },
}

function buildContext(d: ParsedData, nombreMarca: string, pais: string): string {
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const TEMP = ['Año nuevo','Verano','Vuelta clases','Otoño','Día Mamá','CyberDay','Invierno','Invierno','Fiestas Patrias','Pre HotSale','HotSale','Navidad/CyberMonday']
  const moneda = MONEDA_POR_PAIS[pais] || MONEDA_POR_PAIS['Chile']
  const fmt = (n: number) => `$${Math.round(n).toLocaleString(moneda.locale)} ${moneda.code}`
  const fmtM = (n: number) => `$${(n / 1e6).toFixed(1)}M ${moneda.code}`
  let ctx = `CONTEXTO DE VENTAS ${nombreMarca.toUpperCase()} (${pais}) — moneda: ${moneda.code}\n\n`
  d.resumen.forEach(r => {
    ctx += `RESUMEN ${r.año}:\n- Ventas brutas: ${fmtM(r.ventas_brutas)}\n- Unidades: ${r.unidades.toLocaleString()}\n- Margen total: ${fmtM(r.margen_total)}\n- SKUs: ${r.num_skus}\n\n`
  })
  ctx += `TOP PRODUCTOS:\n\n`
  d.productos.slice(0, 15).forEach(p => {
    ctx += `Producto: ${p.nombre}\n  Tipo: ${p.tipo} | Costo: ${fmt(p.costo_avg)} | Margen: ${p.margen_avg}% | Vol: ${p.volumen_total.toLocaleString()} un.\n`
    p.meses.forEach(m => {
      if (m.q25 > 0) {
        ctx += `  ${MESES[m.mes-1]} (${TEMP[m.mes-1]}): bruto ${fmt(m.pb25)}, lista ${fmt(m.pl25)}, dcto ${m.d25}%, margen ${m.mg25}%, vol ${m.q25} un.\n`
      }
    })
    ctx += '\n'
  })
  return ctx
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ParsedData | null>(null)
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(true)
  const [marca, setMarcaState] = useState<MarcaId>('mycocos')

  const marcaActual = getBrand(marca)

  // Cargar la marca guardada en el navegador al iniciar
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(MARCA_STORAGE_KEY) : null
    if (saved && BRANDS.find(b => b.id === saved)) {
      setMarcaState(saved as MarcaId)
    }
  }, [])

  const setMarca = useCallback((m: MarcaId) => {
    setMarcaState(m)
    if (typeof window !== 'undefined') localStorage.setItem(MARCA_STORAGE_KEY, m)
  }, [])

  // Cargar los datos precargados de la marca activa cada vez que cambie
  useEffect(() => {
    setLoading(true)
    setData(null)
    fetch(marcaActual.dataFile)
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (json && json.productos && json.productos.length > 0) {
          const parsed: ParsedData = { ...json, raw_context: buildContext(json, marcaActual.nombre, marcaActual.pais) }
          setData(parsed)
          setFileName(`${marcaActual.nombre} — datos precargados`)
        } else {
          setData(null)
          setFileName('')
        }
      })
      .catch(() => { setData(null); setFileName('') })
      .finally(() => setLoading(false))
  }, [marcaActual])

  return (
    <DataContext.Provider value={{
      data, setData, fileName, setFileName, loading,
      marca, setMarca, marcaActual,
      tieneDatos: !!data && data.productos.length > 0,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
