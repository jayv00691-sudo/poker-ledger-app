'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Shield,
  Scale,
  CircleDollarSign,
  Trash2,
  LogOut,
  Timer,
  Loader2,
  FileText,
  Coins,
} from 'lucide-react'
import type { RakeMode, Session } from '@/lib/types'
import { RAKE_MODE_LABELS, RAKE_MODE_SHORT } from '@/lib/types'
import type { SessionBundle } from '@/lib/api'
import {
  deleteBuyin,
  deleteDealerShift,
  deleteInsuranceLog,
  loadBundle,
  settlePlayer,
  unsettlePlayer,
} from '@/lib/api'
import { fmtMoney, fmtSigned, fmtTime } from '@/lib/format'
import { Badge, Button, Modal, Spinner, inputClass } from '@/components/ui'
import { usePrivacy } from '@/components/PrivacyContext'

/* ================================================================
 * 详情页 — 分标签：合规 | 保险 | 玩家
 * 内容区纯白卡片，表格化布局，移除散落加减码
 * 加减码统一由 TabBar 中央 + 唤起 QuickAdd
 * ================================================================ */

type TabKey = 'compliance' | 'insurance' | 'players'

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const sessionId = params.id
  const { mask } = usePrivacy()

  const [bundle, setBundle] = useState<SessionBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabKey>('compliance')
  const [settlePlayer, setSettlePlayer] = useState<import('@/lib/types').PlayerCard | null>(null)

  const refresh = useCallback(async () => {
    try {
      const data = await loadBundle(sessionId)
      setBundle(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true)
      try {
        await fn()
        await refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : '操作失败')
      } finally {
        setBusy(false)
      }
    },
    [refresh],
  )

  const session = bundle?.session ?? null

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-3 text-slate-400">
        <Spinner />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm text-slate-500">场次不存在</p>
        <Link
          href="/"
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          <ChevronLeft className="h-4 w-4" /> 返回本局信息
        </Link>
      </div>
    )
  }

  const isActive = session.status === 'active'

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* 头部 */}
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-bold text-slate-900">{session.title}</h1>
            <Badge tone={isActive ? 'blue' : 'neutral'}>{isActive ? '进行中' : '已结束'}</Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Timer className="h-3 w-3" />
            {RAKE_MODE_SHORT[session.rake_mode as RakeMode]}
            {session.stakes && <span>· 盲注 {session.stakes}</span>}
            {session.shareholder && <span>· 股东 {session.shareholder}</span>}
          </div>
        </div>
        <Link
          href={`/session/${session.id}/settle`}
          className="flex h-9 items-center gap-1 rounded-full bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/25 hover:bg-blue-500"
        >
          结算 <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] text-red-600">
          {error}
        </div>
      )}

      {/* 分标签 */}
      <div className="flex gap-1.5 rounded-2xl bg-white p-1.5 shadow-sm shadow-slate-100">
        {(
          [
            { key: 'compliance', label: '合规', icon: FileText },
            { key: 'insurance', label: '保险', icon: Shield },
            { key: 'players', label: '玩家', icon: Users },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors ${
              tab === key
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="space-y-4">
        {tab === 'compliance' && (
          <ComplianceTab
            session={session}
            bundle={bundle!}
            busy={busy}
            onRun={run}
            mask={mask}
          />
        )}
        {tab === 'insurance' && (
          <InsuranceTab
            session={session}
            bundle={bundle!}
            busy={busy}
            onRun={run}
            mask={mask}
          />
        )}
        {tab === 'players' && (
          <PlayersTab
            session={session}
            bundle={bundle!}
            busy={busy}
            onRun={run}
            mask={mask}
            onSettle={(p) => setSettlePlayer(p)}
          />
        )}
      </div>

      {/* 离场结算 Modal */}
      {settlePlayer && (
        <SettleModal
          player={settlePlayer}
          session={session}
          onClose={() => setSettlePlayer(null)}
          onSuccess={refresh}
          mask={mask}
        />
      )}
    </div>
  )
}

/* ================================================================
 * 合规 Tab — 对账快照 + 抽水方式说明
 * ================================================================ */
function ComplianceTab({
  session,
  bundle,
  busy,
  onRun,
  mask,
}: {
  session: Session
  bundle: SessionBundle
  busy: boolean
  onRun: (fn: () => Promise<unknown>) => void
  mask: (v: string) => string
}) {
  const s = bundle.stats
  const rows: Array<{ label: string; value: string; tone?: 'neg' | 'pos' }> = [
    { label: '总买入', value: mask(fmtMoney(s.totalBuyins)), tone: 'pos' },
    { label: '总退码', value: mask(fmtMoney(s.totalCashout)), tone: 'neg' },
    { label: '总抽水', value: mask(fmtMoney(s.totalRake)), tone: 'neg' },
    { label: '保险净额', value: mask(fmtSigned(s.insuranceNet)) },
    {
      label: '未对账差额',
      value: mask(fmtSigned(s.unaccountedDelta)),
      tone: s.unaccountedDelta !== 0 ? 'neg' : 'pos',
    },
  ]

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          对账快照
        </h3>
        <p className="mt-0.5 text-[11px] text-slate-400">
          合规口径：总买入 − 总退码 − 总抽水 − 保险净额 = 未对账差额
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm text-slate-500">{r.label}</span>
            <span
              className={`text-sm font-semibold tabular-nums ${
                r.tone === 'pos'
                  ? 'text-emerald-600'
                  : r.tone === 'neg'
                    ? 'text-red-500'
                    : 'text-slate-900'
              }`}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Scale className="h-3.5 w-3.5 text-slate-400" />
          抽水方式：{RAKE_MODE_LABELS[session.rake_mode as RakeMode]}
        </div>
      </div>
    </div>
  )
}

/* ================================================================
 * 保险 Tab — 保险日志表格 + 删除
 * ================================================================ */
function InsuranceTab({
  session,
  bundle,
  busy,
  onRun,
  mask,
}: {
  session: Session
  bundle: SessionBundle
  busy: boolean
  onRun: (fn: () => Promise<unknown>) => void
  mask: (v: string) => string
}) {
  const logs = bundle.insuranceLogs
  const net = logs.reduce((sum, l) => sum + (l.type === 'in' ? l.amount : -l.amount), 0)

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          保险记录
        </h3>
        <span className="text-[11px] font-semibold tabular-nums text-slate-500">
          净额 {mask(fmtSigned(net))}
        </span>
      </div>
      {logs.length === 0 ? (
        <div className="px-4 py-8 text-center text-[12px] text-slate-400">暂无保险记录</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
              <Badge tone={log.type === 'in' ? 'green' : 'amber'}>
                {log.type === 'in' ? '投保' : '赔付'}
              </Badge>
              <div className="flex-1">
                <div className="text-sm font-semibold tabular-nums text-slate-900">
                  {mask(fmtMoney(log.amount))}
                </div>
                {log.remark && <div className="text-[11px] text-slate-400">{log.remark}</div>}
              </div>
              <span className="text-[10px] tabular-nums text-slate-400">
                {fmtTime(log.timestamp)}
              </span>
              <button
                onClick={() => onRun(async () => deleteInsuranceLog(log.id))}
                disabled={busy}
                className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                aria-label="删除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {session.status === 'active' && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-[11px] text-slate-400">
          保险记录请在结算页录入
        </div>
      )}
    </div>
  )
}

