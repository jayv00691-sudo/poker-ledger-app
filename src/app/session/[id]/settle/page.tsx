'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ShieldPlus,
  ShieldMinus,
  UserCog,
  Trash2,
  RotateCcw,
  Boxes,
  Coins,
  CircleUser,
  Hourglass,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react'
import type { InsuranceType, PlayerCard, RakeMode, DealerShift, InsuranceLog } from '@/lib/types'
import { RAKE_MODE_LABELS } from '@/lib/types'
import type { SessionBundle } from '@/lib/api'
import {
  addDealerShift,
  addInsuranceLog,
  deleteDealerShift,
  deleteInsuranceLog,
  endSession,
  listDealerShifts,
  listInsuranceLogs,
  loadBundle,
  settlePlayer,
  unsettlePlayer,
  updateSessionBoxTotal,
} from '@/lib/api'
import { fmtMoney, fmtSigned, fmtTime } from '@/lib/format'
import { Badge, Button, Field, Modal, Spinner, inputClass } from '@/components/ui'
import { usePrivacy } from '@/components/PrivacyContext'

type SectionKey = 'recon' | 'players' | 'insurance' | 'dealer' | 'box'

export default function SettlePage() {
  const params = useParams<{ id: string }>()
  const sessionId = params.id
  const { mask } = usePrivacy()

  const [bundle, setBundle] = useState<SessionBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [endConfirmOpen, setEndConfirmOpen] = useState(false)

  // section collapse state
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    recon: true,
    players: true,
    insurance: true,
    dealer: false,
    box: true,
  })
  const toggle = (k: SectionKey) => setOpen((o) => ({ ...o, [k]: !o[k] }))

  const refresh = useCallback(async () => {
    setError(null)
    try {
      setBundle(await loadBundle(sessionId))
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

  /* ------- reconciliation derived ------- */
  const recon = useMemo(() => {
    if (!stats || !session) return null
    const balanced = Math.abs(stats.unaccountedDelta) < 0.01
    const modeLabel = RAKE_MODE_LABELS[session.rake_mode]
    return { balanced, modeLabel }
  }, [stats, session])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-500">
        <Spinner />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-8 text-center">
        <p className="text-sm text-slate-500">场次不存在</p>
        <Link href="/" className="mt-2 inline-block text-sm text-emerald-600 hover:underline">返回看板</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-3 pb-24">
      {/* Breadcrumb */}
      <Link href={`/session/${session.id}`} className="mb-3 inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700">
        <ArrowLeft className="h-3.5 w-3.5" /> 返回牌桌
      </Link>

      {/* Title */}
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <Scale className="h-4 w-4 text-emerald-500" />
          局末结算与对账
        </h1>
        <p className="mt-1 text-[11px] text-slate-500">
          {session.title} · {RAKE_MODE_LABELS[session.rake_mode as RakeMode]}
        </p>
      </div>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{error}
        </div>
      )}

      {/* ============ 1. Global reconciliation ============ */}
      {stats && recon && (
        <Section
          open={open.recon}
          onToggle={() => toggle('recon')}
          icon={<Scale className="h-4 w-4 text-emerald-500" />}
          title="全局对账方程"
          badge={
            <Badge tone={recon.balanced ? 'green' : 'amber'}>
              {recon.balanced ? '已平账' : '有差额'}
            </Badge>
          }
        >
          <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
            总带入 = 总退码 + 总水费（{recon.modeLabel}）+ 保险池净额 + 未平差额
          </p>

          {/* Equation visual */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <EquationCell label="总带入" value={mask(fmtMoney(stats.totalBuyins))} tone="text-slate-900" />
            <EquationCell label="总退码" value={mask(fmtMoney(stats.totalCashout))} tone="text-slate-700" prefix="−" />
            <EquationCell label={`总水费 · ${recon.modeLabel}`} value={mask(fmtMoney(stats.totalRake))} tone="text-amber-400" prefix="−" />
            <EquationCell label="保险池净额" value={mask(fmtMoney(stats.insuranceNet))} tone="text-slate-700" prefix="−" />
          </div>

          {/* Delta hero */}
          <div className={`mt-3 flex items-center justify-between rounded-xl border px-4 py-3 ${
            recon.balanced
              ? 'border-emerald-500/25 bg-emerald-500/8'
              : 'border-amber-500/25 bg-amber-500/8'
          }`}>
            <div className="flex items-center gap-2.5">
              {recon.balanced ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              )}
              <div>
                <div className="text-[11px] text-slate-500">未平账差额</div>
                <div className={`text-lg font-bold tabular-nums ${recon.balanced ? 'text-emerald-600' : 'text-amber-400'}`}>
                  {mask(fmtSigned(stats.unaccountedDelta))}
                </div>
              </div>
            </div>
            {recon.balanced && <span className="text-xs font-medium text-emerald-600">筹码守恒 ✓</span>}
          </div>

          {!recon.balanced && (
            <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-500">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
              差额 ≠ 0 时，通常代表存在未录入的玩家带入或退码
            </p>
          )}
        </Section>
      )}

      {/* ============ 2. Player results ============ */}
      <Section
        open={open.players}
        onToggle={() => toggle('players')}
        icon={<CircleUser className="h-4 w-4 text-emerald-500" />}
        title={`玩家战绩 · ${players.length} 人`}
        badge={
          stats && stats.unsettledCount > 0
            ? <Badge tone="amber">{stats.unsettledCount} 人未结清</Badge>
            : players.length > 0 ? <Badge tone="green">全部结清</Badge> : undefined
        }
      >
        {players.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            暂无玩家
          </p>
        ) : (
          <div className="space-y-1.5">
            {players.map((p: PlayerCard) => (
              <PlayerRow
                key={p.record.id}
                p={p}
                sessionId={session.id}
                currency={session.currency}
                mask={mask}
                busy={busy}
                onSettle={(cashout) => run(() => settlePlayer(p.record.id, cashout))}
                onUnsettle={() => run(() => unsettlePlayer(p.record.id))}
              />
            ))}
          </div>
        )}
      </Section>

      {/* ============ 3. Insurance pool ============ */}
      <InsuranceSection
        open={open.insurance}
        onToggle={() => toggle('insurance')}
        sessionId={session.id}
        currency={session.currency}
        mask={mask}
        busy={busy}
        run={run}
      />

      {/* ============ 4. Dealer shifts ============ */}
      <DealerSection
        open={open.dealer}
        onToggle={() => toggle('dealer')}
        sessionId={session.id}
        currency={session.currency}
        mask={mask}
        busy={busy}
        run={run}
      />

      {/* ============ 5. Box total (mode 2) ============ */}
      {session.rake_mode === 'box_count' && (
        <BoxSection
          open={open.box}
          onToggle={() => toggle('box')}
          session={session}
          mask={mask}
          busy={busy}
          run={run}
        />
      )}

      {/* ============ End session ============ */}
      {session.status === 'active' && (
        <div className="mt-6">
          <Button
            variant="danger"
            onClick={() => {
              if (stats && Math.abs(stats.unaccountedDelta) >= 1) {
                setEndConfirmOpen(true)
              } else {
                run(() => endSession(session.id))
              }
            }}
            className="w-full"
            disabled={busy}
          >
            {busy ? '处理中…' : '结束本场'}
          </Button>
        </div>
      )}
      {session.status === 'ended' && (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-sm font-medium text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> 本局已结束
          {session.end_time && <span className="text-[11px] text-slate-500">{fmtTime(session.end_time)}</span>}
        </div>
      )}

      {/* End confirmation modal */}
      {endConfirmOpen && (
        <Modal open={true} onClose={() => setEndConfirmOpen(false)} title="结束场次确认" subtitle="结束后将无法继续录入数据">
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                当前未平账差额为 <span className="font-bold">{fmtSigned(stats?.unaccountedDelta ?? 0)}</span>，
                通常代表存在未录入的玩家带入或退码。
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEndConfirmOpen(false)} className="flex-1">返回检查</Button>
              <Button variant="danger" onClick={() => run(() => endSession(session.id))} disabled={busy} className="flex-1">
                {busy ? '处理中…' : '确认结束'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ================================================================
 * Section — collapsible panel
 * ================================================================ */
function Section({
  open,
  onToggle,
  icon,
  title,
  badge,
  children,
}: {
  open: boolean
  onToggle: () => void
  icon: React.ReactNode
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mb-3 rounded-2xl border border-slate-200 bg-white">
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-slate-100/25"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {icon}
          {title}
          {badge}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>
      {open && <div className="border-t border-slate-200 px-4 py-3.5">{children}</div>}
    </div>
  )
}

/* ================================================================
 * Equation cell
 * ================================================================ */
function EquationCell({ label, value, prefix, tone }: { label: string; value: string; prefix?: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
      <div className="text-[9px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 truncate text-sm font-bold tabular-nums ${tone ?? 'text-slate-700'}`}>
        {prefix && <span className="mr-0.5 text-slate-500">{prefix}</span>}{value}
      </div>
    </div>
  )
}

/* ================================================================
 * Player row
 * ================================================================ */
function PlayerRow({
  p,
  currency,
  mask,
  busy,
  onSettle,
  onUnsettle,
}: {
  p: PlayerCard
  sessionId: string
  currency: string
  mask: (v: string) => string
  busy: boolean
  onSettle: (cashout: number) => void
  onUnsettle: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [cashout, setCashout] = useState('')

  const net = p.netPnl
  const settled = p.record.is_settled

  return (
    <div className={`rounded-xl border p-3 transition-all ${
      settled ? 'border-slate-200 bg-slate-50' : 'border-amber-500/20 bg-amber-500/4'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900">{p.member.name}</span>
          <Badge tone={settled ? 'neutral' : 'amber'}>{settled ? '已结清' : '未结清'}</Badge>
        </div>
        <div className="text-right">
          {settled ? (
            <>
              <div className={`text-base font-bold tabular-nums ${
                net > 0 ? 'text-emerald-600' : net < 0 ? 'text-red-500' : 'text-slate-700'
              }`}>
                {mask(fmtSigned(net))}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-slate-500">净盈亏</div>
            </>
          ) : (
            <div className="text-base font-bold tabular-nums text-slate-400">—</div>
          )}
        </div>
      </div>

      {/* metrics strip */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] tabular-nums text-slate-500">
        <span>带入 <b className="font-semibold text-slate-700">{mask(fmtMoney(p.totalBuyins, currency))}</b></span>
        {settled && (
          <>
            <span>退码 <b className="font-semibold text-slate-700">{mask(fmtMoney(p.cashoutAmount, currency))}</b></span>
          </>
        )}
      </div>

      {/* actions */}
      {settled ? (
        !busy && (
          <button
            onClick={onUnsettle}
            className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-700 active:scale-[0.97]"
          >
            <RotateCcw className="h-3 w-3" /> 取消结清
          </button>
        )
      ) : (
        <div className="mt-2.5">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                placeholder="退码金额"
                value={cashout}
                onChange={(e) => setCashout(e.target.value)}
                className={inputClass}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && cashout !== '') {
                    onSettle(Number(cashout))
                    setEditing(false)
                  }
                  if (e.key === 'Escape') setEditing(false)
                }}
              />
              <Button
                onClick={() => {
                  if (cashout !== '') {
                    onSettle(Number(cashout))
                    setEditing(false)
                  }
                }}
                disabled={cashout === '' || busy}
                className="min-h-11 shrink-0"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[12px] font-semibold text-amber-400 transition-all hover:bg-amber-500/20 active:scale-[0.97]"
            >
              <Coins className="h-3.5 w-3.5" /> 录入退码结清
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ================================================================
 * Insurance pool section
 * ================================================================ */
function InsuranceSection({
  open,
  onToggle,
  sessionId,
  currency,
  mask,
  busy,
  run,
}: {
  open: boolean
  onToggle: () => void
  sessionId: string
  currency: string
  mask: (v: string) => string
  busy: boolean
  run: (fn: () => Promise<unknown>) => void
}) {
  const [logs, setLogs] = useState<InsuranceLog[]>([])
  const [type, setType] = useState<InsuranceType>('in')
  const [amount, setAmount] = useState('')
  const [remark, setRemark] = useState('')

  useEffect(() => {
    listInsuranceLogs(sessionId).then(setLogs)
  }, [sessionId])

  const totalIn = logs.filter((l) => l.type === 'in').reduce((s, l) => s + l.amount, 0)
  const totalOut = logs.filter((l) => l.type === 'out').reduce((s, l) => s + l.amount, 0)
  const net = totalIn - totalOut

  const submit = () => {
    const amt = Number(amount)
    if (!amt || amt <= 0) return
    run(async () => {
      await addInsuranceLog({ session_id: sessionId, type, amount: amt, remark: remark.trim() || undefined })
      setAmount('')
      setRemark('')
      setLogs(await listInsuranceLogs(sessionId))
    })
  }

  return (
    <Section
      open={open}
      onToggle={onToggle}
      icon={<ShieldPlus className="h-4 w-4 text-emerald-500" />}
      title="保险池流水"
      badge={
        <Badge tone={net > 0 ? 'green' : net < 0 ? 'amber' : 'neutral'}>
          净 {net > 0 ? '+' : ''}{mask(fmtMoney(net, currency))}
        </Badge>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">入池</div>
          <div className="text-sm font-bold tabular-nums text-emerald-600">+{mask(fmtMoney(totalIn, currency))}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">出池</div>
          <div className="text-sm font-bold tabular-nums text-amber-400">−{mask(fmtMoney(totalOut, currency))}</div>
        </div>
      </div>

      {/* log list */}
      {logs.length > 0 && (
        <div className="mb-3 max-h-48 space-y-1 overflow-y-auto">
          {logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                {l.type === 'in'
                  ? <ShieldPlus className="h-3.5 w-3.5 text-emerald-500" />
                  : <ShieldMinus className="h-3.5 w-3.5 text-amber-500" />}
                <span className="text-slate-500">{fmtTime(l.timestamp)}</span>
                {l.remark && <span className="truncate text-slate-500">{l.remark}</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-bold tabular-nums ${l.type === 'in' ? 'text-emerald-600' : 'text-amber-400'}`}>
                  {l.type === 'in' ? '+' : '−'}{mask(fmtMoney(l.amount, currency))}
                </span>
                {!busy && (
                  <button
                    onClick={() => run(async () => {
                      await deleteInsuranceLog(l.id)
                      setLogs(await listInsuranceLogs(sessionId))
                    })}
                    className="cursor-pointer text-slate-400 transition-colors hover:text-red-500"
                    aria-label="删除"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* add form */}
      <div className="grid grid-cols-[56px_1fr_1fr_auto] gap-1.5">
        <div className="flex gap-0.5 rounded-lg border border-slate-200 bg-slate-100 p-0.5">
          <button
            onClick={() => setType('in')}
            className={`flex-1 cursor-pointer rounded-md px-1 text-[10px] font-bold transition-colors ${
              type === 'in' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >入</button>
          <button
            onClick={() => setType('out')}
            className={`flex-1 cursor-pointer rounded-md px-1 text-[10px] font-bold transition-colors ${
              type === 'out' ? 'bg-amber-600 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >出</button>
        </div>
        <input
          type="number"
          inputMode="decimal"
          placeholder="金额"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
        />
        <input
          placeholder="备注（可选）"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          className={inputClass}
        />
        <Button onClick={submit} disabled={!Number(amount) || busy} className="shrink-0 px-3">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </Section>
  )
}

/* ================================================================
 * Dealer shifts section
 * ================================================================ */
function DealerSection({
  open,
  onToggle,
  sessionId,
  currency,
  mask,
  busy,
  run,
}: {
  open: boolean
  onToggle: () => void
  sessionId: string
  currency: string
  mask: (v: string) => string
  busy: boolean
  run: (fn: () => Promise<unknown>) => void
}) {
  const [shifts, setShifts] = useState<DealerShift[]>([])
  const [name, setName] = useState('')
  const [rake, setRake] = useState('')
  const [tip, setTip] = useState('')

  useEffect(() => {
    listDealerShifts(sessionId).then(setShifts)
  }, [sessionId])

  const totalRake = shifts.reduce((s, d) => s + d.rake_chips, 0)
  const totalTip = shifts.reduce((s, d) => s + d.tip_chips, 0)

  const submit = () => {
    if (!name.trim()) return
    run(async () => {
      await addDealerShift({
        session_id: sessionId,
        dealer_name: name.trim(),
        rake_chips: Number(rake) || 0,
        tip_chips: Number(tip) || 0,
      })
      setName(''); setRake(''); setTip('')
      setShifts(await listDealerShifts(sessionId))
    })
  }

  return (
    <Section
      open={open}
      onToggle={onToggle}
      icon={<UserCog className="h-4 w-4 text-emerald-500" />}
      title="荷官班次"
      badge={
        totalRake > 0 ? (
          <Badge tone="amber">
            水 {mask(fmtMoney(totalRake, currency))}
            {totalTip > 0 && <> · 小费 {mask(fmtMoney(totalTip, currency))}</>}
          </Badge>
        ) : undefined
      }
    >
      {/* shift list */}
      {shifts.length > 0 ? (
        <div className="mb-3 space-y-1">
          {shifts.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <Hourglass className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-medium text-slate-700">{d.dealer_name}</span>
                <span className="text-slate-400">
                  {fmtTime(d.start_time)}{d.end_time ? ` – ${fmtTime(d.end_time)}` : ' – 进行中'}
                </span>
              </div>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="text-slate-500">水 {mask(fmtMoney(d.rake_chips, currency))}</span>
                {d.tip_chips > 0 && <span className="text-slate-500">小费 {mask(fmtMoney(d.tip_chips, currency))}</span>}
                {!busy && (
                  <button
                    onClick={() => run(async () => {
                      await deleteDealerShift(d.id)
                      setShifts(await listDealerShifts(sessionId))
                    })}
                    className="cursor-pointer text-slate-400 transition-colors hover:text-red-500"
                    aria-label="删除"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-[11px] text-slate-500">暂无班次记录</p>
      )}

      {/* add form */}
      <div className="grid grid-cols-[1fr_64px_64px_auto] gap-1.5">
        <input placeholder="荷官姓名" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        <input type="number" inputMode="decimal" placeholder="抽水" value={rake} onChange={(e) => setRake(e.target.value)} className={inputClass} />
        <input type="number" inputMode="decimal" placeholder="小费" value={tip} onChange={(e) => setTip(e.target.value)} className={inputClass} />
        <Button onClick={submit} disabled={!name.trim() || busy} className="shrink-0 px-3">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </Section>
  )
}

/* ================================================================
 * Box total section (mode 2)
 * ================================================================ */
function BoxSection({
  open,
  onToggle,
  session,
  mask,
  busy,
  run,
}: {
  open: boolean
  onToggle: () => void
  session: { id: string; box_total_chips: number; currency: string }
  mask: (v: string) => string
  busy: boolean
  run: (fn: () => Promise<unknown>) => void
}) {
  const [box, setBox] = useState('')

  return (
    <Section
      open={open}
      onToggle={onToggle}
      icon={<Boxes className="h-4 w-4 text-emerald-500" />}
      title="水箱计数"
      badge={
        session.box_total_chips > 0
          ? <Badge tone="green">当前 {mask(fmtMoney(session.box_total_chips, session.currency))}</Badge>
          : <Badge tone="neutral">未录入</Badge>
      }
    >
      <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
        模式 2 下，对账总额取自水箱计数。场次结束时请输入整箱筹码数。
      </p>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          placeholder="整箱筹码数"
          value={box}
          onChange={(e) => setBox(e.target.value)}
          className={inputClass}
        />
        <Button
          onClick={() => {
            if (box !== '') {
              run(async () => {
                await updateSessionBoxTotal(session.id as string, Number(box))
                setBox('')
              })
            }
          }}
          disabled={box === '' || busy}
        >
          <Coins className="h-4 w-4" /> 更新
        </Button>
      </div>
    </Section>
  )
}
