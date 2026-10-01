'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  History,
  ChevronRight,
  Scale,
  Coins,
  Clock3,
  User,
  FileText,
  Search,
} from 'lucide-react'
import type { Session, RakeMode } from '@/lib/types'
import { RAKE_MODE_SHORT } from '@/lib/types'
import { listSessions } from '@/lib/api'
import { fmtDate, fmtMoney } from '@/lib/format'
import { Badge, Spinner } from '@/components/ui'

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [modeFilter, setModeFilter] = useState<RakeMode | 'all'>('all')

  useEffect(() => {
    listSessions().then(setSessions).finally(() => setLoading(false))
  }, [])

  const ended = useMemo(
    () =>
      sessions
        .filter((s) => s.status === 'ended')
        .filter((s) => modeFilter === 'all' || s.rake_mode === modeFilter)
        .filter((s) => {
          if (!query.trim()) return true
          const q = query.trim().toLowerCase()
          return (
            s.title.toLowerCase().includes(q) ||
            (s.shareholder ?? '').toLowerCase().includes(q) ||
            (s.stakes ?? '').toLowerCase().includes(q)
          )
        })
        .sort((a, b) => new Date(b.end_time ?? b.start_time).getTime() - new Date(a.end_time ?? a.start_time).getTime()),
    [sessions, query, modeFilter]
  )

  /* 汇总指标 */
  const totals = useMemo(() => {
    if (ended.length === 0) return null
    return {
      count: ended.length,
      first: fmtDate(ended[ended.length - 1].start_time),
      last: fmtDate(ended[0].start_time),
      modes: new Set(ended.map((s) => s.rake_mode)).size,
      shareholders: new Set(ended.map((s) => s.shareholder).filter(Boolean) as string[]).size,
    }
  }, [ended])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-zinc-400">
        <Spinner />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-4 pb-24">
      {/* Title */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold text-zinc-100">
          <History className="h-5 w-5 text-emerald-500" />
          历史战报
        </h1>
        {totals && (
          <span className="text-[11px] tabular-nums text-zinc-500">
            {totals.count} 场 · {totals.first} → {totals.last}
          </span>
        )}
      </div>

      {/* Summary strip */}
      {totals && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5">
            <div className="text-[9px] font-medium uppercase tracking-wider text-zinc-500">场次总数</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums text-zinc-100">{totals.count}</div>
          </div>
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5">
            <div className="text-[9px] font-medium uppercase tracking-wider text-zinc-500">抽水模式</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums text-zinc-100">{totals.modes}</div>
          </div>
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5">
            <div className="text-[9px] font-medium uppercase tracking-wider text-zinc-500">归属股东</div>
            <div className="mt-0.5 text-lg font-bold tabular-nums text-zinc-100">{totals.shareholders}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索场次标题、股东、盲注…"
            className="w-full min-h-10 rounded-xl border border-zinc-800 bg-zinc-900/50 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={modeFilter === 'all'} onClick={() => setModeFilter('all')}>全部</FilterChip>
          <FilterChip active={modeFilter === 'dealer_shift'} onClick={() => setModeFilter('dealer_shift')}>
            荷官抽水
          </FilterChip>
          <FilterChip active={modeFilter === 'box_count'} onClick={() => setModeFilter('box_count')}>
            水箱计数
          </FilterChip>
          <FilterChip active={modeFilter === 'profit_percentage'} onClick={() => setModeFilter('profit_percentage')}>
            盈利百分比
          </FilterChip>
        </div>
      </div>

      {/* List */}
      {ended.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 px-4 py-14 text-center">
          <Scale className="mb-2 h-8 w-8 text-zinc-700" />
          <p className="text-sm text-zinc-500">
            {sessions.some((s) => s.status === 'ended') ? '没有匹配筛选条件的场次' : '还没有已结束的场次'}
          </p>
          <p className="mt-1 text-[11px] text-zinc-600">结束场次后会自动归档到这里</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ended.map((s) => (
            <Link
              key={s.id}
              href={`/session/${s.id}/settle`}
              className="group block rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3.5 transition-all hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-zinc-100 group-hover:text-emerald-400">
                        {s.title}
                      </span>
                      <Badge tone="neutral">已结束</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3 w-3" /> {fmtDate(s.start_time)}
                        {s.end_time && ` – ${fmtDate(s.end_time)}`}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Scale className="h-3 w-3" /> {RAKE_MODE_SHORT[s.rake_mode]}
                      </span>
                      {s.stakes && (
                        <span className="inline-flex items-center gap-1">
                          <Coins className="h-3 w-3" /> {s.stakes}
                        </span>
                      )}
                      {s.shareholder && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" /> {s.shareholder}
                        </span>
                      )}
                      {s.notes && (
                        <span className="inline-flex items-center gap-1 truncate max-w-[120px]">
                          <FileText className="h-3 w-3 shrink-0" /> {s.notes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[10px] text-zinc-600">{s.currency}</span>
                  <ChevronRight className="h-4 w-4 text-zinc-600 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-500" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/* ================================================================
 * FilterChip
 * ================================================================ */
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-3 py-1 text-[11px] font-medium transition-all active:scale-[0.97] ${
        active
          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
          : 'border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {children}
    </button>
  )
}
