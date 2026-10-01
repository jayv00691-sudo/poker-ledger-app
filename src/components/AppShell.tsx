'use client'

import type { ReactNode } from 'react'
import { usePrivacy } from '@/components/PrivacyContext'
import { Navbar } from '@/components/Navbar'

export function AppShell({ children }: { children: ReactNode }) {
  const { privacyMode } = usePrivacy()
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar privacyMode={privacyMode} />
      <main>{children}</main>
    </div>
  )
}
