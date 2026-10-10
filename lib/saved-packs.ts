import type { Categoria } from '@/lib/pricing-tiers'

// Packs guardados desde el armador. Se guardan en este navegador (localStorage):
// no hay base de datos compartida, así que para pasarlos a otra persona o computador
// se usa Exportar / Importar.

export interface ItemGuardado {
  sku: string
  nombre: string
  qty: number
  costoUnit: number   // costo neto de cada unidad al momento de guardar
  extraAereo: number  // costo aéreo (u otro ajuste) agregado a cada unidad
}

export interface RegaloGuardado {
  sku: string
  nombre: string
  costo: number
}

export interface PackGuardado {
  id: string
  nombre: string
  marca: string
  creado: string
  actualizado: string
  categoria: Categoria
  items: ItemGuardado[]
  regalos: RegaloGuardado[]
  costoItems: number                                   // suma de los productos (sin regalos)
  costoTotal: number                                   // productos + regalos
  precios?: { tier1: number; tier2: number; tier3: number }  // guardado "con los 3 precios"
  precioUnico?: { valor: number; etiqueta: string }          // guardado "con un solo precio"
}

const KEY = 'pricing_packs_guardados_v1'

export function cargarPacks(): PackGuardado[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    const data = raw ? JSON.parse(raw) : []
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

function escribir(packs: PackGuardado[]) {
  localStorage.setItem(KEY, JSON.stringify(packs))
}

const mismaClave = (a: { marca: string; nombre: string }, b: { marca: string; nombre: string }) =>
  a.marca === b.marca && a.nombre.trim().toLowerCase() === b.nombre.trim().toLowerCase()

// Si ya existe un pack de la misma marca con el mismo nombre, lo actualiza (no lo duplica).
export function guardarPackLocal(
  p: Omit<PackGuardado, 'id' | 'creado' | 'actualizado'>
): { actualizado: boolean } {
  const packs = cargarPacks()
  const ahora = new Date().toISOString()
  const i = packs.findIndex(x => mismaClave(x, p))
  if (i >= 0) {
    packs[i] = { ...p, id: packs[i].id, creado: packs[i].creado, actualizado: ahora }
    escribir(packs)
    return { actualizado: true }
  }
  packs.push({ ...p, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, creado: ahora, actualizado: ahora })
  escribir(packs)
  return { actualizado: false }
}

export function eliminarPack(id: string) {
  escribir(cargarPacks().filter(p => p.id !== id))
}

export function exportarPacks() {
  const blob = new Blob([JSON.stringify(cargarPacks(), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `packs-guardados-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function esPackValido(p: unknown): p is PackGuardado {
  const x = p as PackGuardado
  return !!x && typeof x.nombre === 'string' && typeof x.marca === 'string' &&
    Array.isArray(x.items) && Array.isArray(x.regalos) && typeof x.costoTotal === 'number'
}

// Mezcla los packs del archivo con los que ya hay: si coincide marca y nombre, queda el más reciente.
export async function importarPacks(file: File): Promise<number> {
  const data = JSON.parse(await file.text())
  if (!Array.isArray(data)) throw new Error('el archivo no contiene packs')
  const validos = data.filter(esPackValido)
  if (validos.length === 0) throw new Error('no encontré packs válidos en el archivo')
  const packs = cargarPacks()
  for (const p of validos) {
    const i = packs.findIndex(x => mismaClave(x, p))
    if (i < 0) packs.push(p)
    else if ((p.actualizado || '') > (packs[i].actualizado || '')) packs[i] = { ...p, id: packs[i].id }
  }
  escribir(packs)
  return validos.length
}
