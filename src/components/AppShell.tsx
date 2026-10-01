'use client'

import type { ReactNode } from 'react'
import { TabBar } from '@/components/TabBar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-slate-900">
      <main className="px-4 pb-36 pt-6">{children}</main>
      <TabBar />
    </div>
  )
}
