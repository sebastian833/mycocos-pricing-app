// Búsqueda de productos para el armador y el selector de regalos.
// - Ignora mayúsculas y tildes ("cortauñas" = "CORTAUNAS").
// - Dentro de una búsqueda todas las palabras deben aparecer, en cualquier orden.
// - Se puede buscar varios productos a la vez separándolos con "+" o ",":
//   "rasuradora 4.0 + nariz + daily shaver" muestra los que calcen con cualquiera de las tres.

export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ' ')
    .replace(/\.(?!\d)/g, ' ')   // puntos que no son decimales ("4.0" se conserva)
    .replace(/\s+/g, ' ')
    .trim()
}

export function filtrarPorTexto<T extends { nombre: string }>(items: T[], consulta: string): T[] {
  const segmentos = consulta.split(/[+,]/).map(normalizar).filter(Boolean)
  if (segmentos.length === 0) return items
  return items.filter(it => {
    const n = normalizar(it.nombre)
    return segmentos.some(seg => seg.split(' ').every(tok => n.includes(tok)))
  })
}
