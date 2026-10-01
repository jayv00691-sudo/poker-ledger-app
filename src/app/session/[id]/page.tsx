'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { Badge, Button, Field, Modal, Spinner, inputClass } from '@/components/ui'
import { usePrivacy } from '@/components/PrivacyContext'

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const sessionId = params.id
  const { mask } = usePrivacy()

  const [bundle, setBundle] = useState<SessionBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal states
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
  const stats = bundle?.stats

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-zinc-400">
        <Spinner />
        <span className="text-sm">加载牌局数据…</span>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-8 text-center">
        <p className="text-sm text-zinc-500">场次不存在</p>
        <Link href="/" className="mt-2 inline-block text-sm text-emerald-400 hover:underline">
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
            <Link href="/" className="text-zinc-500 hover:text-zinc-300">←</Link>
            <h1 className="truncate text-base font-bold text-zinc-100">{session.title}</h1>
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
          <Button variant="ghost" className="text-xs">局末结算 →</Button>
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
          {error}
        </div>
      )}

      {/* Unified action bar */}
      {session.status === 'active' && (
        <div className="mb-3 flex gap-2">
          <Button onClick={() => setJoinOpen(true)} className="flex-1">
            <span className="text-base">+</span> 新玩家入场
          </Button>
          <Button onClick={() => setBuyinOpen(true)} variant="success" className="flex-1" disabled={activePlayers.length === 0}>
            <span className="text-base">+</span> 极速加码
          </Button>
        </div>
      )}

      {/* Compact player grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {activePlayers.map((p) => (
          <PlayerCardCompact
            key={p.record.id}
            player={p}
            session={session}
            mask={mask}
            onSettle={() => { setSelectedPlayer(p); setSettleOpen(true) }}
            disabled={busy}
          />
        ))}
        {settledPlayers.map((p) => (
          <PlayerCardCompact
            key={p.record.id}
            player={p}
            session={session}
            mask={mask}
            onSettle={() => { setSelectedPlayer(p); setSettleOpen(true) }}
            disabled={busy}
          />
        ))}
      </div>

      {players.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-10 text-center">
          <p className="text-sm text-zinc-500">还没有玩家入座</p>
          <p className="mt-1 text-xs text-zinc-600">点击「+ 新玩家入场」开始</p>
        </div>
      )}

      {/* Join modal */}
      {joinOpen && (
        <JoinSessionModal
          sessionId={session.id}
          existingMemberIds={new Set(players.map((p) => p.member.id))}
          onClose={() => setJoinOpen(false)}
          onSuccess={refresh}
        />
      )}

      {/* Quick buyin modal */}
      {buyinOpen && (
        <QuickBuyinModal
          players={activePlayers}
          onClose={() => setBuyinOpen(false)}
          onSuccess={refresh}
        />
      )}

      {/* Settle modal */}
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

