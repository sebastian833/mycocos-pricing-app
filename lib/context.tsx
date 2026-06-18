'use client'

import React, { createContext, useContext, useState } from 'react'
import type { ParsedData } from '@/types'

interface DataContextType {
  data: ParsedData | null
  setData: (d: ParsedData | null) => void
  fileName: string
  setFileName: (n: string) => void
}

const DataContext = createContext<DataContextType>({
  data: null,
  setData: () => {},
  fileName: '',
  setFileName: () => {},
})

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ParsedData | null>(null)
  const [fileName, setFileName] = useState('')

  return (
    <DataContext.Provider value={{ data, setData, fileName, setFileName }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