/* ================================================================
 * 玩家 Tab — 表格化玩家视图 + 离场结算
 * ================================================================ */
function PlayersTab({
  session,
  bundle,
  busy,
  onRun,
  mask,
  onSettle,
}: {
  session: Session
  bundle: SessionBundle
  busy: boolean
  onRun: (fn: () => Promise<unknown>) => void
  mask: (v: string) => string
  onSettle: (p: import('@/lib/types').PlayerCard) => void
}) {
  const players = bundle.players
  const active = players.filter((p) => !p.record.is_settled)
  const settled = players.filter((p) => p.record.is_settled)

  return (
    <div className="space-y-4">
      {/* 在场玩家 */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            在场玩家
          </h3>
          <span className="text-[11px] font-semibold text-slate-400">{active.length}</span>
        </div>
        {active.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-slate-400">
            暂无在场玩家，点 TabBar 中央 + 添加
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">玩家</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">带入</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">净盈亏</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {active.map((p) => (
                  <tr key={p.record.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="text-sm font-medium text-slate-900">{mask(p.member.name)}</span>
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-400">{fmtTime(p.record.join_time)}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-slate-900">
                      {mask(fmtMoney(p.totalBuyins))}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-slate-400">
                      —
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => onSettle(p)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"
                      >
                        <LogOut className="h-3 w-3" /> 离场
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 已结算玩家 */}
      {settled.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              已结算
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">{settled.length}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {settled.map((p) => (
              <div key={p.record.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-600">{mask(p.member.name)}</div>
                  <div className="text-[10px] text-slate-400">
                    入 {mask(fmtMoney(p.totalBuyins))} · 退 {mask(fmtMoney(p.cashoutAmount))}
                  </div>
                </div>
                <span
                  className={`text-sm font-bold tabular-nums ${
                    p.netPnl > 0
                      ? 'text-emerald-600'
                      : p.netPnl < 0
                        ? 'text-red-500'
                        : 'text-slate-400'
                  }`}
                >
                  {mask(fmtSigned(p.netPnl))}
                </span>
                <button
                  onClick={() => onRun(async () => unsettlePlayer(p.record.id))}
                  disabled={busy}
                  className="rounded-full px-2.5 py-1 text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
                >
                  撤销
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================
 * 离场结算 Modal
 * ================================================================ */
function SettleModal({
  player,
  session,
  onClose,
  onSuccess,
  mask,
}: {
  player: import('@/lib/types').PlayerCard
  session: Session
  onClose: () => void
  onSuccess: () => void
  mask: (v: string) => string
}) {
  const [cashout, setCashout] = useState('')
  const [busy, setBusy] = useState(false)

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
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">{mask(player.member.name)}</div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                总带入 {mask(fmtMoney(player.totalBuyins))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400">当前净盈亏</div>
              <div className="text-sm font-bold tabular-nums text-slate-700">
                {mask(fmtSigned(player.netPnl))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">退码金额</span>
            <span className="text-[10px] text-slate-400">桌上原始筹码数</span>
          </div>
          <input
            type="number"
            inputMode="decimal"
            value={cashout}
            onChange={(e) => setCashout(e.target.value)}
            placeholder="输入桌上筹码数"
            className={inputClass}
            autoFocus
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button variant="danger" onClick={handleSettle} disabled={busy || !cashout} className="flex-1">
            {busy ? '处理中…' : '确认结算'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
