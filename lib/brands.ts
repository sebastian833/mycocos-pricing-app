export type MarcaId = 'mycocos' | 'myhuevos' | 'mennt' | 'myhuevos-mx'

export interface Brand {
  id: MarcaId
  nombre: string
  pais: string
  emoji: string
  color: string
  dataFile: string
  packsFile: string
  packsGanadoresFile: string
  componentesFile: string
}

export const BRANDS: Brand[] = [
  {
    id: 'mycocos',
    nombre: 'MyCOCOS',
    pais: 'Chile',
    emoji: '🥥',
    color: 'blue',
    dataFile: '/data-mycocos.json',
    packsFile: '/packs-mycocos.json',
    packsGanadoresFile: '/packs-ganadores-mycocos.json',
    componentesFile: '/componentes-mycocos.json',
  },
  {
    id: 'myhuevos',
    nombre: 'MyHUEVOS',
    pais: 'Colombia',
    emoji: '🥚',
    color: 'amber',
    dataFile: '/data-myhuevos.json',
    packsFile: '/packs-myhuevos.json',
    packsGanadoresFile: '/packs-ganadores-myhuevos.json',
    componentesFile: '/componentes-myhuevos.json',
  },
  {
    id: 'mennt',
    nombre: 'MENNT',
    pais: 'Chile',
    emoji: '🎒',
    color: 'indigo',
    dataFile: '/data-mennt.json',
    packsFile: '/packs-mennt.json',
    packsGanadoresFile: '/packs-ganadores-mennt.json',
    componentesFile: '/componentes-mennt.json',
  },
  {
    id: 'myhuevos-mx',
    nombre: 'MyHUEVOS México',
    pais: 'México',
    emoji: '🇲🇽',
    color: 'green',
    dataFile: '/data-myhuevos-mx.json',
    packsFile: '/packs-myhuevos-mx.json',
    packsGanadoresFile: '/packs-ganadores-myhuevos-mx.json',
    componentesFile: '/componentes-myhuevos-mx.json',
  },
]

export function getBrand(id: MarcaId): Brand {
  return BRANDS.find(b => b.id === id) || BRANDS[0]
}

export const MARCA_STORAGE_KEY = 'mycocos_marca_activa'
