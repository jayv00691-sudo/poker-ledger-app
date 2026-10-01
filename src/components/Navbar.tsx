'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: '数据看板', icon: '📊' },
  { href: '/session', label: '实时牌桌', icon: '🎴' },
  { href: '/history', label: '历史战报', icon: '📋' },
  { href: '/settings', label: '系统设置', icon: '⚙️' },
]

export function Navbar({ privacyMode }: { privacyMode: boolean }) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-3 py-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 text-sm font-bold text-zinc-100">
          <span>🃏</span>
          <span className="hidden sm:inline">扑克账本</span>
        </Link>

        {/* Nav items */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'
              }`}
            >
              <span className="text-[14px]">{item.icon}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Privacy toggle */}
        <button
          aria-label="隐私模式"
          className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border text-[16px] transition-colors ${
            privacyMode
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
              : 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800'
          }`}
        >
          {privacyMode ? '🙈' : '👁️'}
        </button>
      </div>
    </nav>
  )
}
