'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { InsuranceType, RakeMode } from '@/lib/types'
import { RAKE_MODE_LABELS } from '@/lib/types'
import type { SessionBundle } from '@/lib/api'
import {
  addBuyin,
  addDealerShift,
  addInsuranceLog,
  createMember,
  createSession,
  deleteBuyin,
  deleteDealerShift,
  deleteInsuranceLog,
  endSession,
  joinSession,
  loadBundle,
  settlePlayer,
  unsettlePlayer,
  updateSessionBoxTotal,
} from '@/lib/api'
import { fmtMoney, fmtSigned, todayTitle } from '@/lib/format'
import { Badge, Button, Field, Modal, Spinner, inputClass } from '@/components/ui'
import { SessionBanner } from '@/components/SessionBanner'
import { PlayerList } from '@/components/PlayerList'
import { RakePanel } from '@/components/RakePanel'
import { InsurancePanel } from '@/components/InsurancePanel'

type Tab = 'players' | 'rake' | 'insurance'

const RATE_PRESETS = [0.03, 0.05, 0.1]

export default function Page() {
  const [bundle, setBundle] = useState<SessionBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('players')

  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState(todayTitle())
  const [rakeMode, setRakeMode] = useState<RakeMode>('profit_percentage')
  const [rakeRate, setRakeRate] = useState('0.05')

  const refresh = useCallback(async (id?: string | null) => {
    setError(null)
    try {
      const data = await loadBundle(id ?? null)
      setBundle(data)
      setSessionId(data.session?.id ?? null)
      return data
    } catch (e) {
      setError(e instanceof Error ? e.message : '数据加载失败')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh(null)
  }, [refresh])

  /** 包裹写操作：统一 loading / 错误 / 刷新 */
  const run = useCallback(
    async (fn: () => Promise<unknown>, targetId?: string | null) => {
      setBusy(true)
      setError(null)
      try {
        await fn()
        await refresh(targetId ?? sessionId)
      } catch (e) {
        setError(e instanceof Error ? e.message : '操作失败')
      } finally {
        setBusy(false)
      }
    },
    [refresh, sessionId],
  )

  const session = bundle?.session ?? null
  const stats = bundle?.stats

  /* ------------------------------- 场次 ------------------------------- */

  const handleCreateSession = useCallback(async () => {
    const t = title.trim() || todayTitle()
    const rate = rakeMode === 'profit_percentage' ? Number(rakeRate) : 0
    if (rakeMode === 'profit_percentage' && (!Number.isFinite(rate) || rate <= 0)) {
      setError('请填写有效的抽水比例')
      return
    }
    let created: string | null = null
    await run(async () => {
      const s = await createSession({ title: t, rake_mode: rakeMode, rake_rate: rate })
      created = s.id
    }, null)
    if (created) {
      setSessionId(created)
      setCreateOpen(false)
      setTitle(todayTitle())
      await refresh(created)
    }
  }, [title, rakeMode, rakeRate, run, refresh])

  const [endConfirmOpen, setEndConfirmOpen] = useState(false)
  const [endBoxTotal, setEndBoxTotal] = useState('')
  const [endingSession, setEndingSession] = useState(false)

  const handleEndSession = useCallback(
    async (boxTotal?: number) => {
      if (!session) return
      // 未平账差 ≠ 0 时二次确认
      const delta = bundle?.stats?.unaccountedDelta ?? 0
      if (Math.abs(delta) >= 1) {
        setEndBoxTotal(boxTotal !== undefined ? String(boxTotal) : '')
        setEndConfirmOpen(true)
        return
      }
      await run(() => endSession(session.id, boxTotal))
    },
    [session, run, bundle],
  )

  const confirmEndSession = useCallback(async () => {
    if (!session) return
    setEndingSession(true)
    try {
      const box = endBoxTotal.trim() === '' ? undefined : Number(endBoxTotal)
      await run(() => endSession(session.id, box))
      setEndConfirmOpen(false)
      setEndBoxTotal('')
    } finally {
      setEndingSession(false)
    }
  }, [session, run, endBoxTotal])

  /* ------------------------------- 玩家 ------------------------------- */

  const handleAddPlayer = useCallback(
    async (memberId: string) => {
      if (!session) return
      await run(() => joinSession(session.id, memberId))
    },
    [session, run],
  )

  const handleCreateMember = useCallback(
    async (name: string, wechat: string) => {
      if (!session) return
      await run(async () => {
        const m = await createMember(name, wechat)
        await joinSession(session.id, m.id)
      })
    },
    [session, run],
  )

  const handleBuyin = useCallback(
    async (recordId: string, amount: number) => {
      await run(() => addBuyin(recordId, amount))
    },
    [run],
  )

  const handleDeleteBuyin = useCallback(
    async (buyinId: string) => {
      await run(() => deleteBuyin(buyinId))
    },
    [run],
  )

  const handleSettle = useCallback(
    async (recordId: string, cashout: number) => {
      await run(() => settlePlayer(recordId, cashout))
    },
    [run],
  )

  const handleUnsettle = useCallback(
    async (recordId: string) => {
      await run(() => unsettlePlayer(recordId))
    },
    [run],
  )

  /* ------------------------------- 抽水 ------------------------------- */

  const handleAddShift = useCallback(
    async (input: { dealer_name: string; rake_chips: number; tip_chips: number }) => {
      if (!session) return
      await run(() => addDealerShift({ session_id: session.id, ...input }))
    },
    [session, run],
  )

  const handleDeleteShift = useCallback(
    async (id: string) => {
      await run(() => deleteDealerShift(id))
    },
    [run],
  )

  const handleUpdateBoxTotal = useCallback(
    async (total: number) => {
      if (!session) return
      await run(() => updateSessionBoxTotal(session.id, total))
    },
    [session, run],
  )

  /* ------------------------------- 保险 ------------------------------- */

  const handleAddInsurance = useCallback(
    async (input: { type: InsuranceType; amount: number; remark?: string }) => {
      if (!session) return
      await run(() => addInsuranceLog({ session_id: session.id, ...input }))
    },
    [session, run],
  )

  const handleDeleteInsurance = useCallback(
    async (id: string) => {
      await run(() => deleteInsuranceLog(id))
    },
    [run],
  )

  /* ------------------------------ 对账行 ------------------------------ */

  const reconciliation = useMemo(() => {
    if (!stats || !session) return null
    const modeLabel = RAKE_MODE_LABELS[session.rake_mode].split(' · ')[0]
    const balanced = Math.abs(stats.unaccountedDelta) < 0.01
    return { modeLabel, balanced }
  }, [stats, session])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-zinc-950 text-zinc-400">
        <Spinner />
        <span className="text-sm">正在加载牌局数据…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 text-zinc-100">
      <SessionBanner
        session={session}
        sessions={bundle?.sessions ?? []}
        stats={stats ?? emptyStatsFallback()}
        onCreateSession={() => setCreateOpen(true)}
        onSelectSession={(id) => refresh(id)}
        onEndSession={handleEndSession}
      />

      {/* 错误提示 */}
      {error ? (
        <div className="mx-auto mt-3 max-w-3xl px-3">
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
            <span className="min-w-0 break-words">{error}</span>
            <button
              onClick={() => setError(null)}
              aria-label="关闭错误提示"
              className="shrink-0 cursor-pointer text-red-400/70 transition-colors hover:text-red-300"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      {/* 模块切换 */}
      <nav className="sticky top-[168px] z-20 mx-auto mt-3 max-w-3xl px-3">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-1 backdrop-blur">
          <TabButton active={tab === 'players'} onClick={() => setTab('players')}>
            玩家与买入
          </TabButton>
          <TabButton active={tab === 'rake'} onClick={() => setTab('rake')}>
            抽水与荷官
          </TabButton>
          <TabButton active={tab === 'insurance'} onClick={() => setTab('insurance')}>
            保险记账
          </TabButton>
        </div>
      </nav>

      <main className="mx-auto mt-4 max-w-3xl px-3">
        {busy ? (
          <div className="mb-3 flex items-center gap-2 text-[11px] text-zinc-500">
            <Spinner />
            正在同步…
          </div>
        ) : null}

        {tab === 'players' ? (
          <PlayerList
            session={session}
            players={bundle?.players ?? []}
            members={bundle?.members ?? []}
            buyins={bundle?.buyins ?? []}
            busy={busy}
            onAddPlayer={handleAddPlayer}
            onCreateMember={handleCreateMember}
            onBuyin={handleBuyin}
            onDeleteBuyin={handleDeleteBuyin}
            onSettle={handleSettle}
            onUnsettle={handleUnsettle}
          />
        ) : null}

        {tab === 'rake' ? (
          <RakePanel
            session={session}
            shifts={bundle?.dealerShifts ?? []}
            players={bundle?.players ?? []}
            totalRake={stats?.totalRake ?? 0}
            busy={busy}
            onAddShift={handleAddShift}
            onDeleteShift={handleDeleteShift}
            onUpdateBoxTotal={handleUpdateBoxTotal}
          />
        ) : null}

        {tab === 'insurance' ? (
          <InsurancePanel
            session={session}
            logs={bundle?.insuranceLogs ?? []}
            net={stats?.insuranceNet ?? 0}
            busy={busy}
            onAdd={handleAddInsurance}
            onDelete={handleDeleteInsurance}
          />
        ) : null}

        {/* 全局对账 */}
        {stats && session && reconciliation ? (
          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-300">全局对账方程</h3>
              <Badge tone={reconciliation.balanced ? 'green' : 'amber'}>
                {reconciliation.balanced ? '已平账' : '有差额'}
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              {session.rake_mode === 'profit_percentage'
                ? '总带入 = 总退码（含水费）+ 保险池净额 + 未平差额'
                : '总带入 = 总退码 + 总水费 + 保险池净额 + 未平差额'}
            </p>
            <dl className="mt-3 space-y-2 text-[12px]">
              <Row label="总带入（含未结清）" value={fmtMoney(stats.totalBuyins)} />
              <Row
                label={
                  session.rake_mode === 'profit_percentage'
                    ? '总退码（含水费，已结清）'
                    : '总退码（已结清）'
                }
                value={`− ${fmtMoney(stats.totalCashout)}`}
              />
              {session.rake_mode !== 'profit_percentage' ? (
                <Row label={`总水费 · ${reconciliation.modeLabel}`} value={`− ${fmtMoney(stats.totalRake)}`} />
              ) : null}
              <Row label="保险池净额（IN − OUT）" value={`− ${fmtMoney(stats.insuranceNet)}`} />
              <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
                <dt className="font-medium text-zinc-300">未平账差额</dt>
                <dd
                  className={`font-bold tabular-nums ${
                    reconciliation.balanced ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {fmtSigned(stats.unaccountedDelta)}
                </dd>
              </div>
              {!reconciliation.balanced ? (
                <p className="mt-1 text-[10px] text-zinc-600">
                  差额≠0 时，通常代表存在未录入的玩家带入或退码
                </p>
              ) : null}
            </dl>
          </section>
        ) : null}
      </main>

      {/* 新建场次 */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="新建牌局场次">
        <div className="space-y-4">
          <Field label="场次名称">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={todayTitle()}
              className={inputClass}
            />
          </Field>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-zinc-400">抽水模式</span>
            <div className="space-y-2">
              {(Object.keys(RAKE_MODE_LABELS) as RakeMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setRakeMode(m)}
                  className={`w-full cursor-pointer rounded-xl border px-3 py-3 text-left transition-colors ${
                    rakeMode === m
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-zinc-800 bg-zinc-900 hover:bg-zinc-800'
                  }`}
                >
                  <div className="text-sm font-medium text-zinc-100">
                    {RAKE_MODE_LABELS[m].split(' · ')[0]}
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">
                    {RAKE_MODE_LABELS[m].split(' · ')[1]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {rakeMode === 'profit_percentage' ? (
            <Field label="盈利抽水比例">
              <div className="space-y-2">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={rakeRate}
                  onChange={(e) => setRakeRate(e.target.value)}
                  className={inputClass}
                />
                <div className="grid grid-cols-3 gap-2">
                  {RATE_PRESETS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRakeRate(String(r))}
                      className={`min-h-11 cursor-pointer rounded-xl border text-sm font-semibold transition-colors ${
                        Number(rakeRate) === r
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                          : 'border-zinc-700 bg-zinc-800/60 text-zinc-200 hover:bg-zinc-800'
                      }`}
                    >
                      {(r * 100).toFixed(0)}%
                    </button>
                  ))}
                </div>
              </div>
            </Field>
          ) : null}

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button className="flex-1" onClick={handleCreateSession} disabled={busy}>
              {busy ? '创建中…' : '开始记分'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 结束场次 — 未平账差额二次确认 */}
      <Modal open={endConfirmOpen} onClose={() => setEndConfirmOpen(false)} title="⚠️ 结束场次确认">
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-300">
            当前未平账差额为{' '}
            <span className="font-bold">{fmtSigned(bundle?.stats?.unaccountedDelta ?? 0)}</span>，
            通常代表存在未录入的玩家带入或退码。
          </div>
          <p className="text-sm text-zinc-400">
            确定要结束场次吗？结束后将无法继续录入数据。
          </p>
          {session?.rake_mode === 'box_count' ? (
            <Field label="水箱总筹码">
              <input
                type="number"
                inputMode="decimal"
                value={endBoxTotal}
                onChange={(e) => setEndBoxTotal(e.target.value)}
                placeholder="请输入水箱清点数"
                className={inputClass}
              />
            </Field>
          ) : null}
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setEndConfirmOpen(false)}>
              返回检查
            </Button>
            <Button variant="danger" className="flex-1" onClick={confirmEndSession} disabled={endingSession}>
              {endingSession ? '处理中…' : '确认结束'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function TabButton({
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
      className={`min-h-11 cursor-pointer rounded-xl text-[12px] font-semibold transition-colors ${
        active
          ? 'bg-zinc-800 text-zinc-100 shadow'
          : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="tabular-nums text-zinc-200">{value}</dd>
    </div>
  )
}

function emptyStatsFallback() {
  return {
    totalBuyins: 0,
    totalCashout: 0,
    totalRake: 0,
    insuranceNet: 0,
    unsettledCount: 0,
    playerCount: 0,
    unaccountedDelta: 0,
  }
}