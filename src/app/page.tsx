'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  PlayCircle,
  CheckCircle,
  Clock,
  ChevronRight,
  Calendar,
  Coins,
  Landmark,
  FileText,
} from 'lucide-react'
import type { Session, RakeMode, AppConfig } from '@/lib/types'
import { listSessions, loadBundle, createSession, getAppConfigs } from '@/lib/api'
import { fmtMoney, fmtSigned, fmtDate, todayTitle } from '@/lib/format'
import { RAKE_MODE_LABELS, RAKE_MODE_SHORT } from '@/lib/types'
import { Badge, Button, Field, Modal, Spinner, inputClass, Stat, EmptyState } from '@/components/ui'
import { usePrivacy } from '@/components/PrivacyContext'

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
        <div>
          <h1 className="text-lg font-bold text-zinc-100">数据看板</h1>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' })}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          新建场次
        </Button>
      </div>

      {/* Stats overview */}
      {sessions.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <Stat
            label="进行中"
            value={String(active.length)}
            tone={active.length > 0 ? 'positive' : 'neutral'}
            icon={<PlayCircle className="h-3 w-3" />}
          />
          <Stat
            label="已结束"
            value={String(ended.length)}
            icon={<CheckCircle className="h-3 w-3" />}
          />
          <Stat
            label="总场次"
            value={String(sessions.length)}
            icon={<Clock className="h-3 w-3" />}
          />
        </div>
      )}

      {/* Active sessions */}
      {active.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            进行中
          </h2>
          <div className="space-y-2">
            {active.map((s) => (
              <SessionCard key={s.id} session={s} mask={mask} />
            ))}
          </div>
        </section>
      )}

      {/* Ended sessions */}
      {ended.length > 0 && (
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">历史场次</h2>
          <div className="space-y-2">
            {ended.slice(0, 10).map((s) => (
              <SessionCard key={s.id} session={s} mask={mask} />
            ))}
          </div>
          {ended.length > 10 && (
            <Link href="/history" className="mt-2 block text-center text-[11px] font-medium text-zinc-500 hover:text-zinc-300">
              查看全部 {ended.length} 条 →
            </Link>
          )}
        </section>
      )}

      {/* Empty state */}
      {sessions.length === 0 && (
        <EmptyState
          icon={<Calendar className="h-10 w-10" strokeWidth={1} />}
          title="还没有任何场次"
          sub="点击「新建场次」开始记分"
        />
      )}

      {/* Create session modal */}
      {createOpen && <CreateSessionModal onClose={() => setCreateOpen(false)} onCreated={refresh} />}
    </div>
  )
}

/* ================================================================
 * Session Card — compact, information-dense
 * ================================================================ */
function SessionCard({ session, mask }: { session: Session; mask: (v: string) => string }) {
  const isActive = session.status === 'active'
  return (
    <Link
      href={`/session/${session.id}`}
      className="block rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-zinc-100">{session.title}</span>
            <Badge tone={isActive ? 'green' : 'neutral'}>
              {isActive ? '进行中' : '已结束'}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-zinc-500">
            <span className="flex items-center gap-0.5">
              <Coins className="h-3 w-3" strokeWidth={1.5} />
              {RAKE_MODE_SHORT[session.rake_mode]}
            </span>
            {session.stakes && (
              <span className="flex items-center gap-0.5">
                <Landmark className="h-3 w-3" strokeWidth={1.5} />
                盲注 {session.stakes}
              </span>
            )}
            {session.shareholder && (
              <span className="flex items-center gap-0.5">
                <FileText className="h-3 w-3" strokeWidth={1.5} />
                {session.shareholder}
              </span>
            )}
            <span>{fmtDate(session.start_time)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.currency && (
            <span className="rounded-md bg-zinc-800/60 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
              {session.currency}
            </span>
          )}
          <ChevronRight className="h-4 w-4 text-zinc-600" />
        </div>
      </div>
    </Link>
  )
}

/* ================================================================
 * Create Session Modal — compact, settings-aware
 * ================================================================ */
function CreateSessionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState(todayTitle())
  const [rakeMode, setRakeMode] = useState<RakeMode>('profit_percentage')
  const [rakeRate, setRakeRate] = useState('0.05')
  const [stakes, setStakes] = useState('')
  const [currency, setCurrency] = useState('CNY')
  const [shareholder, setShareholder] = useState('')
  const [shareholders, setShareholders] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  // Load default configs on mount
  useEffect(() => {
    getAppConfigs().then((list) => {
      for (const c of list) {
        const val = typeof c.value === 'string' ? c.value : JSON.stringify(c.value)
        if (c.key === 'default_rake_mode') setRakeMode(JSON.parse(val) as RakeMode)
        if (c.key === 'default_stakes') setStakes(JSON.parse(val))
        if (c.key === 'default_currency') setCurrency(JSON.parse(val))
        if (c.key === 'shareholders') setShareholders(JSON.parse(val) as string[])
      }
    })
  }, [])

  async function handleCreate() {
    setBusy(true)
    try {
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
    <Modal open={true} onClose={onClose} title="新建牌局场次" subtitle="默认值已从系统设置读取">
      <div className="space-y-4">
        {/* Title */}
        <Field label="场次名称">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={todayTitle()} className={inputClass} />
        </Field>

        {/* Rake mode — segmented control */}
        <Field label="抽水模式">
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-zinc-800 bg-zinc-950/60 p-1">
            {(Object.keys(RAKE_MODE_LABELS) as RakeMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setRakeMode(m)}
                className={`min-h-9 cursor-pointer rounded-md text-[11px] font-semibold transition-all active:scale-[0.97] ${
                  rakeMode === m
                    ? 'bg-emerald-600/20 text-emerald-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {RAKE_MODE_SHORT[m]}
              </button>
            ))}
          </div>
        </Field>

        {/* Rake rate (mode 3 only) */}
        {rakeMode === 'profit_percentage' && (
          <Field label="抽水比例" hint="盈利百分比，如 0.05 = 5%">
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="1"
                value={rakeRate}
                onChange={(e) => setRakeRate(e.target.value)}
                className={inputClass}
              />
              <div className="flex gap-1">
                {[0.03, 0.05, 0.1].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRakeRate(String(r))}
                    className={`h-11 w-12 cursor-pointer rounded-md border text-[11px] font-semibold transition-all active:scale-[0.97] ${
                      Number(rakeRate) === r
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-700/60 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {(r * 100).toFixed(0)}%
                  </button>
                ))}
              </div>
            </div>
          </Field>
        )}

        {/* Stakes + Currency */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="盲注级别">
            <input value={stakes} onChange={(e) => setStakes(e.target.value)} placeholder="如 1/2" className={inputClass} />
          </Field>
          <Field label="货币">
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="CNY" className={inputClass} />
          </Field>
        </div>

        {/* Shareholder — select from list */}
        {shareholders.length > 0 && (
          <Field label="归属股东">
            <select
              value={shareholder}
              onChange={(e) => setShareholder(e.target.value)}
              className={inputClass}
            >
              <option value="">不指定</option>
              {shareholders.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        )}

        {/* Notes */}
        <Field label="备注" hint="可选">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="如：周五常规局" className={inputClass} />
        </Field>

        {/* Submit */}
        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1">取消</Button>
          <Button onClick={handleCreate} disabled={busy} className="flex-1">
            {busy ? '创建中…' : '创建场次'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
