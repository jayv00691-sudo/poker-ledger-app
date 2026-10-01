'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  PlayCircle,
  CheckCircle,
  ChevronRight,
  Coins,
  Landmark,
  FileText,
  Wallet,
  Scale,
  ArrowRightLeft,
  Loader2,
} from 'lucide-react'
import type { Session, RakeMode, AppConfig, SessionStats } from '@/lib/types'
import { RAKE_MODE_LABELS, RAKE_MODE_SHORT } from '@/lib/types'
import { listSessions, loadBundle, createSession, getAppConfigs } from '@/lib/api'
import { fmtMoney, fmtSigned, fmtDate, todayTitle } from '@/lib/format'
import { Badge, Button, Field, Modal, Spinner, inputClass, Stat, EmptyState } from '@/components/ui'
import { usePrivacy } from '@/components/PrivacyContext'

/* ================================================================
 * 本局信息（主页）
 * 主卡片（当前活跃场次 / 空态）+ 2x2 数据分组 + 近期交易
 * ================================================================ */
export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [activeStats, setActiveStats] = useState<SessionStats | null>(null)
  const { mask } = usePrivacy()

  const refresh = useCallback(async () => {
    try {
      const data = await listSessions()
      setSessions(data)
      // 活跃场次 → 拉统计
      const active = data.find((s) => s.status === 'active')
      if (active) {
        const bundle = await loadBundle(active.id)
        setActiveStats(bundle.stats)
      } else {
        setActiveStats(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-3 text-slate-400">
        <Spinner />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  const active = sessions.filter((s) => s.status === 'active')
  const ended = sessions.filter((s) => s.status === 'ended')
  const current = active[0] ?? null

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-lg font-bold text-slate-900">本局信息</h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              weekday: 'short',
            })}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          新建场次
        </Button>
      </div>

      {/* 主卡片：当前活跃场次 / 空态 */}
      {current ? (
        <Link
          href={`/session/${current.id}`}
          className="card block p-4 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="truncate text-base font-bold text-slate-900">
                {current.title}
              </span>
              <Badge tone="blue">进行中</Badge>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Coins className="h-3 w-3" />
              {RAKE_MODE_SHORT[current.rake_mode]}
            </span>
            {current.stakes && (
              <span className="flex items-center gap-1">
                <Landmark className="h-3 w-3" />
                盲注 {current.stakes}
              </span>
            )}
            {current.shareholder && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {current.shareholder}
              </span>
            )}
            <span>{fmtDate(current.start_time)}</span>
          </div>
        </Link>
      ) : (
        <EmptyState
          icon={<PlayCircle className="h-10 w-10" strokeWidth={1} />}
          title="当前没有进行中的场次"
          sub="点「新建场次」开局，或从下方历史进入"
        />
      )}

      {/* 2x2 数据分组 */}
      {activeStats && current && (
        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="总买入"
            value={mask(fmtMoney(activeStats.totalBuyins))}
            tone="neutral"
            icon={<Wallet className="h-3 w-3" />}
          />
          <Stat
            label="总退码"
            value={mask(fmtMoney(activeStats.totalCashout))}
            icon={<ArrowRightLeft className="h-3 w-3" />}
          />
          <Stat
            label="总抽水"
            value={mask(fmtMoney(activeStats.totalRake))}
            icon={<Scale className="h-3 w-3" />}
          />
          <Stat
            label="未对账差额"
            value={mask(fmtSigned(activeStats.unaccountedDelta))}
            tone={activeStats.unaccountedDelta !== 0 ? 'warn' : 'positive'}
          />
        </div>
      )}

      {/* 近期交易（历史场次） */}
      {ended.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              近期场次
            </h2>
            <Link
              href="/history"
              className="text-[11px] font-medium text-blue-600 hover:text-blue-500"
            >
              全部 {ended.length} 条 →
            </Link>
          </div>
          <div className="card divide-y divide-slate-100">
            {ended.slice(0, 5).map((s) => (
              <Link
                key={s.id}
                href={`/session/${s.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-slate-800">
                      {s.title}
                    </span>
                    <Badge tone="neutral">已结束</Badge>
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400">
                    {fmtDate(s.start_time)} · {RAKE_MODE_SHORT[s.rake_mode]}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 创建 Modal */}
      {createOpen && (
        <CreateSessionModal onClose={() => setCreateOpen(false)} onCreated={refresh} />
      )}
    </div>
  )
}

/* ================================================================
 * 新建场次 Modal — 仅 dealer_shift / box_count
 * ================================================================ */
function CreateSessionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState(todayTitle())
  const [rakeMode, setRakeMode] = useState<RakeMode>('dealer_shift')
  const [stakes, setStakes] = useState('')
  const [currency, setCurrency] = useState('CNY')
  const [shareholder, setShareholder] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getAppConfigs().then((list) => {
      for (const c of list) {
        const val = typeof c.value === 'string' ? c.value : JSON.stringify(c.value)
        if (c.key === 'default_rake_mode') {
          const mode = JSON.parse(val) as RakeMode
          if (mode === 'dealer_shift' || mode === 'box_count') setRakeMode(mode)
        }
        if (c.key === 'default_stakes') setStakes(JSON.parse(val))
        if (c.key === 'default_currency') setCurrency(JSON.parse(val))
      }
    })
  }, [])

  async function handleCreate() {
    setBusy(true)
    try {
      await createSession({
        title: title.trim() || todayTitle(),
        rake_mode: rakeMode,
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
        <Field label="场次名称">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={todayTitle()}
            className={inputClass}
          />
        </Field>

        {/* 抽水模式 — 仅两种 */}
        <Field label="抽水记录方式">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {(['dealer_shift', 'box_count'] as RakeMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setRakeMode(m)}
                className={`min-h-9 rounded-lg text-[11px] font-semibold transition-all ${
                  rakeMode === m
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {RAKE_MODE_SHORT[m]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            {rakeMode === 'dealer_shift'
              ? '每轮荷官计时，手动录入抽水'
              : '结束时统计桌上总筹码，自动扣减为抽水'}
          </p>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="盲注级别">
            <input
              value={stakes}
              onChange={(e) => setStakes(e.target.value)}
              placeholder="如 1/2"
              className={inputClass}
            />
          </Field>
          <Field label="货币">
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="CNY"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="股东" hint="本局负责人">
          <input
            value={shareholder}
            onChange={(e) => setShareholder(e.target.value)}
            placeholder="如 老王"
            className={inputClass}
          />
        </Field>

        <Field label="备注">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="选填"
            className={`${inputClass} min-h-16`}
          />
        </Field>

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button onClick={handleCreate} disabled={busy} className="flex-1">
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 创建中…
              </>
            ) : (
              '创建场次'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