function PlayerCardCompact({
  player,
  session,
  mask,
  onSettle,
  disabled,
}: {
  player: PlayerCard
  session: Session
  mask: (v: string) => string
  onSettle: () => void
  disabled: boolean
}) {
  const settled = player.record.is_settled
  return (
    <div className={`rounded-2xl border p-3 ${settled ? 'border-zinc-800/50 bg-zinc-900/30' : 'border-zinc-800 bg-zinc-900/70'}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-zinc-100">{player.member.name}</span>
            <Badge tone={settled ? 'neutral' : 'green'}>
              {settled ? '已结清' : '进行中'}
            </Badge>
          </div>
          <div className="mt-0.5 text-[10px] text-zinc-500">
            入场 {fmtTime(player.record.join_time)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-zinc-500">净盈亏</div>
          <div className={`text-base font-bold tabular-nums ${
            settled
              ? player.netPnl > 0 ? 'text-emerald-400' : player.netPnl < 0 ? 'text-red-400' : 'text-zinc-300'
              : 'text-zinc-500'
          }`}>
            {settled ? mask(fmtSigned(player.netPnl)) : '—'}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="text-zinc-500">
          带入 <span className="tabular-nums text-zinc-300">{mask(fmtMoney(player.totalBuyins))}</span>
        </span>
        {settled && (
          <span className="text-zinc-500">
            退码 <span className="tabular-nums text-zinc-300">{mask(fmtMoney(player.cashoutAmount))}</span>
          </span>
        )}
        {!settled && session.status === 'active' && (
          <button
            onClick={onSettle}
            disabled={disabled}
            className="cursor-pointer text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
          >
            离场结算
          </button>
        )}
      </div>
    </div>
  )
}

function JoinSessionModal({
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
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [buyinAmount, setBuyinAmount] = useState('')
  const [newName, setNewName] = useState('')
  const [newWechat, setNewWechat] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'search' | 'new'>('search')

  // Quick amounts from settings
  const QUICK_AMOUNTS = [500, 1000, 2000]

  useEffect(() => {
    if (tab === 'search') {
      import('@/lib/api').then(({ searchMembers }) => {
        searchMembers(search).then(setMembers)
      })
    }
  }, [search, tab])

  const available = members.filter((m) => !existingMemberIds.has(m.id))

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
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    try {
      const { createMember: createM } = await import('@/lib/api')
      const member = await createM(name, newWechat.trim())
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
        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
          <button
            onClick={() => setTab('search')}
            className={`flex-1 cursor-pointer rounded-lg py-2 text-xs font-semibold transition-colors ${
              tab === 'search' ? 'bg-emerald-600 text-white' : 'text-zinc-400'
            }`}
          >
            搜索会员
          </button>
          <button
            onClick={() => setTab('new')}
            className={`flex-1 cursor-pointer rounded-lg py-2 text-xs font-semibold transition-colors ${
              tab === 'new' ? 'bg-emerald-600 text-white' : 'text-zinc-400'
            }`}
          >
            快捷新建
          </button>
        </div>

        {tab === 'search' ? (
          <div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="输入名字搜索会员…"
              className={inputClass}
              autoFocus
            />
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {available.length === 0 ? (
                <p className="py-3 text-center text-xs text-zinc-500">
                  {search ? '无匹配会员' : '输入关键词搜索'}
                </p>
              ) : (
                available.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMember(m)}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors ${
                      selectedMember?.id === m.id
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800'
                    }`}
                  >
                    <span className="text-sm font-medium text-zinc-100">{m.name}</span>
                    {m.wechat && <span className="text-[10px] text-zinc-500">{m.wechat}</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="会员姓名">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="输入姓名" className={inputClass} autoFocus />
            </Field>
            <Field label="微信（可选）">
              <input value={newWechat} onChange={(e) => setNewWechat(e.target.value)} placeholder="微信号" className={inputClass} />
            </Field>
          </div>
        )}

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
                className={`flex-1 cursor-pointer rounded-lg border py-2 text-xs font-semibold transition-colors ${
                  Number(buyinAmount) === a
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
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
            onClick={tab === 'search' ? handleJoin : handleCreateAndJoin}
            disabled={busy || (tab === 'search' && !selectedMember) || (tab === 'new' && !newName.trim())}
            className="flex-1"
          >
            {busy ? '处理中…' : '确认入场'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function QuickBuyinModal({
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

  const QUICK_AMOUNTS = [500, 1000, 2000]

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
    <Modal open={true} onClose={onClose} title="极速加码">
      <div className="space-y-4">
        <Field label="选择玩家">
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {players.map((p) => (
              <button
                key={p.record.id}
                onClick={() => setSelectedId(p.record.id)}
                className={`flex w-full cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors ${
                  selectedId === p.record.id
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800'
                }`}
              >
                <span className="text-sm font-medium text-zinc-100">{p.member.name}</span>
                <span className="text-[10px] text-zinc-500">
                  已带入 {fmtMoney(p.totalBuyins)}
                </span>
              </button>
            ))}
          </div>
        </Field>

        {selectedId && (
          <Field label="加码金额">
            <div className="flex gap-1.5">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => handleBuyin(a)}
                  disabled={busy}
                  className="flex-1 cursor-pointer rounded-lg border border-zinc-700 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-50"
                >
                  +{a}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="自定义金额"
                className={inputClass}
              />
              <Button
                onClick={() => handleBuyin(Number(customAmount))}
                disabled={busy || !Number(customAmount)}
              >
                确认
              </Button>
            </div>
          </Field>
        )}
      </div>
    </Modal>
  )
}

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
          <div className="text-sm font-semibold text-zinc-100">{player.member.name}</div>
          <div className="mt-1 text-[11px] text-zinc-500">
            总带入 {mask(fmtMoney(player.totalBuyins))}
          </div>
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
              <span className={`font-bold tabular-nums ${preview.net > 0 ? 'text-emerald-400' : preview.net < 0 ? 'text-red-400' : 'text-zinc-300'}`}>
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
