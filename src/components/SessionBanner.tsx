'use client'

import { useState } from 'react'
import type { Session, SessionStats } from '@/lib/types'
import { RAKE_MODE_LABELS } from '@/lib/types'
import { fmtMoney, fmtSigned, fmtDate } from '@/lib/format'
import { Badge, Button, Modal, inputClass, Field } from './ui'

export function SessionBanner({
  session,
  sessions,
  stats,
  onCreateSession,
  onSelectSession,
  onEndSession,
}: {
  session: Session | null
  sessions: Session[]
  stats: SessionStats
  onCreateSession: () => void
  onSelectSession: (id: string) => void
  onEndSession: (boxTotal?: number) => Promise<void>
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [endOpen, setEndOpen] = useState(false)
  const [boxTotal, setBoxTotal] = useState('')
  const [ending, setEnding] = useState(false)

  const isActive = session?.status === 'active'

  async function handleEnd() {
    setEnding(true)
    try {
      const box = boxTotal.trim() === '' ? undefined : Number(boxTotal)
      await onEndSession(box)
      setEndOpen(false)
      setBoxTotal('')
    } finally {
      setEnding(false)
    }
  }

  const delta = stats.unaccountedDelta
  const deltaTone = Math.abs(delta) < 1 ? 'positive' : 'warn'

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto max-w-3xl px-3 pb-3 pt-3">
        {/* 标题行 */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-bold text-zinc-100">
                {session ? session.title : '暂无场次'}
              </h1>
              {session ? (
                <Badge tone={isActive ? 'green' : 'neutral'}>
                  {isActive ? '进行中' : '已结束'}
                </Badge>
              ) : null}
            </div>
            {session ? (
              <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                {RAKE_MODE_LABELS[session.rake_mode]}
                {session.rake_mode === 'profit_percentage'
                  ? ` · ${(Number(session.rake_rate) * 100).toFixed(1)}%`
                  : ''}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-zinc-500">点击右侧按钮创建第一场局</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setPickerOpen(true)}
              aria-label="切换场次"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/60 text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </button>
            {session ? (
              <Button variant="ghost" onClick={() => setEndOpen(true)} disabled={!isActive}>
                结束本场
              </Button>
            ) : null}
            <Button onClick={onCreateSession}>新建场次</Button>
          </div>
        </div>

        {/* 统计网格 */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MiniStat label="总带入" value={fmtMoney(stats.totalBuyins)} />
          <MiniStat label="总水费" value={fmtMoney(stats.totalRake)} tone="amber" />
          <MiniStat
            label="保险池纯盈亏"
            value={fmtSigned(stats.insuranceNet)}
            tone={stats.insuranceNet >= 0 ? 'green' : 'red'}
          />
          <MiniStat
            label="未结清人数"
            value={`${stats.unsettledCount} / ${stats.playerCount}`}
            tone={stats.unsettledCount > 0 ? 'amber' : 'green'}
          />
        </div>

        {/* 对账行 */}
        <div className="mt-2 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-[11px]">
          <span className="text-zinc-500">
            总退码 <span className="tabular-nums text-zinc-300">{fmtMoney(stats.totalCashout)}</span>
          </span>
          <span className="text-zinc-500">
            未平账差{' '}
            <span
              className={`tabular-nums font-semibold ${
                deltaTone === 'positive' ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {fmtSigned(delta)}
            </span>
          </span>
        </div>
      </div>

      {/* 场次选择器 */}
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="选择场次">
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">还没有任何场次</p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onSelectSession(s.id)
                  setPickerOpen(false)
                }}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors ${
                  s.id === session?.id
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800'
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-100">{s.title}</div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">
                    {fmtDate(s.start_time)} · {RAKE_MODE_LABELS[s.rake_mode].split(' · ')[0]}
                  </div>
                </div>
                <Badge tone={s.status === 'active' ? 'green' : 'neutral'}>
                  {s.status === 'active' ? '进行中' : '已结束'}
                </Badge>
              </button>
            ))
          )}
        </div>
      </Modal>

      {/* 结束场次 */}
      <Modal open={endOpen} onClose={() => setEndOpen(false)} title="结束本场">
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            结束场次后会记录结束时间。若为「模式2 · 水箱计数」，请在下方录入水箱总数。
          </p>
          {session?.rake_mode === 'box_count' ? (
            <Field label="水箱总筹码">
              <input
                type="number"
                inputMode="decimal"
                value={boxTotal}
                onChange={(e) => setBoxTotal(e.target.value)}
                placeholder={`当前：${session.box_total_chips}`}
                className={inputClass}
              />
            </Field>
          ) : null}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEndOpen(false)} className="flex-1">
              取消
            </Button>
            <Button variant="danger" onClick={handleEnd} disabled={ending} className="flex-1">
              {ending ? '处理中…' : '确认结束'}
            </Button>
          </div>
        </div>
      </Modal>
    </header>
  )
}

function MiniStat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'green' | 'red' | 'amber'
}) {
  const tones: Record<string, string> = {
    neutral: 'text-zinc-100',
    green: 'text-emerald-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2">
      <div className="text-[10px] font-medium text-zinc-500">{label}</div>
      <div className={`mt-0.5 text-sm font-bold tabular-nums ${tones[tone]}`}>{value}</div>
    </div>
  )
}