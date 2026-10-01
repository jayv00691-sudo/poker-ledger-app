'use client'

import { useMemo, useState } from 'react'
import type { Buyin, Member, PlayerCard, Session } from '@/lib/types'
import { fmtMoney, fmtSigned, fmtTime } from '@/lib/format'
import { Badge, Button, Field, Modal, inputClass } from './ui'

const QUICK_AMOUNTS = [1000, 2000, 5000]

export function PlayerList({
  session,
  players,
  members,
  buyins,
  busy,
  onAddPlayer,
  onCreateMember,
  onBuyin,
  onDeleteBuyin,
  onSettle,
  onUnsettle,
}: {
  session: Session | null
  players: PlayerCard[]
  members: Member[]
  buyins: Buyin[]
  busy: boolean
  onAddPlayer: (memberId: string) => Promise<void>
  onCreateMember: (name: string, wechat: string) => Promise<void>
  onBuyin: (recordId: string, amount: number) => Promise<void>
  onDeleteBuyin: (buyinId: string) => Promise<void>
  onSettle: (recordId: string, cashout: number) => Promise<void>
  onUnsettle: (recordId: string) => Promise<void>
}) {
  const [buyinTarget, setBuyinTarget] = useState<PlayerCard | null>(null)
  const [settleTarget, setSettleTarget] = useState<PlayerCard | null>(null)
  const [historyTarget, setHistoryTarget] = useState<PlayerCard | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const [customAmount, setCustomAmount] = useState('')
  const [cashout, setCashout] = useState('')
  const [newName, setNewName] = useState('')
  const [newWechat, setNewWechat] = useState('')
  const [working, setWorking] = useState(false)

  const joinedIds = useMemo(
    () => new Set(players.map((p) => p.member.id)),
    [players],
  )
  const available = useMemo(
    () => members.filter((m) => !joinedIds.has(m.id)),
    [members, joinedIds],
  )

  const buyinsByRecord = useMemo(() => {
    const map = new Map<string, Buyin[]>()
    for (const b of buyins) {
      const list = map.get(b.player_record_id) ?? []
      list.push(b)
      map.set(b.player_record_id, list)
    }
    return map
  }, [buyins])

  const disabled = busy || !session || session.status !== 'active'

  /* ----------------------------- actions ----------------------------- */

  async function quickBuyin(amount: number) {
    if (!buyinTarget) return
    setWorking(true)
    try {
      await onBuyin(buyinTarget.record.id, amount)
      setBuyinTarget(null)
      setCustomAmount('')
    } finally {
      setWorking(false)
    }
  }

  async function submitCustom() {
    const amount = Number(customAmount)
    if (!Number.isFinite(amount) || amount === 0) return
    await quickBuyin(amount)
  }

  async function submitSettle() {
    if (!settleTarget) return
    const amount = Number(cashout)
    if (!Number.isFinite(amount) || amount < 0) return
    setWorking(true)
    try {
      await onSettle(settleTarget.record.id, amount)
      setSettleTarget(null)
      setCashout('')
    } finally {
      setWorking(false)
    }
  }

  async function submitNewMember() {
    const name = newName.trim()
    if (!name) return
    setWorking(true)
    try {
      await onCreateMember(name, newWechat.trim())
      setNewName('')
      setNewWechat('')
    } finally {
      setWorking(false)
    }
  }

  /* ---------------------------- settle math --------------------------- */

  const settlePreview = useMemo(() => {
    if (!settleTarget || !session) return null
    const amount = Number(cashout)
    if (!Number.isFinite(amount)) return null
    const profit = Math.max(0, amount - settleTarget.totalBuyins)
    const rake =
      session.rake_mode === 'profit_percentage' ? profit * Number(session.rake_rate ?? 0) : 0
    return { profit, rake, net: amount - settleTarget.totalBuyins - rake }
  }, [settleTarget, cashout, session])

  return (
    <section className="space-y-3">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300">
          玩家列表
          <span className="ml-2 text-[11px] font-normal text-zinc-500">
            共 {players.length} 人
          </span>
        </h2>
        <Button
          variant="ghost"
          onClick={() => setAddOpen(true)}
          disabled={!session || session.status !== 'active'}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M12 5v14M5 12h14" />
          </svg>
          添加玩家
        </Button>
      </div>

      {/* 玩家卡片 */}
      {players.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-10 text-center">
          <p className="text-sm text-zinc-500">
            {session ? '还没有玩家入座，点击「添加玩家」开始记分' : '请先创建一场牌局'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {players.map((p) => {
            const settled = p.record.is_settled
            const rows = buyinsByRecord.get(p.record.id) ?? []
            return (
              <li
                key={p.record.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-zinc-100">
                        {p.member.name}
                      </span>
                      <Badge tone={settled ? 'neutral' : 'green'}>
                        {settled ? '已结清' : '进行中'}
                      </Badge>
                    </div>
                    <button
                      onClick={() => setHistoryTarget(p)}
                      className="mt-1 cursor-pointer text-[11px] text-zinc-500 underline-offset-2 transition-colors hover:text-zinc-300 hover:underline"
                    >
                      {rows.length} 笔买入记录 · 查看明细
                    </button>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] text-zinc-500">净盈亏</div>
                    <div
                      className={`text-lg font-bold tabular-nums ${
                        p.netPnl > 0
                          ? 'text-emerald-400'
                          : p.netPnl < 0
                            ? 'text-red-400'
                            : 'text-zinc-300'
                      }`}
                    >
                      {settled ? fmtSigned(p.netPnl) : '—'}
                    </div>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl bg-zinc-950/60 px-3 py-2 text-[11px]">
                  <Cell label="累计带入" value={fmtMoney(p.totalBuyins)} />
                  <Cell label="退码" value={settled ? fmtMoney(p.cashoutAmount) : '—'} />
                  <Cell
                    label={session?.rake_mode === 'profit_percentage' ? '水费' : '状态'}
                    value={
                      session?.rake_mode === 'profit_percentage'
                        ? fmtMoney(p.rake)
                        : settled
                          ? '已离场'
                          : '在场'
                    }
                  />
                </div>

                <div className="mt-2 flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setBuyinTarget(p)
                      setCustomAmount('')
                    }}
                    disabled={disabled}
                  >
                    买入
                  </Button>
                  {settled ? (
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => onUnsettle(p.record.id)}
                      disabled={disabled || working}
                    >
                      撤销结算
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      className="flex-1"
                      onClick={() => {
                        setSettleTarget(p)
                        setCashout(String(p.totalBuyins))
                      }}
                      disabled={disabled}
                    >
                      结算离场
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* 极速买入 */}
      <Modal
        open={!!buyinTarget}
        onClose={() => setBuyinTarget(null)}
        title={`买入 · ${buyinTarget?.member.name ?? ''}`}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-[11px] text-zinc-400">
            当前累计带入{' '}
            <span className="font-semibold tabular-nums text-zinc-100">
              {fmtMoney(buyinTarget?.totalBuyins ?? 0)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => quickBuyin(a)}
                disabled={working}
                className="min-h-16 cursor-pointer rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-base font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
              >
                +{a}
              </button>
            ))}
          </div>
          <Field label="自定义金额">
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitCustom()}
                placeholder="输入金额"
                className={inputClass}
              />
              <Button onClick={submitCustom} disabled={working || !customAmount}>
                确认
              </Button>
            </div>
          </Field>
        </div>
      </Modal>

      {/* 结算离场 */}
      <Modal
        open={!!settleTarget}
        onClose={() => setSettleTarget(null)}
        title={`结算 · ${settleTarget?.member.name ?? ''}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
              <div className="text-zinc-500">累计带入</div>
              <div className="mt-0.5 text-sm font-bold tabular-nums text-zinc-100">
                {fmtMoney(settleTarget?.totalBuyins ?? 0)}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">
              <div className="text-zinc-500">预计盈亏</div>
              <div
                className={`mt-0.5 text-sm font-bold tabular-nums ${
                  (settlePreview?.net ?? 0) > 0
                    ? 'text-emerald-400'
                    : (settlePreview?.net ?? 0) < 0
                      ? 'text-red-400'
                      : 'text-zinc-300'
                }`}
              >
                {settlePreview ? fmtSigned(settlePreview.net) : '—'}
              </div>
            </div>
          </div>

          <Field label="离场退码金额">
            <input
              type="number"
              inputMode="decimal"
              value={cashout}
              onChange={(e) => setCashout(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitSettle()}
              placeholder="0"
              className={inputClass}
            />
          </Field>

          {settlePreview && settlePreview.rake > 0 ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300">
              模式3 盈利抽水 {(Number(session?.rake_rate ?? 0) * 100).toFixed(1)}% · 盈利
              <span className="mx-1 font-semibold tabular-nums">
                {fmtMoney(settlePreview.profit)}
              </span>
              → 扣水
              <span className="mx-1 font-semibold tabular-nums">{fmtMoney(settlePreview.rake)}</span>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setSettleTarget(null)}>
              取消
            </Button>
            <Button
              variant="success"
              className="flex-1"
              onClick={submitSettle}
              disabled={working || cashout === ''}
            >
              {working ? '处理中…' : '确认结算'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 买入明细 */}
      <Modal
        open={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        title={`买入明细 · ${historyTarget?.member.name ?? ''}`}
      >
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {(buyinsByRecord.get(historyTarget?.record.id ?? '') ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">暂无买入记录</p>
          ) : (
            (buyinsByRecord.get(historyTarget?.record.id ?? '') ?? []).map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2"
              >
                <div>
                  <div className="text-sm font-semibold tabular-nums text-zinc-100">
                    {fmtMoney(Number(b.amount))}
                  </div>
                  <div className="text-[11px] text-zinc-500">{fmtTime(b.timestamp)}</div>
                </div>
                <button
                  onClick={() => onDeleteBuyin(b.id)}
                  disabled={disabled}
                  aria-label="删除该笔买入"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* 添加玩家 */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="添加玩家">
        <div className="space-y-4">
          {available.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-400">从历史成员中选择</p>
              <div className="max-h-52 space-y-2 overflow-y-auto">
                {available.map((m) => (
                  <button
                    key={m.id}
                    onClick={async () => {
                      setWorking(true)
                      try {
                        await onAddPlayer(m.id)
                      } finally {
                        setWorking(false)
                      }
                    }}
                    disabled={working}
                    className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-left transition-colors hover:bg-zinc-800 disabled:opacity-50"
                  >
                    <span className="text-sm font-medium text-zinc-100">{m.name}</span>
                    <span className="text-[11px] text-zinc-500">入座</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="border-t border-zinc-800 pt-4">
            <p className="mb-2 text-xs font-medium text-zinc-400">新建成员</p>
            <div className="space-y-3">
              <Field label="姓名">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如：老王"
                  className={inputClass}
                />
              </Field>
              <Field label="微信号（可选）">
                <input
                  value={newWechat}
                  onChange={(e) => setNewWechat(e.target.value)}
                  placeholder="微信号"
                  className={inputClass}
                />
              </Field>
              <Button
                className="w-full"
                onClick={submitNewMember}
                disabled={working || !newName.trim()}
              >
                创建并加入本场
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </section>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-zinc-500">{label}</div>
      <div className="mt-0.5 font-semibold tabular-nums text-zinc-200">{value}</div>
    </div>
  )
}