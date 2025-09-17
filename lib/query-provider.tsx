"use client"

import { QueryClientProvider as TanStackQueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './query-client'

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
    </TanStackQueryClientProvider>
  )
}