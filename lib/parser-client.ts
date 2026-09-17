import * as XLSX from 'xlsx'
import type { ParsedData, ProductData, ProductMonth, StoreSummary } from '@/types'

export async function parseShopyLibreFile(buffer: ArrayBuffer): Promise<ParsedData> {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: null })
  const ventas = raw.filter((r) => String(r['Tipo Movimiento'] ?? '').toLowerCase() === 'venta')
  const withDate = ventas.map((r) => {
    const fechaStr = String(r['Fecha de Emisión'] ?? '')
    const parts = fechaStr.split('/')
    let mes = 0, año = 0
    if (parts.length === 3) { mes = parseInt(parts[1]); año = parseInt(parts[2]) }
    return { ...r, _mes: mes, _año: año } as Record<string, unknown> & { _mes: number; _año: number }
  })
  const años = [...new Set(withDate.map((r) => r._año))].filter(Boolean).sort() as number[]
  const tiendas = [...new Set(withDate.map((r) => String((r as Record<string, unknown>)['Sucursal'] ?? '')))]
  const latestYear = Math.max(...años)
  const prevYear = latestYear - 1
  const latestRows = withDate.filter((r) => r._año === latestYear)
  const prodVolMap: Record<string, number> = {}
  latestRows.forEach((r) => {
    const prod = String(r['Producto / Servicio'] ?? '')
    if (prod && prod !== 'Glosa') prodVolMap[prod] = (prodVolMap[prod] || 0) + (Number(r['Cantidad']) || 0)
  })
  const topProds = Object.entries(prodVolMap).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name]) => name)
  const median = (arr: number[]) => { const s = [...arr].sort((a,b)=>a-b); const mid=Math.floor(s.length/2); return s.length%2===0?(s[mid-1]+s[mid])/2:s[mid] }
  const mean = (arr: number[]) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0
  const productos: ProductData[] = topProds.map((prodName) => {
    const prodRowsLatest = withDate.filter((r) => String(r['Producto / Servicio'] ?? '') === prodName && r._año === latestYear)
    const prodRowsPrev = withDate.filter((r) => String(r['Producto / Servicio'] ?? '') === prodName && r._año === prevYear)
    const tipo = prodRowsLatest[0]?.['Tipo de Producto / Servicio'] ? String(prodRowsLatest[0]['Tipo de Producto / Servicio']) : 'Otro'
    const meses: ProductMonth[] = []
    for (let m = 1; m <= 12; m++) {
      const rowsM = prodRowsLatest.filter((r) => r._mes === m)
      const rowsP = prodRowsPrev.filter((r) => r._mes === m)
      if (rowsM.length === 0) { meses.push({ mes: m, pb25: 0, pl25: 0, pn25: 0, c25: 0, d25: 0, q25: 0, mg25: 0 }); continue }
      const pb25 = Math.round(median(rowsM.map((r) => Number(r['Precio Bruto Unitario'])||0).filter(Boolean)))
      const pl25 = Math.round(median(rowsM.map((r) => Number(r['Precio de Lista'])||0).filter(Boolean)))
      const pn25 = Math.round(median(rowsM.map((r) => Number(r['Precio Neto Unitario'])||0).filter(Boolean)))
      const c25  = Math.round(median(rowsM.map((r) => Number(r['Costo neto unitario'])||0).filter(Boolean)))
      const rawD = mean(rowsM.map((r) => Number(r['% Descuento'])||0))
      const d25  = parseFloat((rawD<=1?rawD*100:rawD).toFixed(1))
      const q25  = rowsM.reduce((s,r)=>s+(Number(r['Cantidad'])||0),0)
      const mg25 = pn25>0?parseFloat(((pn25-c25)/pn25*100).toFixed(1)):0
      const pb24 = rowsP.length>0?Math.round(median(rowsP.map((r)=>Number(r['Precio Bruto Unitario'])||0).filter(Boolean))):undefined
      const q24  = rowsP.length>0?rowsP.reduce((s,r)=>s+(Number(r['Cantidad'])||0),0):undefined
      meses.push({ mes: m, pb25, pl25, pn25, c25, d25, q25, mg25, pb24, q24 })
    }
    const costo_avg = Math.round(mean(prodRowsLatest.map((r)=>Number(r['Costo neto unitario'])||0).filter(Boolean)))
    const precio_bruto_avg = Math.round(mean(prodRowsLatest.map((r)=>Number(r['Precio Bruto Unitario'])||0)))
    const precio_lista_avg = Math.round(mean(prodRowsLatest.map((r)=>Number(r['Precio de Lista'])||0)))
    const pnAvg = mean(prodRowsLatest.map((r)=>Number(r['Precio Neto Unitario'])||0).filter(Boolean))
    const costoAvg = mean(prodRowsLatest.map((r)=>Number(r['Costo neto unitario'])||0).filter(Boolean))
    const margen_avg = pnAvg>0?parseFloat(((pnAvg-costoAvg)/pnAvg*100).toFixed(1)):0
    const volumen_total = meses.reduce((s,m)=>s+m.q25,0)
    const venta_bruta_total = prodRowsLatest.reduce((s,r)=>s+(Number(r['Venta Total Bruta'])||0),0)
    return { nombre: prodName, tipo, meses, costo_avg, precio_bruto_avg, precio_lista_avg, margen_avg, volumen_total, venta_bruta_total }
  })
  const resumen: StoreSummary[] = años.map((año) => {
    const rows = withDate.filter((r) => r._año === año)
    return { año, ventas_brutas: rows.reduce((s,r)=>s+(Number(r['Venta Total Bruta'])||0),0), ventas_netas: rows.reduce((s,r)=>s+(Number(r['Venta Total Neta'])||0),0), unidades: rows.reduce((s,r)=>s+(Number(r['Cantidad'])||0),0), margen_total: rows.reduce((s,r)=>s+(Number(r['Margen'])||0),0), num_skus: new Set(rows.map((r)=>String(r['Producto / Servicio']??''))).size }
  })
  const MESES_N=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const TEMP=['Año nuevo','Verano','Vuelta clases','Otoño','Día Mamá','CyberDay','Invierno','Invierno','Fiestas Patrias','Pre HotSale','HotSale','Navidad/CyberMonday']
  const fmt=(n:number)=>`$${Math.round(n).toLocaleString('es-CL')} CLP`
  const fmtM=(n:number)=>`$${(n/1e6).toFixed(1)}M CLP`
  const latestS=resumen.find(r=>r.año===latestYear)
  const prevS=resumen.find(r=>r.año===prevYear)
  let raw_context=`CONTEXTO DE VENTAS MYCOCOS - SHOPYLIBRE CHILE\n\n`
  if(latestS) raw_context+=`RESUMEN ${latestYear}:\n- Ventas brutas: ${fmtM(latestS.ventas_brutas)}\n- Unidades: ${latestS.unidades.toLocaleString()}\n- Margen total: ${fmtM(latestS.margen_total)}\n- SKUs: ${latestS.num_skus}\n\n`
  if(prevS) raw_context+=`RESUMEN ${prevYear}:\n- Ventas brutas: ${fmtM(prevS.ventas_brutas)}\n- Unidades: ${prevS.unidades.toLocaleString()}\n\n`
  raw_context+=`TOP PRODUCTOS (${latestYear}):\n\n`
  productos.slice(0,15).forEach((p)=>{
    raw_context+=`Producto: ${p.nombre}\n  Tipo: ${p.tipo} | Costo: ${fmt(p.costo_avg)} | Margen: ${p.margen_avg}% | Vol: ${p.volumen_total.toLocaleString()} un.\n`
    p.meses.forEach((m)=>{ if(m.q25>0) raw_context+=`  ${MESES_N[m.mes-1]} (${TEMP[m.mes-1]}): bruto ${fmt(m.pb25)}, lista ${fmt(m.pl25)}, dcto ${m.d25}%, margen ${m.mg25}%, vol ${m.q25} un.\n` })
    raw_context+='\n'
  })
  return { productos, resumen, años, tiendas, raw_context }
}
