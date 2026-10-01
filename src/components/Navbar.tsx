'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  History,
  Settings,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import { usePrivacy } from '@/components/PrivacyContext'

const NAV_ITEMS = [
  { href: '/', label: '看板', icon: LayoutDashboard, match: (p: string) => p === '/' },
  { href: '/session', label: '牌桌', icon: Users, match: (p: string) => p.startsWith('/session') },
  { href: '/history', label: '战报', icon: History, match: (p: string) => p.startsWith('/history') },
  { href: '/settings', label: '设置', icon: Settings, match: (p: string) => p.startsWith('/settings') },
]

export function Navbar() {
  const pathname = usePathname()
  const { privacyMode, togglePrivacy } = usePrivacy()

  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-3 py-2">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-1.5 text-sm font-bold text-zinc-100">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600/15 text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
          <span className="hidden sm:inline">扑克账本</span>
        </Link>

        {/* Nav items */}
        <div className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = item.match(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  active
                    ? 'bg-zinc-800/80 text-zinc-100'
                    : 'text-zinc-500 hover:bg-zinc-800/40 hover:text-zinc-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}

          {/* Privacy toggle */}
          <button
            aria-label="隐私模式"
            onClick={togglePrivacy}
            className={`ml-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border transition-colors active:scale-[0.92] ${
              privacyMode
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                : 'border-zinc-700/60 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            {privacyMode ? <EyeOff className="h-4 w-4" strokeWidth={2} /> : <Eye className="h-4 w-4" strokeWidth={2} />}
          </button>
        </div>
      </div>
    </nav>
  )
}
