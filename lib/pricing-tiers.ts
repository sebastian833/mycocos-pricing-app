export type Categoria = 'pack' | 'kit' | 'unitario'

export interface TierDef {
  key: 'tier1' | 'tier2' | 'tier3'
  label: string
  sublabel: string
  margenes: {
    pack: number
    kit: number
    unitario: [number, number]
  }
}

export const TIERS: TierDef[] = [
  {
    key: 'tier1',
    label: 'Tier 1 · Cyber',
    sublabel: 'Oferta más agresiva',
    margenes: { pack: 0.55, kit: 0.60, unitario: [0.65, 0.68] },
  },
  {
    key: 'tier2',
    label: 'Tier 2 · Medio',
    sublabel: 'Oferta media',
    margenes: { pack: 0.60, kit: 0.65, unitario: [0.68, 0.69] },
  },
  {
    key: 'tier3',
    label: 'Tier 3 · Evergreen',
    sublabel: 'Precio base permanente',
    margenes: { pack: 0.65, kit: 0.68, unitario: [0.70, 0.75] },
  },
]

const IVA = 1.19

// Redondeo psicológico chileno a terminación .990
export function roundChilean(price: number): number {
  if (price < 3000) return Math.round(price / 100) * 100 - 10
  return Math.round(price / 1000) * 1000 - 10
}

export function margenParaCategoria(tier: TierDef, categoria: Categoria): number {
  if (categoria === 'pack') return tier.margenes.pack
  if (categoria === 'kit') return tier.margenes.kit
  const [min, max] = tier.margenes.unitario
  return (min + max) / 2
}

export function precioPorMargen(costo: number, margen: number): number {
  if (costo <= 0) return 0
  const precioNeto = costo / (1 - margen)
  return roundChilean(precioNeto * IVA)
}

// Retorna el % margen neto dado un precio bruto (con IVA) y un costo
export function margenPorPrecio(costo: number, precioBruto: number): number {
  const precioNeto = precioBruto / IVA
  if (precioNeto <= 0) return 0
  return ((precioNeto - costo) / precioNeto) * 100
}

export interface TierResult {
  tier: TierDef
  margenObjetivo: number
  margenRango?: [number, number]
  precioSugerido: number
  precioNeto: number
}

export function calcularEscenarios(costo: number, categoria: Categoria): TierResult[] {
  return TIERS.map(tier => {
    const margenObjetivo = margenParaCategoria(tier, categoria)
    const precioSugerido = precioPorMargen(costo, margenObjetivo)
    return {
      tier,
      margenObjetivo,
      margenRango: categoria === 'unitario' ? tier.margenes.unitario : undefined,
      precioSugerido,
      precioNeto: Math.round(precioSugerido / IVA),
    }
  })
}

// Heurística: si todos los componentes son el mismo SKU repetido → "pack" (multi-compra)
// Si hay 2+ SKUs distintos → "kit" (combo curado de productos diferentes)
export function detectarCategoria(componentes: { sku: string }[]): Categoria {
  const skusUnicos = new Set(componentes.map(c => c.sku))
  return skusUnicos.size <= 1 ? 'pack' : 'kit'
}

// Calendario: qué tier de precio usar cada mes, según el BATTLEMAP 2026 real (Asana)
export interface MesInfo {
  mes: number
  temporada: string
  tierSugerido: 'tier1' | 'tier2' | 'tier3'
}

// Chile — combina el patrón de MyCOCOS y MENNT (ambos comparten Cyber, Black Friday, Fiestas Patrias)
const CALENDARIO_CHILE: MesInfo[] = [
  { mes: 1, temporada: 'Summer Sale / Año Nuevo', tierSugerido: 'tier3' },
  { mes: 2, temporada: 'San Valentín', tierSugerido: 'tier2' },
  { mes: 3, temporada: 'Double Day 3/3 + Black Sale', tierSugerido: 'tier1' },
  { mes: 4, temporada: 'Double Day 4/4 + Black Sale + Pascuas', tierSugerido: 'tier1' },
  { mes: 5, temporada: 'Double Day 5/5 + Día de la Madre', tierSugerido: 'tier2' },
  { mes: 6, temporada: 'CyberDay + Día del Padre', tierSugerido: 'tier1' },
  { mes: 7, temporada: 'Winter Sale + Black Week', tierSugerido: 'tier2' },
  { mes: 8, temporada: 'Travel Sale', tierSugerido: 'tier2' },
  { mes: 9, temporada: 'Fiestas Patrias', tierSugerido: 'tier2' },
  { mes: 10, temporada: 'Cyber Octubre + Halloween', tierSugerido: 'tier1' },
  { mes: 11, temporada: 'Black Friday / Aniversario', tierSugerido: 'tier1' },
  { mes: 12, temporada: 'Navidad / Gift Day', tierSugerido: 'tier2' },
]

