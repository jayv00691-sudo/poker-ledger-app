'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  UserPlus,
  Coins,
  LogOut,
  ChevronLeft,
  ChevronDown,
  Check,
  X,
  Timer,
  Users,
  Shield,
  CircleDollarSign,
  User,
  Search,
} from 'lucide-react'
import type { Buyin, Member, PlayerCard, RakeMode, Session } from '@/lib/types'
import { RAKE_MODE_LABELS, RAKE_MODE_SHORT } from '@/lib/types'
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
import { Badge, Button, Field, Modal, Spinner, inputClass, EmptyState } from '@/components/ui'
import { usePrivacy } from '@/components/PrivacyContext'

/* ================================================================
 * Session Cockpit — High-density table control
 *
 * Layout:
 *   Top:    Compact session info (1 line, tap to expand)
 *   Middle: Player grid (scrollable)
 *   Bottom: FIXED action bar — 入场 + 加码 (thumb zone)
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
  const [infoExpanded, setInfoExpanded] = useState(false)

  const [joinOpen, setJoinOpen] = useState(false)
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
        <Link href="/" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-500 hover:text-emerald-400">
          <ChevronLeft className="h-4 w-4" />
          返回看板
        </Link>
      </div>
    )
  }

  const activePlayers = players.filter((p: PlayerCard) => !p.record.is_settled)
  const settledPlayers = players.filter((p: PlayerCard) => p.record.is_settled)
  const isActive = session.status === 'active'

  return (
    <div className="mx-auto flex max-w-3xl flex-col" style={{ minHeight: '100dvh' }}>
      {/* ========== TOP: Compact session info (collapsible) ========== */}
      <div className="shrink-0 border-b border-zinc-800/60 bg-zinc-950/50 px-3 py-2">
        <button
          onClick={() => setInfoExpanded(!infoExpanded)}
          className="flex w-full items-center justify-between text-left"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/" className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="truncate text-sm font-semibold text-zinc-100">{session.title}</span>
            <Badge tone={isActive ? 'green' : 'neutral'}>
              {isActive ? '进行中' : '已结束'}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600">
              {RAKE_MODE_SHORT[session.rake_mode]}
            </span>
            <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${infoExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {infoExpanded && (
          <div className="mt-2 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-3 py-2.5 space-y-1.5 text-[11px] text-zinc-400">
            <div className="flex items-center gap-2">
              <Timer className="h-3.5 w-3.5 text-zinc-500" />
              {RAKE_MODE_LABELS[session.rake_mode as RakeMode]}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {session.stakes && <span>盲注 {session.stakes}</span>}
              {session.currency && <span>{session.currency}</span>}
              {session.shareholder && <span>股东 {session.shareholder}</span>}
            </div>
            {session.notes && <div className="text-zinc-500">{session.notes}</div>}
            <div className="flex gap-3 pt-1">
              <Link href={`/session/${session.id}/settle`} className="inline-flex items-center gap-1 font-medium text-emerald-500 hover:text-emerald-400">
                局末结算与对账
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ========== MIDDLE: Player grid (scrollable) ========== */}
      <div className="flex-1 overflow-y-auto px-3 py-2 pb-24">
        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-[12px] text-red-400">
            <X className="h-3.5 w-3.5" />
            {error}
          </div>
        )}

        {/* Active players */}
        {activePlayers.length > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <Users className="h-3 w-3" />
              在场 ({activePlayers.length})
            </div>
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

        {/* Settled players — collapsed */}
        {settledPlayers.length > 0 && (
          <details className="group">
            <summary className="mb-2 flex cursor-pointer items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 hover:text-zinc-400 transition-colors">
              <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
              已结算 ({settledPlayers.length})
            </summary>
            <div className="grid grid-cols-2 gap-2 opacity-50 transition-opacity md:grid-cols-3 lg:grid-cols-5">
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

        {/* Empty */}
        {players.length === 0 && (
          <EmptyState
            icon={<User className="h-10 w-10" strokeWidth={1} />}
            title="还没有玩家入座"
            sub="点击底部「入场」开始记分"
          />
        )}
      </div>

      {/* ========== BOTTOM: Fixed action bar (thumb zone) ========== */}
      {isActive && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/80 bg-zinc-950/95 px-3 py-2.5 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl gap-2">
            <button
              onClick={() => setJoinOpen(true)}
              className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm shadow-emerald-900/30 transition-all hover:bg-emerald-500 active:scale-[0.97]"
            >
              <UserPlus className="h-5 w-5" strokeWidth={2} />
              入场
            </button>
            <QuickBuyinButton
              players={activePlayers}
              disabled={busy || activePlayers.length === 0}
              onSuccess={refresh}
            />
          </div>
        </div>
      )}

      {/* ========== MODALS ========== */}
      {joinOpen && (
        <JoinComboboxModal
          sessionId={session.id}
          existingMemberIds={new Set(players.map((p) => p.member.id))}
          onClose={() => setJoinOpen(false)}
          onSuccess={refresh}
        />
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
 * ChevronRight — small utility icon used in links
 * ================================================================ */
function ChevronRight({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${className}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M9 6l6 6-6 6" />
    </svg>
  )
}

/* ================================================================
 * Quick Buyin — inline player select + amount in one row
 * ================================================================ */

function QuickBuyinButton({
  players,
  disabled,
  onSuccess,
}: {
  players: PlayerCard[]
  disabled: boolean
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const QUICK_AMOUNTS = [500, 1000, 2000]

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSelectedId(null)
        setCustomAmount('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleBuyin(amount: number) {
    if (!selectedId || !Number.isFinite(amount) || amount <= 0) return
    setBusy(true)
    try {
      await addBuyin(selectedId, amount)
      onSuccess()
      setOpen(false)
      setSelectedId(null)
      setCustomAmount('')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white shadow-sm shadow-amber-900/30 transition-all hover:bg-amber-500 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Coins className="h-5 w-5" strokeWidth={2} />
        加码
      </button>
    )
  }

  return (
    <div ref={ref} className="fixed bottom-16 left-0 right-0 z-50 px-3">
      <div className="mx-auto max-w-3xl rounded-xl border border-zinc-700/60 bg-zinc-900 p-3 shadow-2xl shadow-black/50">
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          <Coins className="h-3 w-3" />
          极速加码
        </div>
        {/* Player select row */}
        <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
          {players.map((p) => (
            <button
              key={p.record.id}
              onClick={() => setSelectedId(p.record.id)}
              className={`shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all active:scale-[0.97] ${
                selectedId === p.record.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'border border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {p.member.name}
            </button>
          ))}
        </div>

        {/* Amount row */}
        {selectedId && (
          <div className="flex gap-1.5">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => handleBuyin(a)}
                disabled={busy}
                className="flex-1 cursor-pointer rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-amber-500 active:scale-[0.97] disabled:opacity-50"
              >
                +{a}
              </button>
            ))}
            <input
              type="number"
              inputMode="decimal"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="其他"
              className={`${inputClass} w-20`}
            />
            <button
              onClick={() => handleBuyin(Number(customAmount))}
              disabled={busy || !Number(customAmount)}
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg bg-zinc-700/80 text-zinc-200 transition-all hover:bg-zinc-600 active:scale-[0.97] disabled:opacity-40"
            >
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ================================================================
 * Player Seat — compact card with visual hierarchy
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
  const showPnl = !settled || player.netPnl !== 0

  return (
    <div
      className={`rounded-xl border p-2.5 transition-all active:scale-[0.98] ${
        settled
          ? 'border-zinc-800/40 bg-zinc-900/20'
          : 'border-zinc-800/60 bg-zinc-900/50'
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[12px] font-semibold text-zinc-100">{player.member.name}</span>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${settled ? 'bg-zinc-600' : 'bg-emerald-500 animate-pulse'}`} />
      </div>

      {/* P&L display */}
      <div className="mt-1.5">
        <span
          className={`text-[15px] font-bold tabular-nums ${
            !settled
              ? 'text-zinc-500'
              : player.netPnl > 0 ? 'text-emerald-400'
              : player.netPnl < 0 ? 'text-red-400'
              : 'text-zinc-400'
          }`}
        >
          {settled ? mask(fmtSigned(player.netPnl)) : '—'}
        </span>
      </div>

      {/* Stats row */}
      <div className="mt-0.5 flex items-center justify-between text-[10px] text-zinc-500">
        <span>入 {mask(fmtMoney(player.totalBuyins))}</span>
        {settled && <span>退 {mask(fmtMoney(player.cashoutAmount))}</span>}
      </div>

      {/* Settle button (active players only) */}
      {!settled && session.status === 'active' && (
        <button
          onClick={(e) => { e.stopPropagation(); onSettle() }}
          disabled={disabled}
          className="mt-1.5 flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border border-zinc-700/40 bg-zinc-800/30 py-1.5 text-[10px] font-medium text-zinc-400 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 active:scale-[0.97] disabled:opacity-40"
        >
          <LogOut className="h-3 w-3" />
          离场
        </button>
      )}
    </div>
  )
}

/* ================================================================
 * Join Combobox Modal — single input, autocomplete + create
 * Info hierarchy: Name → Amount → Confirm
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
      const member = await createMember(name)
      const amount = Number(buyinAmount) || 0
      await joinSession(sessionId, member.id, amount > 0 ? amount : undefined)
      onSuccess()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="新玩家入场" subtitle="选择或创建玩家，一步完成">
      <div className="space-y-5">
        {/* Step 1: Player name (smart combobox) */}
        <div>
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
                className={`${inputClass} pl-9`}
                autoFocus
              />
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            </div>
          </Field>

          {/* Dropdown results */}
          {query.trim() && (
            <div className="mt-1.5 max-h-28 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/80">
              {isNewPlayer && (
                <button
                  onClick={handleCreateAndJoin}
                  className="flex w-full cursor-pointer items-center gap-2 border-b border-zinc-800 px-3 py-2.5 text-left text-[12px] font-medium text-emerald-400 transition-colors hover:bg-zinc-900"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  创建新玩家 "{query.trim()}"
                </button>
              )}
              {members
                .filter((m) => !existingMemberIds.has(m.id))
                .map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedMember(m); setQuery(m.name) }}
                    className={`flex w-full cursor-pointer items-center justify-between px-3 py-2.5 text-left text-[12px] transition-colors ${
                      i === highlightIndex
                        ? 'bg-zinc-900 text-emerald-300'
                        : 'text-zinc-300 hover:bg-zinc-900/60'
                    }`}
                  >
                    <span>{m.name}</span>
                    <span className="text-[10px] text-zinc-600">已有</span>
                  </button>
                ))}
            </div>
          )}

          {selectedMember && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              {selectedMember.name}
            </p>
          )}
        </div>

        {/* Step 2: Buyin amount */}
        <div>
          <Field label="初始带入金额" hint="0 表示不录">
            <input
              type="number"
              inputMode="decimal"
              value={buyinAmount}
              onChange={(e) => setBuyinAmount(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </Field>
          <div className="mt-2 flex gap-1.5">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                onClick={() => setBuyinAmount(String(a))}
                className={`flex-1 cursor-pointer rounded-lg border py-2.5 text-sm font-semibold transition-all active:scale-[0.97] ${
                  Number(buyinAmount) === a
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-zinc-700/60 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                +{a}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Confirm */}
        <div className="flex gap-2 pt-1">
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
 * Settle Modal — cashout with rake preview
 * Info hierarchy: Player info → Cashout → Rake calc → Confirm
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
    <Modal open={true} onClose={onClose} title="玩家离场结算" subtitle={player.member.name}>
      <div className="space-y-4">
        {/* Player summary */}
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-100">{player.member.name}</div>
              <div className="mt-0.5 text-[11px] text-zinc-500">
                总带入 {mask(fmtMoney(player.totalBuyins))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-zinc-500">当前净盈亏</div>
              <div className="text-sm font-bold tabular-nums text-zinc-300">
                {mask(fmtSigned(player.netPnl))}
              </div>
            </div>
          </div>
        </div>

        {/* Cashout input */}
        <div>
          <Field label="退码金额" hint="桌上原始筹码数">
            <input
              type="number"
              inputMode="decimal"
              value={cashout}
              onChange={(e) => setCashout(e.target.value)}
              placeholder="输入桌上筹码数"
              className={inputClass}
              autoFocus
            />
          </Field>
        </div>

        {/* Rake preview (mode 3 only) */}
        {preview && session.rake_mode === 'profit_percentage' && (
          <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-3.5 text-[12px] space-y-1.5">
            <div className="flex justify-between text-zinc-500">
              <span>盈利</span>
              <span className="tabular-nums text-zinc-300">{mask(fmtMoney(preview.profit))}</span>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>抽水 ({(Number(session.rake_rate) * 100).toFixed(1)}%)</span>
              <span className="tabular-nums text-amber-400">−{mask(fmtMoney(preview.rake))}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-800 pt-1.5">
              <span className="font-medium text-zinc-300">净盈亏</span>
              <span className={`font-bold tabular-nums ${
                preview.net > 0 ? 'text-emerald-400' : preview.net < 0 ? 'text-red-400' : 'text-zinc-400'
              }`}>
                {mask(fmtSigned(preview.net))}
              </span>
            </div>
          </div>
        )}

        {/* Confirm */}
        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1">取消</Button>
          <Button variant="danger" onClick={handleSettle} disabled={busy || !preview} className="flex-1">
            {busy ? '处理中…' : '确认结算'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
