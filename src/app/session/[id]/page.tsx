'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Buyin, Member, PlayerCard, RakeMode, Session } from '@/lib/types'
import { RAKE_MODE_LABELS } from '@/lib/types'
import type { SessionBundle } from '@/lib/api'
import {
  addBuyin,
  createMember,
  deleteBuyin,
  joinSession,
  loadBundle,
  settlePlayer,
  unsettlePlayer,
} from '@/lib/api'
import { fmtMoney, fmtSigned, fmtTime } from '@/lib/format'
import { Badge, Button, Field, Modal, Spinner, inputClass } from '@/components/ui'
import { usePrivacy } from '@/components/PrivacyContext'

/* ================================================================
 * Session Table — High-density poker cockpit
 * Design: zinc-900/950 base · emerald-600 accent · Phosphor icons
 * Density: grid-cols-2 → 3 → 5, settled players collapsed @ opacity-60
 * ================================================================ */

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const sessionId = params.id
  const { mask } = usePrivacy()

  const [bundle, setBundle] = useState<SessionBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [joinOpen, setJoinOpen] = useState(false)
  const [buyinOpen, setBuyinOpen] = useState(false)
  const [settleOpen, setSettleOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerCard | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const data = await loadBundle(sessionId)
      setBundle(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => { refresh() }, [refresh])

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }, [refresh])

  const session = bundle?.session ?? null
  const players = bundle?.players ?? []

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-zinc-500">
        <Spinner />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-12 text-center">
        <p className="text-sm text-zinc-500">场次不存在</p>
        <Link href="/" className="mt-3 inline-block text-sm font-medium text-emerald-500 transition-colors hover:text-emerald-400">
          返回看板
        </Link>
      </div>
    )
  }

  const activePlayers = players.filter((p: PlayerCard) => !p.record.is_settled)
  const settledPlayers = players.filter((p: PlayerCard) => p.record.is_settled)

  return (
    <div className="mx-auto max-w-3xl px-3 py-3 pb-24">
      {/* Session header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-zinc-500 transition-colors hover:text-zinc-300">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M15 18l-6-6 6-6" /></svg>
            </Link>
            <h1 className="truncate text-sm font-semibold tracking-tight text-zinc-100">{session.title}</h1>
            <Badge tone={session.status === 'active' ? 'green' : 'neutral'}>
              {session.status === 'active' ? '进行中' : '已结束'}
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {RAKE_MODE_LABELS[session.rake_mode]}
            {session.stakes ? ` · ${session.stakes}` : ''}
            {session.shareholder ? ` · ${session.shareholder}` : ''}
          </p>
        </div>
        <Link href={`/session/${session.id}/settle`} className="shrink-0">
          <Button variant="ghost" className="text-xs">局末结算</Button>
        </Link>
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-400">
          {error}
        </div>
      )}

      {/* Unified action bar */}
      {session.status === 'active' && (
        <div className="mb-3 flex gap-2">
          <Button onClick={() => setJoinOpen(true)} className="flex-1">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
            新玩家入场
          </Button>
          <div className="relative flex-1">
            <Button
              onClick={() => setBuyinOpen(!buyinOpen)}
              variant="success"
              className="w-full"
              disabled={activePlayers.length === 0}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
              极速加码
              <svg viewBox="0 0 24 24" className="h-3 w-3 opacity-60" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M6 9l6 6 6-6" /></svg>
            </Button>
            {buyinOpen && activePlayers.length > 0 && (
              <BuyinDropdown
                players={activePlayers}
                onClose={() => setBuyinOpen(false)}
                onSuccess={refresh}
              />
            )}
          </div>
        </div>
      )}

      {/* Active players — high-density grid */}
      {activePlayers.length > 0 && (
        <div className="mb-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
            {activePlayers.map((p) => (
              <PlayerSeat
                key={p.record.id}
                player={p}
                session={session}
                mask={mask}
                settled={false}
                onSettle={() => { setSelectedPlayer(p); setSettleOpen(true) }}
                disabled={busy}
              />
            ))}
          </div>
        </div>
      )}

      {/* Settled players — collapsed, reduced opacity */}
      {settledPlayers.length > 0 && (
        <details className="group">
          <summary className="mb-2 flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300">
            <svg viewBox="0 0 24 24" className="h-3 w-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M9 6l6 6-6 6" /></svg>
            已结算 ({settledPlayers.length})
          </summary>
          <div className="grid grid-cols-2 gap-2 opacity-60 transition-opacity md:grid-cols-3 lg:grid-cols-5">
            {settledPlayers.map((p) => (
              <PlayerSeat
                key={p.record.id}
                player={p}
                session={session}
                mask={mask}
                settled={true}
                onSettle={() => { setSelectedPlayer(p); setSettleOpen(true) }}
                disabled={busy}
              />
            ))}
          </div>
        </details>
      )}

      {players.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-10 text-center">
          <p className="text-sm text-zinc-500">还没有玩家入座</p>
          <p className="mt-1 text-[11px] text-zinc-600">点击「新玩家入场」开始记分</p>
        </div>
      )}

      {joinOpen && (
        <JoinComboboxModal
          sessionId={session.id}
          existingMemberIds={new Set(players.map((p) => p.member.id))}
          onClose={() => setJoinOpen(false)}
          onSuccess={refresh}
        />
      )}

      {buyinOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setBuyinOpen(false)} />
      )}

      {settleOpen && selectedPlayer && (
        <SettleModal
          player={selectedPlayer}
          session={session}
          onClose={() => { setSettleOpen(false); setSelectedPlayer(null) }}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}

/* ================================================================
 * Player Seat — compact, high-density
 * ================================================================ */

function PlayerSeat({
  player,
  session,
  mask,
  settled,
  onSettle,
  disabled,
}: {
  player: PlayerCard
  session: Session
  mask: (v: string) => string
  settled: boolean
  onSettle: () => void
  disabled: boolean
}) {
  return (
    <div className={`rounded-xl border p-2.5 transition-colors ${
      settled
        ? 'border-zinc-800/60 bg-zinc-900/30'
        : 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700'
    }`}>
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[12px] font-medium text-zinc-100">{player.member.name}</span>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${settled ? 'bg-zinc-600' : 'bg-emerald-500'}`} />
      </div>

      <div className="mt-1.5">
        <span className={`text-[14px] font-semibold tabular-nums ${
          !settled ? 'text-zinc-500' :
          player.netPnl > 0 ? 'text-emerald-400' :
          player.netPnl < 0 ? 'text-red-400' : 'text-zinc-400'
        }`}>
          {settled ? mask(fmtSigned(player.netPnl)) : '—'}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
        <span>入 {mask(fmtMoney(player.totalBuyins))}</span>
        {settled && <span>退 {mask(fmtMoney(player.cashoutAmount))}</span>}
      </div>

      {!settled && session.status === 'active' && (
        <button
          onClick={onSettle}
          disabled={disabled}
          className="mt-1.5 w-full cursor-pointer rounded-lg border border-zinc-700/60 bg-zinc-800/50 py-1 text-[10px] font-medium text-zinc-400 transition-all hover:border-emerald-600/40 hover:bg-emerald-600/10 hover:text-emerald-400 active:scale-[0.97] disabled:opacity-40"
        >
          离场
        </button>
      )}
    </div>
  )
}

/* ================================================================
 * Buyin Dropdown — active players only
 * ================================================================ */

function BuyinDropdown({
  players,
  onClose,
  onSuccess,
}: {
  players: PlayerCard[]
  onClose: () => void
  onSuccess: () => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const QUICK_AMOUNTS = [500, 1000, 2000]

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  async function handleBuyin(amount: number) {
    if (!selectedId) return
    setBusy(true)
    try {
      await addBuyin(selectedId, amount)
      onSuccess()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-zinc-700 bg-zinc-900 p-2.5 shadow-xl"
    >
      <div className="mb-2 max-h-28 space-y-0.5 overflow-y-auto">
        {players.map((p) => (
          <button
            key={p.record.id}
            onClick={() => setSelectedId(p.record.id)}
            className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12px] transition-colors ${
              selectedId === p.record.id
                ? 'bg-emerald-600/15 text-emerald-300'
                : 'text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            <span className="font-medium">{p.member.name}</span>
            <span className="text-[10px] text-zinc-500">{fmtMoney(p.totalBuyins)}</span>
          </button>
        ))}
      </div>

      {selectedId && (
        <div className="flex gap-1">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => handleBuyin(a)}
              disabled={busy}
              className="flex-1 cursor-pointer rounded-lg bg-emerald-600 py-2 text-[12px] font-semibold text-white transition-all hover:bg-emerald-500 active:scale-[0.97] disabled:opacity-50"
            >
              +{a}
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <div className="mt-1.5 flex gap-1.5">
          <input
            type="number"
            inputMode="decimal"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="自定义"
            className={inputClass}
          />
          <Button onClick={() => handleBuyin(Number(customAmount))} disabled={busy || !Number(customAmount)}>
            确认
          </Button>
        </div>
      )}
    </div>
  )
}

/* ================================================================
 * Join Combobox — single input, autocomplete + inline create
 * ================================================================ */

function JoinComboboxModal({
  sessionId,
  existingMemberIds,
  onClose,
  onSuccess,
}: {
  sessionId: string
  existingMemberIds: Set<string>
  onClose: () => void
  onSuccess: () => void
}) {
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [buyinAmount, setBuyinAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  const QUICK_AMOUNTS = [500, 1000, 2000]

  useEffect(() => {
    let cancelled = false
    async function search() {
      const { searchMembers } = await import('@/lib/api')
      const results = await searchMembers(query)
      if (!cancelled) setMembers(results)
    }
    search()
    return () => { cancelled = true }
  }, [query])

  useEffect(() => { setHighlightIndex(-1) }, [members.length])

  const isNewPlayer = query.trim().length > 0 && !members.some(
    (m) => m.name.toLowerCase() === query.trim().toLowerCase(),
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => Math.min(i + 1, members.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex >= 0 && highlightIndex < members.length) {
        setSelectedMember(members[highlightIndex])
        setQuery(members[highlightIndex].name)
      } else if (isNewPlayer) {
        handleCreateAndJoin()
      } else if (selectedMember) {
        handleJoin()
      }
    }
  }

  async function handleJoin() {
    if (!selectedMember) return
    setBusy(true)
    try {
      const amount = Number(buyinAmount) || 0
      await joinSession(sessionId, selectedMember.id, amount > 0 ? amount : undefined)
      onSuccess()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateAndJoin() {
    const name = query.trim()
    if (!name) return
    setBusy(true)
    try {
      const { createMember: createM } = await import('@/lib/api')
      const member = await createM(name)
      const amount = Number(buyinAmount) || 0
      await joinSession(sessionId, member.id, amount > 0 ? amount : undefined)
      onSuccess()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="新玩家入场">
      <div className="space-y-4">
        {/* Smart combobox — name input */}
        <Field label="玩家姓名">
          <div className="relative">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedMember(null)
              }}
              onKeyDown={handleKeyDown}
              placeholder="输入名字搜索，新名字直接创建…"
              className={inputClass}
              autoFocus
            />
            {query.trim() && (
              <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-32 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
                {isNewPlayer && (
                  <button
                    onClick={handleCreateAndJoin}
                    className="flex w-full cursor-pointer items-center gap-2 border-b border-zinc-800 px-3 py-2 text-left text-[12px] text-emerald-400 transition-colors hover:bg-zinc-800"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
                    <span>新增 &quot;{query.trim()}&quot;</span>
                  </button>
                )}
                {members
                  .filter((m) => !existingMemberIds.has(m.id))
                  .map((m, i) => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedMember(m); setQuery(m.name) }}
                      className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-[12px] transition-colors ${
                        i === highlightIndex
                          ? 'bg-zinc-800 text-emerald-300'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <span>{m.name}</span>
                      <span className="text-[10px] text-zinc-500">已有</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
          {selectedMember && (
            <p className="mt-1.5 text-[11px] text-emerald-400">
              <svg viewBox="0 0 24 24" className="mr-1 inline h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M5 13l4 4L19 7" /></svg>
              已选：{selectedMember.name}
            </p>
          )}
        </Field>

        {/* Buyin amount */}
        <Field label="初始带入金额">
          <input
            type="number"
            inputMode="decimal"
            value={buyinAmount}
            onChange={(e) => setBuyinAmount(e.target.value)}
            placeholder="0"
            className={inputClass}
          />
          <div className="mt-2 flex gap-1.5">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setBuyinAmount(String(a))}
                className={`flex-1 cursor-pointer rounded-lg border py-2 text-xs font-medium transition-all active:scale-[0.97] ${
                  Number(buyinAmount) === a
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                +{a}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">取消</Button>
          <Button
            onClick={selectedMember ? handleJoin : handleCreateAndJoin}
            disabled={busy || !query.trim()}
            className="flex-1"
          >
            {busy ? '处理中…' : '确认入场'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/* ================================================================
 * Settle Modal
 * ================================================================ */

function SettleModal({
  player,
  session,
  onClose,
  onSuccess,
}: {
  player: PlayerCard
  session: Session
  onClose: () => void
  onSuccess: () => void
}) {
  const [cashout, setCashout] = useState('')
  const [busy, setBusy] = useState(false)
  const { mask } = usePrivacy()

  const preview = useMemo(() => {
    const amount = Number(cashout)
    if (!Number.isFinite(amount) || amount < 0) return null
    const profit = Math.max(0, amount - player.totalBuyins)
    const rake = session.rake_mode === 'profit_percentage' ? profit * Number(session.rake_rate ?? 0) : 0
    return { profit, rake, net: amount - player.totalBuyins - rake }
  }, [cashout, player, session])

  async function handleSettle() {
    const amount = Number(cashout)
    if (!Number.isFinite(amount) || amount < 0) return
    setBusy(true)
    try {
      await settlePlayer(player.record.id, amount)
      onSuccess()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="玩家离场结算">
      <div className="space-y-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="text-sm font-medium text-zinc-100">{player.member.name}</div>
          <div className="mt-0.5 text-[11px] text-zinc-500">总带入 {mask(fmtMoney(player.totalBuyins))}</div>
        </div>

        <Field label="退码金额（桌上筹码数）">
          <input
            type="number"
            inputMode="decimal"
            value={cashout}
            onChange={(e) => setCashout(e.target.value)}
            placeholder="输入退码筹码数"
            className={inputClass}
            autoFocus
          />
        </Field>

        {preview && session.rake_mode === 'profit_percentage' && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-[12px] space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-500">盈利</span>
              <span className="tabular-nums text-zinc-300">{mask(fmtMoney(preview.profit))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">抽水 ({(Number(session.rake_rate) * 100).toFixed(1)}%)</span>
              <span className="tabular-nums text-amber-400">−{mask(fmtMoney(preview.rake))}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-800 pt-1">
              <span className="font-medium text-zinc-300">净盈亏</span>
              <span className={`font-semibold tabular-nums ${preview.net > 0 ? 'text-emerald-400' : preview.net < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                {mask(fmtSigned(preview.net))}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">取消</Button>
          <Button onClick={handleSettle} disabled={busy || !preview} className="flex-1">
            {busy ? '处理中…' : '确认结算'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
