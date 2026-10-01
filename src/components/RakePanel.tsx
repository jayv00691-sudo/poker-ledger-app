'use client'

import { useState } from 'react'
import type { DealerShift, PlayerCard, Session } from '@/lib/types'
import { fmtMoney, fmtSigned, fmtTime } from '@/lib/format'
import { Badge, Button, Field, Modal, inputClass } from './ui'

export function RakePanel({
  session,
  shifts,
  players,
  totalRake,
  busy,
  onAddShift,
  onDeleteShift,
  onUpdateBoxTotal,
}: {
  session: Session | null
  shifts: DealerShift[]
  players: PlayerCard[]
  totalRake: number
  busy: boolean
  onAddShift: (input: {
    dealer_name: string
    rake_chips: number
    tip_chips: number
  }) => Promise<void>
  onDeleteShift: (id: string) => Promise<void>
  onUpdateBoxTotal: (total: number) => Promise<void>
}) {
  const [shiftOpen, setShiftOpen] = useState(false)
  const [dealerName, setDealerName] = useState('')
  const [rakeChips, setRakeChips] = useState('')
  const [tipChips, setTipChips] = useState('')
  const [boxInput, setBoxInput] = useState('')
  const [working, setWorking] = useState(false)

  const disabled = busy || !session || session.status !== 'active'

  const shiftRake = shifts.reduce((s, d) => s + Number(d.rake_chips ?? 0), 0)
  const shiftTips = shifts.reduce((s, d) => s + Number(d.tip_chips ?? 0), 0)

  async function submitShift() {
    const name = dealerName.trim() || '荷官'
    const rake = Number(rakeChips)
    const tip = tipChips.trim() === '' ? 0 : Number(tipChips)
    if (!Number.isFinite(rake)) return
    setWorking(true)
    try {
      await onAddShift({ dealer_name: name, rake_chips: rake, tip_chips: tip })
      setDealerName('')
      setRakeChips('')
      setTipChips('')
      setShiftOpen(false)
    } finally {
      setWorking(false)
    }
  }

  async function submitBox() {
    const total = Number(boxInput)
    if (!Number.isFinite(total) || total < 0) return
    setWorking(true)
    try {
      await onUpdateBoxTotal(total)
      setBoxInput('')
    } finally {
      setWorking(false)
    }
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-10 text-center text-sm text-zinc-500">
        请先创建一场牌局
      </div>
    )
  }

  return (
    <section className="space-y-3">
      {/* 汇总 */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-zinc-500">本场累计水费</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-amber-400">
              {fmtMoney(totalRake)}
            </div>
          </div>
          <Badge tone="amber">{modeShort(session)}</Badge>
        </div>
      </div>

      {/* 模式1 · 荷官按小时抽水 */}
      {session.rake_mode === 'dealer_shift' ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2">
              <div className="text-[10px] text-zinc-500">抽水合计</div>
              <div className="mt-0.5 text-sm font-bold tabular-nums text-zinc-100">
                {fmtMoney(shiftRake)}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2">
              <div className="text-[10px] text-zinc-500">小费合计</div>
              <div className="mt-0.5 text-sm font-bold tabular-nums text-zinc-100">
                {fmtMoney(shiftTips)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">荷官交接班次</h3>
            <Button variant="ghost" onClick={() => setShiftOpen(true)} disabled={disabled}>
              录入班次
            </Button>
          </div>

          {shifts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
              每个整点交接班时录入一次抽水筹码
            </div>
          ) : (
            <ul className="space-y-2">
              {shifts.map((d, i) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 px-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">第 {i + 1} 班</Badge>
                      <span className="truncate text-sm font-medium text-zinc-100">
                        {d.dealer_name}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-500">
                      {fmtTime(d.start_time)}
                      {d.end_time ? ` — ${fmtTime(d.end_time)}` : ' 起'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-bold tabular-nums text-amber-400">
                        {fmtMoney(Number(d.rake_chips))}
                      </div>
                      {Number(d.tip_chips) > 0 ? (
                        <div className="text-[11px] text-zinc-500">
                          小费 {fmtMoney(Number(d.tip_chips))}
                        </div>
                      ) : null}
                    </div>
                    <button
                      onClick={() => onDeleteShift(d.id)}
                      disabled={disabled}
                      aria-label="删除该班次"
                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      {/* 模式2 · 水箱计数 */}
      {session.rake_mode === 'box_count' ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h3 className="text-sm font-semibold text-zinc-300">水箱总数</h3>
          <p className="mt-1 text-[11px] text-zinc-500">
            散场后清点实物水箱，录入总筹码数即本场水费。
          </p>
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={boxInput}
              onChange={(e) => setBoxInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitBox()}
              placeholder={`当前：${fmtMoney(Number(session.box_total_chips ?? 0))}`}
              className={inputClass}
            />
            <Button onClick={submitBox} disabled={disabled || working || boxInput === ''}>
              {working ? '保存中…' : '保存'}
            </Button>
          </div>
        </div>
      ) : null}

      {/* 模式3 · 盈利百分比 */}
      {session.rake_mode === 'profit_percentage' ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300">离场自动扣水明细</h3>
            <Badge tone="amber">{(Number(session.rake_rate ?? 0) * 100).toFixed(1)}%</Badge>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            仅对已结算且盈利的玩家按盈利部分扣水，系统实时汇总。
          </p>

          {players.filter((p) => p.record.is_settled).length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">暂无已结算玩家</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {players
                .filter((p) => p.record.is_settled)
                .map((p) => (
                  <li
                    key={p.record.id}
                    className="flex items-center justify-between rounded-xl bg-zinc-950/60 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-zinc-200">{p.member.name}</div>
                      <div className="text-[11px] text-zinc-500">
                        盈亏 {fmtSigned(p.netPnl + p.rake)} · 水 {fmtMoney(p.rake)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums text-amber-400">
                      {fmtMoney(p.rake)}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>
      ) : null}

      {/* 录入班次 */}
      <Modal open={shiftOpen} onClose={() => setShiftOpen(false)} title="录入荷官班次">
        <div className="space-y-4">
          <Field label="荷官姓名">
            <input
              value={dealerName}
              onChange={(e) => setDealerName(e.target.value)}
              placeholder="例如：小李"
              className={inputClass}
            />
          </Field>
          <Field label="抽水筹码">
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={rakeChips}
                onChange={(e) => setRakeChips(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            {[500, 1000, 2000].map((a) => (
              <button
                key={a}
                onClick={() => setRakeChips(String(a))}
                className="min-h-11 cursor-pointer rounded-xl border border-zinc-700 bg-zinc-800/60 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                {a}
              </button>
            ))}
          </div>
          <Field label="小费筹码（可选）">
            <input
              type="number"
              inputMode="decimal"
              value={tipChips}
              onChange={(e) => setTipChips(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </Field>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setShiftOpen(false)}>
              取消
            </Button>
            <Button className="flex-1" onClick={submitShift} disabled={working || rakeChips === ''}>
              {working ? '保存中…' : '确认录入'}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}

function modeShort(session: Session): string {
  switch (session.rake_mode) {
    case 'dealer_shift':
      return '模式1 · 按班抽水'
    case 'box_count':
      return '模式2 · 水箱计数'
    case 'profit_percentage':
      return '模式3 · 盈利百分比'
  }
}