'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// El Recomendador se fusionó con el Simulador (calendario mensual + elasticidad + tiers)
export default function RecomendadorRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/simulador') }, [router])
  return null
}
