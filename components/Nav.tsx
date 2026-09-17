'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useData } from '@/lib/context'
import { BRANDS } from '@/lib/brands'
import { BarChart2, TrendingUp, Sliders, MessageCircle, Upload, Package, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const links = [
  { href: '/', label: 'Inicio', icon: Upload },
  { href: '/informe', label: 'Informe', icon: BarChart2 },
  { href: '/packs', label: 'Packs', icon: Package },
  { href: '/simulador', label: 'Simulador', icon: Sliders },
  { href: '/chat', label: 'Chat IA', icon: MessageCircle },
]

export default function Nav() {
  const pathname = usePathname()
  const { marcaActual, marca, setMarca } = useData()
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14 gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <TrendingUp className="text-blue-600" size={20} />
          <span className="font-semibold text-gray-900 text-sm hidden sm:inline">Pricing</span>
        </div>

        {/* Selector de marca */}
        <div className="relative flex-shrink-0" ref={ref}>
          <button
            onClick={() => setAbierto(!abierto)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <span>{marcaActual.emoji}</span>
            <span>{marcaActual.nombre}</span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>
          {abierto && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
              {BRANDS.map(b => (
                <button
                  key={b.id}
                  onClick={() => { setMarca(b.id); setAbierto(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${b.id === marca ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                >
                  <span className="text-base">{b.emoji}</span>
                  <div>
                    <p>{b.nombre}</p>
                    <p className="text-xs text-gray-400">{b.pais}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto flex-1 justify-end">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={15} />
                <span className="hidden md:inline">{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
