'use client'

import type { ReactNode } from 'react'
import { Navbar } from '@/components/Navbar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />
      <main>{children}</main>
    </div>
  )
}
