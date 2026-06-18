export interface ProductMonth {
  mes: number
  pb25: number
  pl25: number
  pn25: number
  c25: number
  d25: number
  q25: number
  mg25: number
  pb24?: number
  q24?: number
}

export interface ProductData {
  nombre: string
  tipo: string
  meses: ProductMonth[]
  costo_avg: number
  precio_bruto_avg: number
  precio_lista_avg: number
  margen_avg: number
  volumen_total: number
  venta_bruta_total: number
}

export interface StoreSummary {
  año: number
  ventas_brutas: number
  ventas_netas: number
  unidades: number
  margen_total: number
  num_skus: number
}

export interface ParsedData {
  productos: ProductData[]
  resumen: StoreSummary[]
  años: number[]
  tiendas: string[]
  raw_context: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
