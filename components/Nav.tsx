'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useData } from '@/lib/context'
import { BarChart2, TrendingUp, Sliders, MessageCircle, Upload, Sparkles, Camera, Package } from 'lucide-react'

const links = [
  { href: '/', label: 'Inicio', icon: Upload },
  { href: '/informe', label: 'Informe', icon: BarChart2 },
  { href: '/recomendador', label: 'Recomendador', icon: Sparkles },
  { href: '/packs', label: 'Packs', icon: Package },
  { href: '/simulador', label: 'Simulador', icon: Sliders },
  { href: '/competidores', label: 'Competencia', icon: Camera },
  { href: '/chat', label: 'Chat IA', icon: MessageCircle },
]

export default function Nav() {
  const pathname = usePathname()
  const { fileName } = useData()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-blue-600" size={20} />
          <span className="font-semibold text-gray-900 text-sm">MyCOCOS Pricing</span>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto">
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

        {fileName && (
          <span className="text-xs text-gray-400 hidden xl:block truncate max-w-[130px]">
            {fileName}
          </span>
        )}
      </div>
    </header>
  )
}
