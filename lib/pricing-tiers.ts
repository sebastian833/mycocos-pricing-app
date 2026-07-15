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