// Colombia — MyHUEVOS COL (battlemap real)
const CALENDARIO_COLOMBIA: MesInfo[] = [
  { mes: 1, temporada: 'Evergreen', tierSugerido: 'tier3' },
  { mes: 2, temporada: 'San Valentín', tierSugerido: 'tier2' },
  { mes: 3, temporada: 'Hot Sale + Black Sale + Semana Santa', tierSugerido: 'tier1' },
  { mes: 4, temporada: 'Mes Cáncer Testicular + Día del Beso', tierSugerido: 'tier2' },
  { mes: 5, temporada: 'Double Day 5/5', tierSugerido: 'tier2' },
  { mes: 6, temporada: 'Cyber + Día del Padre + Black Days', tierSugerido: 'tier1' },
  { mes: 7, temporada: 'Black Week + Promos Mundialistas', tierSugerido: 'tier1' },
  { mes: 8, temporada: 'Evergreen', tierSugerido: 'tier3' },
  { mes: 9, temporada: 'Amor y Amistad + Apertura tienda', tierSugerido: 'tier2' },
  { mes: 10, temporada: 'Hot Sale + Feria Effix', tierSugerido: 'tier1' },
  { mes: 11, temporada: 'Black Friday + Lanzamientos', tierSugerido: 'tier1' },
  { mes: 12, temporada: 'Navidad / Gift Day', tierSugerido: 'tier2' },
]

// México — MyHUEVOS MX (battlemap real, sin datos de venta aún)
const CALENDARIO_MEXICO: MesInfo[] = [
  { mes: 1, temporada: 'Evergreen', tierSugerido: 'tier3' },
  { mes: 2, temporada: 'San Valentín', tierSugerido: 'tier2' },
  { mes: 3, temporada: 'Spring Sale / Pascuas + Black Sale', tierSugerido: 'tier1' },
  { mes: 4, temporada: 'Mes Cáncer Testicular', tierSugerido: 'tier3' },
  { mes: 5, temporada: 'Calentamiento Hot Sale', tierSugerido: 'tier2' },
  { mes: 6, temporada: 'Cyber + Día del Padre + Mundial + Prime Day', tierSugerido: 'tier1' },
  { mes: 7, temporada: 'Evergreen', tierSugerido: 'tier3' },
  { mes: 8, temporada: 'Summer Sale / Back to School', tierSugerido: 'tier2' },
  { mes: 9, temporada: 'El Grito (Fiestas Patrias)', tierSugerido: 'tier2' },
  { mes: 10, temporada: 'Prime Big Deal Days + Halloween', tierSugerido: 'tier1' },
  { mes: 11, temporada: 'El Buen Fin (Black Friday MX)', tierSugerido: 'tier1' },
  { mes: 12, temporada: 'Gift Day / Navidad Sale', tierSugerido: 'tier2' },
]

const CALENDARIOS_POR_PAIS: Record<string, MesInfo[]> = {
  'Chile': CALENDARIO_CHILE,
  'Colombia': CALENDARIO_COLOMBIA,
  'México': CALENDARIO_MEXICO,
}

export function getCalendario(pais: string): MesInfo[] {
  return CALENDARIOS_POR_PAIS[pais] || CALENDARIO_CHILE
}

// Se mantiene por compatibilidad — usar getCalendario(pais) para calendarios específicos
export const CALENDARIO_MESES = CALENDARIO_CHILE

export interface ProductoMesLike {
  mes: number
  q25: number
  pb25: number
}

// Calcula qué tan sensible es el volumen de ventas al precio, usando el historial mes a mes
export function calcularElasticidad(meses: ProductoMesLike[]): { elasticidad: number; clasificacion: 'elástico' | 'inelástico' | 'neutro' } {
  const mesesConDatos = meses.filter(m => m.q25 > 0 && m.pb25 > 0)
  if (mesesConDatos.length < 2) return { elasticidad: 1, clasificacion: 'neutro' }

  const pares: number[] = []
  for (let i = 1; i < mesesConDatos.length; i++) {
    const dP = (mesesConDatos[i].pb25 - mesesConDatos[i - 1].pb25) / mesesConDatos[i - 1].pb25
    const dQ = (mesesConDatos[i].q25 - mesesConDatos[i - 1].q25) / mesesConDatos[i - 1].q25
    if (Math.abs(dP) > 0.02) pares.push(dQ / dP)
  }
  const elasticidad = pares.length > 0
    ? Math.abs(pares.reduce((a, b) => a + b, 0) / pares.length)
    : 1
  const clasificacion: 'elástico' | 'inelástico' | 'neutro' =
    elasticidad > 1.5 ? 'elástico' : elasticidad < 0.7 ? 'inelástico' : 'neutro'

  return { elasticidad: parseFloat(elasticidad.toFixed(2)), clasificacion }
}
