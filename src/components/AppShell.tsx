'use client'

import type { ReactNode } from 'react'
import { TabBar } from '@/components/TabBar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-slate-900">
      {/* 底部需要为悬浮 TabBar（约 68px）+ 凸起 + 按钮（20px）预留安全区，
          并叠加 iOS 安全区，避免最后一屏内容（如"保存设置"）贴住导航 */}
      <main className="px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+160px)]">
        {children}
      </main>
      <TabBar />
    </div>
  )
}
