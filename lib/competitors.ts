export interface CompetitorEntry {
  id: string
  fecha: string
  competidor: string
  productoInterno: string
  productoDetectado: string
  precioDetectado: number
  moneda: string
  notas: string
}

const STORAGE_KEY = 'mycocos_competitors_v1'

export function loadCompetitorsLocal(): CompetitorEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveCompetitorsLocal(entries: CompetitorEntry[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export async function loadCompetitorsBase(): Promise<CompetitorEntry[]> {
  try {
    const res = await fetch('/competidores.json')
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

// Resize image client-side before sending to the vision API,
// keeps payload small and speeds up analysis
export function resizeImage(file: File, maxWidth = 1000): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('No se pudo procesar la imagen'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        const base64 = dataUrl.split(',')[1]
        resolve({ base64, mimeType: 'image/jpeg' })
      }
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}
