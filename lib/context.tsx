'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ParsedData } from '@/types'

interface DataContextType {
  data: ParsedData | null
  setData: (d: ParsedData | null) => void
  fileName: string
  setFileName: (n: string) => void
  loading: boolean
}

const DataContext = createContext<DataContextType>({
  data: null,
  setData: () => {},
  fileName: '',
  setFileName: () => {},
  loading: true,
})

// Build chat context text from preloaded data
function buildContext(d: ParsedData): string {
  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const TEMP = ['Año nuevo','Verano','Vuelta clases','Otoño','Día Mamá','CyberDay','Invierno','Invierno','Fiestas Patrias','Pre HotSale','HotSale','Navidad/CyberMonday']
  const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CL')} CLP`
  const fmtM = (n: number) => `$${(n / 1e6).toFixed(1)}M CLP`
  let ctx = `CONTEXTO DE VENTAS MYCOCOS - SHOPYLIBRE CHILE\n\n`
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

  // Auto-load preloaded data from /data.json on mount
  useEffect(() => {
    fetch('/data.json')
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (json && json.productos && json.productos.length > 0) {
          const parsed: ParsedData = { ...json, raw_context: buildContext(json) }
          setData(parsed)
          setFileName('Datos precargados 2024-2025')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <DataContext.Provider value={{ data, setData, fileName, setFileName, loading }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
