import * as XLSX from 'xlsx'
import type { ParsedData, ProductData, ProductMonth, StoreSummary } from '@/types'

const MESES_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export function parseShopyLibreFile(buffer: ArrayBuffer): ParsedData {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: null })

  // Filter only ventas
  const ventas = raw.filter((r) => String(r['Tipo Movimiento'] ?? '').toLowerCase() === 'venta')

  // Parse dates
  const withDate = ventas.map((r: Record<string, unknown>) => {
    const fechaStr = String(r['Fecha de Emisión'] ?? '')
    const parts = fechaStr.split('/')
    let mes = 0
    let año = 0
    if (parts.length === 3) {
      mes = parseInt(parts[1])
      año = parseInt(parts[2])
    }
    return { ...r, _mes: mes, _año: año } as Record<string, unknown> & { _mes: number; _año: number }
  })

  const años = [...new Set(withDate.map((r) => r._año))].filter(Boolean).sort() as number[]
  const tiendas = [...new Set(withDate.map((r) => String((r as Record<string, unknown>)['Sucursal'] ?? '')))]

  // Get top products by volume for the latest year
  const latestYear = Math.max(...años)
  const prevYear = latestYear - 1

  const latestRows = withDate.filter((r) => r._año === latestYear)

  // Group by product
  const prodVolMap: Record<string, number> = {}
  latestRows.forEach((r) => {
    const prod = String(r['Producto / Servicio'] ?? '')
    if (prod && prod !== 'Glosa') {
      prodVolMap[prod] = (prodVolMap[prod] || 0) + (Number(r['Cantidad']) || 0)
    }
  })

  // Top 20 products
  const topProds = Object.entries(prodVolMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name]) => name)

  const productos: ProductData[] = topProds.map((prodName) => {
    const prodRowsLatest = withDate.filter(
      (r) => String(r['Producto / Servicio'] ?? '') === prodName && r._año === latestYear
    )
    const prodRowsPrev = withDate.filter(
      (r) => String(r['Producto / Servicio'] ?? '') === prodName && r._año === prevYear
    )

    const tipo =
      prodRowsLatest[0]?.['Tipo de Producto / Servicio']
        ? String(prodRowsLatest[0]['Tipo de Producto / Servicio'])
        : 'Otro'

    const meses: ProductMonth[] = []

    for (let m = 1; m <= 12; m++) {
      const rowsM = prodRowsLatest.filter((r) => r._mes === m)
      const rowsP = prodRowsPrev.filter((r) => r._mes === m)

      if (rowsM.length === 0) {
        meses.push({ mes: m, pb25: 0, pl25: 0, pn25: 0, c25: 0, d25: 0, q25: 0, mg25: 0 })
        continue
      }

      const median = (arr: number[]) => {
        const s = [...arr].sort((a, b) => a - b)
        const mid = Math.floor(s.length / 2)
        return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid]
      }
      const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length

      const pb25 = Math.round(median(rowsM.map((r) => Number(r['Precio Bruto Unitario']) || 0).filter(Boolean)))
      const pl25 = Math.round(median(rowsM.map((r) => Number(r['Precio de Lista']) || 0).filter(Boolean)))
      const pn25 = Math.round(median(rowsM.map((r) => Number(r['Precio Neto Unitario']) || 0).filter(Boolean)))
      const c25 = Math.round(median(rowsM.map((r) => Number(r['Costo neto unitario']) || 0).filter(Boolean)))
      const rawD25 = mean(rowsM.map((r) => Number(r['% Descuento']) || 0))
      const d25 = parseFloat((rawD25 <= 1 ? rawD25 * 100 : rawD25).toFixed(1))
      const q25 = rowsM.reduce((s, r) => s + (Number(r['Cantidad']) || 0), 0)
      const mg25 = pn25 > 0 ? parseFloat(((pn25 - c25) / pn25 * 100).toFixed(1)) : 0

      const pb24 =
        rowsP.length > 0
          ? Math.round(median(rowsP.map((r) => Number(r['Precio Bruto Unitario']) || 0).filter(Boolean)))
          : undefined
      const q24 =
        rowsP.length > 0
          ? rowsP.reduce((s, r) => s + (Number(r['Cantidad']) || 0), 0)
          : undefined

      meses.push({ mes: m, pb25, pl25, pn25, c25, d25, q25, mg25, pb24, q24 })
    }

    const allRows = prodRowsLatest
    const costo_avg = Math.round(
      allRows.map((r) => Number(r['Costo neto unitario']) || 0).filter(Boolean).reduce((a, b) => a + b, 0) /
        allRows.filter((r) => Number(r['Costo neto unitario'])).length || 1
    )
    const precio_bruto_avg = Math.round(
      allRows.map((r) => Number(r['Precio Bruto Unitario']) || 0).reduce((a, b) => a + b, 0) / allRows.length
    )
    const precio_lista_avg = Math.round(
      allRows.map((r) => Number(r['Precio de Lista']) || 0).reduce((a, b) => a + b, 0) / allRows.length
    )
    const pnArr = allRows.map((r) => Number(r['Precio Neto Unitario']) || 0).filter(Boolean)
    const costoArr = allRows.map((r) => Number(r['Costo neto unitario']) || 0).filter(Boolean)
    const pnAvg = pnArr.reduce((a, b) => a + b, 0) / (pnArr.length || 1)
    const costoAvg2 = costoArr.reduce((a, b) => a + b, 0) / (costoArr.length || 1)
    const margen_avg = pnAvg > 0 ? parseFloat(((pnAvg - costoAvg2) / pnAvg * 100).toFixed(1)) : 0
    const volumen_total = meses.reduce((s, m) => s + m.q25, 0)
    const venta_bruta_total = allRows.reduce((s, r) => s + (Number(r['Venta Total Bruta']) || 0), 0)

    return {
      nombre: prodName,
      tipo,
      meses,
      costo_avg,
      precio_bruto_avg,
      precio_lista_avg,
      margen_avg,
      volumen_total,
      venta_bruta_total,
    }
  })

  // Summary per year
  const resumen: StoreSummary[] = años.map((año) => {
    const rows = withDate.filter((r) => r._año === año)
    return {
      año,
      ventas_brutas: rows.reduce((s, r) => s + (Number(r['Venta Total Bruta']) || 0), 0),
      ventas_netas: rows.reduce((s, r) => s + (Number(r['Venta Total Neta']) || 0), 0),
      unidades: rows.reduce((s, r) => s + (Number(r['Cantidad']) || 0), 0),
      margen_total: rows.reduce((s, r) => s + (Number(r['Margen']) || 0), 0),
      num_skus: new Set(rows.map((r) => String(r['Producto / Servicio'] ?? ''))).size,
    }
  })

  // Build text context for chat
  const latestSummary = resumen.find((r) => r.año === latestYear)
  const prevSummary = resumen.find((r) => r.año === prevYear)

  const raw_context = buildChatContext(productos, latestSummary, prevSummary, latestYear, prevYear)

  return { productos, resumen, años, tiendas, raw_context }
}

