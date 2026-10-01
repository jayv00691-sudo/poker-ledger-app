'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { Session } from '@/lib/types'
import { listSessions, loadBundle } from '@/lib/api'
import type { SessionBundle } from '@/lib/api'
import { fmtMoney, fmtSigned, todayTitle } from '@/lib/format'
import { Badge, Button, Field, Modal, Spinner, inputClass, Stat } from '@/components/ui'
import { usePrivacy } from '@/components/PrivacyContext'
import type { RakeMode } from '@/lib/types'
import { RAKE_MODE_LABELS, RAKE_MODE_SHORT } from '@/lib/types'

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const { mask } = usePrivacy()

  const refresh = useCallback(async () => {
    try {
      const data = await listSessions()
      setSessions(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-zinc-400">
        <Spinner />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  const active = sessions.filter((s) => s.status === 'active')
  const ended = sessions.filter((s) => s.status === 'ended')

  return (
    <div className="mx-auto max-w-3xl px-3 py-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-zinc-100">数据看板</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <span className="text-base">+</span> 新建场次
        </Button>
      </div>

      {/* Stats overview */}
      {sessions.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="进行中" value={`${active.length}`} tone="positive" />
          <Stat label="已结束" value={`${ended.length}`} />
          <Stat label="总场次" value={`${sessions.length}`} />
        </div>
      )}

      {/* Active sessions */}
      {active.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold text-zinc-500">进行中</h2>
          <div className="space-y-2">
            {active.map((s) => (
              <SessionCard key={s.id} session={s} href={`/session/${s.id}`} mask={mask} />
            ))}
          </div>
        </section>
      )}

      {/* Ended sessions */}
      {ended.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold text-zinc-500">历史场次</h2>
          <div className="space-y-2">
            {ended.map((s) => (
              <SessionCard key={s.id} session={s} href={`/session/${s.id}`} mask={mask} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-12 text-center">
          <p className="text-sm text-zinc-500">还没有任何场次</p>
          <p className="mt-1 text-xs text-zinc-600">点击「新建场次」开始记分</p>
        </div>
      )}

      {/* Create session modal */}
      {createOpen && <CreateSessionModal onClose={() => setCreateOpen(false)} onCreated={refresh} />}
    </div>
  )
}

function SessionCard({ session, href, mask }: { session: Session; href: string; mask: (v: string) => string }) {
  const isActive = session.status === 'active'
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 transition-colors hover:bg-zinc-900"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-zinc-100">{session.title}</span>
            <Badge tone={isActive ? 'green' : 'neutral'}>
              {isActive ? '进行中' : '已结束'}
            </Badge>
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500">
            {RAKE_MODE_SHORT[session.rake_mode]}
            {session.stakes ? ` · ${session.stakes}` : ''}
            {session.shareholder ? ` · ${session.shareholder}` : ''}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-zinc-500">货币</div>
          <div className="text-xs font-medium text-zinc-300">{session.currency}</div>
        </div>
      </div>
    </Link>
  )
}

function CreateSessionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState(todayTitle())
  const [rakeMode, setRakeMode] = useState<RakeMode>('profit_percentage')
  const [rakeRate, setRakeRate] = useState('0.05')
  const [stakes, setStakes] = useState('')
  const [currency, setCurrency] = useState('CNY')
  const [shareholder, setShareholder] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleCreate() {
    setBusy(true)
    try {
      const { createSession } = await import('@/lib/api')
      await createSession({
        title: title.trim() || todayTitle(),
        rake_mode: rakeMode,
        rake_rate: rakeMode === 'profit_percentage' ? Number(rakeRate) : 0,
        stakes: stakes.trim() || undefined,
        currency,
        shareholder: shareholder.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onCreated()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="新建牌局场次">
      <div className="space-y-4">
        <Field label="场次名称">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={todayTitle()} className={inputClass} />
        </Field>

        <Field label="抽水模式">
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
            {(Object.keys(RAKE_MODE_LABELS) as RakeMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setRakeMode(m)}
                className={`min-h-9 cursor-pointer rounded-lg text-[11px] font-semibold transition-colors ${
                  rakeMode === m ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {RAKE_MODE_SHORT[m]}
              </button>
            ))}
          </div>
        </Field>

        {rakeMode === 'profit_percentage' && (
          <Field label="抽水比例">
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={rakeRate}
                onChange={(e) => setRakeRate(e.target.value)}
                className={inputClass}
              />
              <div className="flex gap-1">
                {[0.03, 0.05, 0.1].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRakeRate(String(r))}
                    className={`h-11 w-12 cursor-pointer rounded-lg border text-xs font-semibold transition-colors ${
                      Number(rakeRate) === r
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                        : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {(r * 100).toFixed(0)}%
                  </button>
                ))}
              </div>
            </div>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="盲注级别">
            <input value={stakes} onChange={(e) => setStakes(e.target.value)} placeholder="如 1/2" className={inputClass} />
          </Field>
          <Field label="货币">
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="CNY" className={inputClass} />
          </Field>
        </div>

        <Field label="归属股东">
          <input value={shareholder} onChange={(e) => setShareholder(e.target.value)} placeholder="可选" className={inputClass} />
        </Field>

        <Field label="备注">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="可选" className={inputClass} />
        </Field>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">取消</Button>
          <Button onClick={handleCreate} disabled={busy} className="flex-1">
            {busy ? '创建中…' : '开始记分'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
