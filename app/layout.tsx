import type { Metadata } from 'next'
import './globals.css'
import { DataProvider } from '@/lib/context'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'Pricing Dashboard',
  description: 'Análisis de precios y márgenes multi-marca',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 min-h-screen font-sans">
        <DataProvider>
          <Nav />
          <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
        </DataProvider>
      </body>
    </html>
  )
}