function buildChatContext(
  productos: ProductData[],
  latest?: StoreSummary,
  prev?: StoreSummary,
  latestYear?: number,
  prevYear?: number
): string {
  const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CL')} CLP`
  const fmtM = (n: number) => `$${(n / 1e6).toFixed(1)}M CLP`

  let ctx = `CONTEXTO DE VENTAS MYCOCOS - SHOPYLIBRE CHILE\n\n`

  if (latest) {
    ctx += `RESUMEN ${latestYear}:\n`
    ctx += `- Ventas brutas: ${fmtM(latest.ventas_brutas)}\n`
    ctx += `- Ventas netas: ${fmtM(latest.ventas_netas)}\n`
    ctx += `- Unidades vendidas: ${latest.unidades.toLocaleString()}\n`
    ctx += `- Margen total: ${fmtM(latest.margen_total)}\n`
    ctx += `- SKUs activos: ${latest.num_skus}\n\n`
  }

  if (prev) {
    ctx += `RESUMEN ${prevYear}:\n`
    ctx += `- Ventas brutas: ${fmtM(prev.ventas_brutas)}\n`
    ctx += `- Unidades vendidas: ${prev.unidades.toLocaleString()}\n`
    ctx += `- Margen total: ${fmtM(prev.margen_total)}\n\n`
  }

  const MESES_NAMES_LOCAL = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const TEMP = ['Año nuevo','Verano','Vuelta clases','Otoño','Día Mamá','CyberDay','Invierno','Invierno','Fiestas Patrias','Pre HotSale','HotSale','Navidad/CyberMonday']

  ctx += `TOP PRODUCTOS (${latestYear}) - PRECIO Y VOLUMEN POR MES:\n\n`

  productos.slice(0, 15).forEach((p) => {
    ctx += `Producto: ${p.nombre}\n`
    ctx += `  Tipo: ${p.tipo} | Costo promedio: ${fmt(p.costo_avg)} | Margen promedio: ${p.margen_avg}%\n`
    ctx += `  Volumen total año: ${p.volumen_total.toLocaleString()} unidades | Venta bruta: ${fmtM(p.venta_bruta_total)}\n`
    ctx += `  Evolución mensual:\n`
    p.meses.forEach((m) => {
      if (m.q25 > 0) {
        ctx += `    ${MESES_NAMES_LOCAL[m.mes - 1]} (${TEMP[m.mes - 1]}): precio bruto ${fmt(m.pb25)}, precio lista ${fmt(m.pl25)}, descuento ${m.d25}%, margen ${m.mg25}%, volumen ${m.q25} un.`
        if (m.pb24) ctx += ` | precio ${(latestYear ?? 0) - 1}: ${fmt(m.pb24)}`
        ctx += `\n`
      }
    })
    ctx += `\n`
  })

  return ctx
}
