import type { ProductData } from '@/types'

export interface MonthRecommendation {
  mes: number
  temporada: string
  evento: boolean
  precioRecomendado: number
  precioHistorico: number
  precioPiso: number
  indiceEstacional: number
  volumenEsperado: number
  margenEsperado: number
  razonamiento: string
}

export interface PricingAnalysis {
  precioEvergreen: number
  precioPiso: number
  costo: number
  costoFuente: 'bom' | 'registrado'
  costoRegistrado: number
  elasticidad: number
  clasificacionElasticidad: 'elástico' | 'inelástico' | 'neutro'
  recomendaciones: MonthRecommendation[]
}

const TEMPORADAS = [
  { nombre: 'Año nuevo', evento: false },
  { nombre: 'Verano', evento: false },
  { nombre: 'Vuelta a clases', evento: false },
  { nombre: 'Otoño', evento: false },
  { nombre: 'Día de la Mamá', evento: true },
  { nombre: 'CyberDay Chile', evento: true },
  { nombre: 'Invierno', evento: false },
  { nombre: 'Invierno', evento: false },
  { nombre: 'Fiestas Patrias', evento: true },
  { nombre: 'Pre HotSale', evento: false },
  { nombre: 'HotSale / Black Friday', evento: true },
  { nombre: 'Navidad / CyberMonday', evento: true },
]

const IVA = 1.19
const MARGEN_MINIMO = 0.55 // 55% margen neto mínimo

// Redondea a terminación .990 chilena
function roundChilean(price: number): number {
  if (price < 3000) {
    return Math.round(price / 100) * 100 - 10 // ej: 2.390
  }
  return Math.round(price / 1000) * 1000 - 10 // ej: 51.990
}

export function analyzePricing(prod: ProductData, costoBOM?: number): PricingAnalysis {
  const meses = prod.meses.filter(m => m.q25 > 0 && m.pb25 > 0)
  if (meses.length === 0) {
    return {
      precioEvergreen: 0, precioPiso: 0, costo: 0, costoFuente: 'registrado', costoRegistrado: 0,
      elasticidad: 0, clasificacionElasticidad: 'neutro', recomendaciones: [],
    }
  }

  const costoRegistrado = prod.costo_avg
  const usarBOM = costoBOM !== undefined && costoBOM > 0
  const costo = usarBOM ? costoBOM : costoRegistrado
  const costoFuente: 'bom' | 'registrado' = usarBOM ? 'bom' : 'registrado'

  // 1. PISO: precio mínimo para mantener margen mínimo
  const precioPisoNeto = costo / (1 - MARGEN_MINIMO)
  const precioPiso = roundChilean(precioPisoNeto * IVA)

  // 2. EVERGREEN: mediana de meses sin evento
  const mesesNormales = meses.filter(m => !TEMPORADAS[m.mes - 1].evento)
  const preciosNormales = (mesesNormales.length > 0 ? mesesNormales : meses)
    .map(m => m.pb25).sort((a, b) => a - b)
  const mid = Math.floor(preciosNormales.length / 2)
  const precioEvergreen = preciosNormales.length % 2 === 0
    ? (preciosNormales[mid - 1] + preciosNormales[mid]) / 2
    : preciosNormales[mid]

  // 3. ELASTICIDAD: correlación precio-volumen del histórico
  // e = (%Δvolumen) / (%Δprecio) usando pares de meses consecutivos
  const pares: number[] = []
  for (let i = 1; i < meses.length; i++) {
    const dP = (meses[i].pb25 - meses[i - 1].pb25) / meses[i - 1].pb25
    const dQ = (meses[i].q25 - meses[i - 1].q25) / meses[i - 1].q25
    if (Math.abs(dP) > 0.02) { // solo cambios de precio significativos
      pares.push(dQ / dP)
    }
  }
  const elasticidad = pares.length > 0
    ? Math.abs(pares.reduce((a, b) => a + b, 0) / pares.length)
    : 1
  const clasificacionElasticidad: 'elástico' | 'inelástico' | 'neutro' =
    elasticidad > 1.5 ? 'elástico' : elasticidad < 0.7 ? 'inelástico' : 'neutro'

  // 4. ÍNDICES ESTACIONALES: precio de cada mes / evergreen
  const volPromedio = meses.reduce((s, m) => s + m.q25, 0) / meses.length

  const recomendaciones: MonthRecommendation[] = prod.meses.map((m, i) => {
    const temp = TEMPORADAS[i]
    const tieneHistorico = m.pb25 > 0

    // Índice estacional del histórico (o 1 si no hay datos)
    const indice = tieneHistorico ? m.pb25 / precioEvergreen : 1

    // Ajuste por elasticidad en eventos:
    // - producto elástico + evento → descuento más agresivo (captura volumen)
    // - producto inelástico + evento → descuento leve (no regalar margen)
    let ajuste = 1
    let razon = ''

    if (temp.evento) {
      if (clasificacionElasticidad === 'elástico') {
        ajuste = Math.min(indice, 0.87)
        razon = `Producto elástico: en ${temp.nombre} el descuento agresivo multiplica el volumen. Histórico muestra ${m.q25 > volPromedio ? 'volumen ' + (m.q25 / volPromedio).toFixed(1) + 'x sobre promedio' : 'respuesta positiva a descuentos'}.`
      } else if (clasificacionElasticidad === 'inelástico') {
        ajuste = Math.max(indice, 0.95)
        razon = `Producto inelástico: el volumen no responde mucho al precio. En ${temp.nombre} basta descuento simbólico (5%) para participar del evento sin sacrificar margen.`
      } else {
        ajuste = indice
        razon = `Elasticidad neutra: replicar el patrón histórico de ${temp.nombre} que balanceó precio y volumen.`
      }
    } else {
      // Mes normal: mantener evergreen con el índice histórico suavizado
      ajuste = (indice + 1) / 2 // suavizar hacia evergreen
      razon = indice > 1.02
        ? `Mes de demanda estable: el histórico permite precio sobre evergreen (+${((indice - 1) * 100).toFixed(0)}%).`
        : indice < 0.98
          ? `Mes de menor demanda: precio levemente bajo evergreen para sostener rotación.`
          : `Mes evergreen: mantener precio base.`
    }

    const precioCrudo = precioEvergreen * ajuste
    const precioRecomendado = Math.max(precioPiso, roundChilean(precioCrudo))

    // Margen esperado
    const pnEsperado = precioRecomendado / IVA
    const margenEsperado = pnEsperado > 0 ? ((pnEsperado - costo) / pnEsperado) * 100 : 0

    // Volumen esperado: histórico ajustado por elasticidad si el precio cambia
    let volumenEsperado = m.q25 || Math.round(volPromedio)
    if (tieneHistorico && m.pb25 > 0) {
      const cambioP = (precioRecomendado - m.pb25) / m.pb25
      volumenEsperado = Math.round(m.q25 * (1 - cambioP * elasticidad))
    }

    return {
      mes: i + 1,
      temporada: temp.nombre,
      evento: temp.evento,
      precioRecomendado,
      precioHistorico: m.pb25,
      precioPiso,
      indiceEstacional: parseFloat(indice.toFixed(2)),
      volumenEsperado: Math.max(0, volumenEsperado),
      margenEsperado: parseFloat(margenEsperado.toFixed(1)),
      razonamiento: razon,
    }
  })

  return {
    precioEvergreen: roundChilean(precioEvergreen),
    precioPiso,
    costo,
    costoFuente,
    costoRegistrado,
    elasticidad: parseFloat(elasticidad.toFixed(2)),
    clasificacionElasticidad,
    recomendaciones,
  }
}
