'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  FileSearch,
  Plus,
  Scale,
  Settings as SettingsIcon,
  ChevronDown,
  Wallet,
  X,
  UserPlus,
  Loader2,
} from 'lucide-react'
import {
  getActiveSession,
  listMembers,
  createMember,
  joinSession,
  addBuyin,
} from '@/lib/api'
import type { Member } from '@/lib/types'
import { usePrivacy } from '@/components/PrivacyContext'

/* ================================================================
 * 底部五片胶囊 TabBar
 * 本局信息 | 详情 | + | 内部分账 | 个人设置
 * ================================================================ */
export function TabBar() {
  const pathname = usePathname()

  const tabs = [
    { href: '/', icon: LayoutDashboard, label: '本局信息', match: /^\/$/ },
    { href: '/history', icon: FileSearch, label: '详情', match: /^\/history/ },
    { plus: true },
    { href: '/internal', icon: Scale, label: '内部分账', match: /^\/internal/ },
    { href: '/settings', icon: SettingsIcon, label: '个人设置', match: /^\/settings/ },
  ]

  const isDetailsActive = /^\/session\//.test(pathname)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-[max(env(safe-area-inset-bottom),12px)]">
      <nav className="glass mx-auto flex w-full max-w-md items-center justify-between rounded-2xl px-2 py-2">
        {tabs.map((tab, i) => {
          if ('plus' in tab) {
            return (
              <QuickAddButton key="plus" />
            )
          }
          const active = tab.match!.test(pathname) || (i === 1 && isDetailsActive)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-[64px] flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors ${
                active
                  ? 'bg-blue-50/90 text-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
              <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

/* ================================================================
 * 中间凸起 + 按钮 → 唤起 QuickAdd 浮层
 * ================================================================ */
function QuickAddButton() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="快速添加"
        className="relative -top-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/40 transition-transform active:scale-95"
      >
        <Plus className="h-7 w-7" strokeWidth={2.4} />
      </button>
      <QuickAddSheet open={open} onClose={() => setOpen(false)} />
    </>
  )
}

/* ================================================================
 * QuickAddSheet — 玻璃浮层
 * 选玩家 → 选动作(买入/追加) → 快捷金额 → 确认
 * 无活跃场次时提示先开局
 * ================================================================ */
function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { privacyMode, mask } = usePrivacy()
  const [busy, setBusy] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Member | null>(null)
  const [action, setAction] = useState<'join' | 'buyin'>('join')
  const [amount, setAmount] = useState('')
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelected(null)
    setAmount('')
    setAction('join')
    getActiveSession().then((s) => {
      setActiveSessionId(s ? s.id : null)
      setMembers((prev) => prev)
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const filtered = query.trim()
    ? members.filter((m) => m.name.includes(query.trim()))
    : members

  useEffect(() => {
    listMembers().then(setMembers).catch(() => {})
  }, [open])

  async function submit() {
    if (!selected || !activeSessionId) return
    const amt = parseFloat(amount)
    if (!Number.isFinite(amt) || amt <= 0) return
    setBusy(true)
    try {
      if (action === 'join') {
        const rec = await joinSession(activeSessionId, selected.id, 0)
        if (amt > 0) {
          await addBuyin(rec.record.id, amt)
        }
      } else {
        // 追加买入：查已有记录 → 无则入场 0
        // 简化：直接对最新入场记录追加
        await addBuyinForPlayer(activeSessionId, selected.id, amt)
      }
      onClose()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function addBuyinForPlayer(sessionId: string, memberId: string, amt: number) {
    const { loadBundle } = await import('@/lib/api')
    const bundle = await loadBundle(sessionId)
    const entry = bundle.players.find(
      (p) => p.record.member_id === memberId && !p.record.is_settled,
    )
    if (entry) {
      await addBuyin(entry.record.id, amt)
    } else {
      const r = await joinSession(sessionId, memberId, 0)
      await addBuyin(r.record.id, amt)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/35 backdrop-blur-[4px] sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass w-full max-w-md rounded-t-3xl p-5 sm:rounded-3xl"
        style={{ background: 'rgba(255,255,255,0.92)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <Wallet className="h-4 w-4 text-blue-500" />
            快速添加
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!activeSessionId ? (
          <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
            当前没有进行中的场次，请先在
            <Link href="/" className="ml-1 font-semibold text-blue-600 underline">
              本局信息
            </Link>
            开一局。
          </div>
        ) : (
          <div className="space-y-4">
            {/* 玩家选择 */}
            <div>
              <p className="mb-2 text-[11px] font-semibold text-slate-500">玩家</p>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setSelected(null)
                }}
                placeholder="搜索或输入新玩家姓名"
                className="w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              />
              <div className="mt-2 max-h-40 overflow-y-auto">
                {filtered.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                      selected?.id === m.id
                        ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{mask(m.name)}</span>
                    <UserPlus className="h-3.5 w-3.5 opacity-50" />
                  </button>
                ))}
                {query.trim() && (
                  <button
                    onClick={async () => {
                      const m = await createMember(query.trim())
                      setMembers((prev) => [...prev, m])
                      setSelected(m)
                    }}
                    className="mb-1 flex w-full items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-blue-600 hover:bg-slate-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    新建玩家「{mask(query.trim())}」
                  </button>
                )}
              </div>
            </div>

            {/* 动作 */}
            <div className="flex gap-2">
              {(
                [
                  { v: 'join', label: '入场 + 买入' },
                  { v: 'buyin', label: '追加买入' },
                ] as const
              ).map((a) => (
                <button
                  key={a.v}
                  onClick={() => setAction(a.v)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    action === a.v
                      ? 'border-blue-300 bg-blue-50 text-blue-600'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>

            {/* 金额 */}
            <div>
              <p className="mb-2 text-[11px] font-semibold text-slate-500">金额</p>
              <div className="mb-2 flex flex-wrap gap-2">
                {[100, 200, 500, 1000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(String(v))}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium tabular-nums transition-colors ${
                      amount === String(v)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="自定义金额"
                className="w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              />
            </div>

            <button
              onClick={submit}
              disabled={!selected || !amount || busy}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 disabled:opacity-40 active:scale-[0.98]"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  提交中…
                </>
              ) : (
                '确认添加'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
