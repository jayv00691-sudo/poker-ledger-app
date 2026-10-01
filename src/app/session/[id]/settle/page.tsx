'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { InsuranceType, PlayerCard, RakeMode } from '@/lib/types'
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

export default function SettlePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const sessionId = params.id
  const { mask } = usePrivacy()

  const [bundle, setBundle] = useState<SessionBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [endConfirmOpen, setEndConfirmOpen] = useState(false)

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

  const reconciliation = useMemo(() => {
    if (!stats || !session) return null
    const balanced = Math.abs(stats.unaccountedDelta) < 0.01
    const modeLabel = RAKE_MODE_LABELS[session.rake_mode].split(' · ')[0]
    return { balanced, modeLabel }
  }, [stats, session])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-zinc-400">
        <Spinner />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-8 text-center">
        <p className="text-sm text-zinc-500">场次不存在</p>
        <Link href="/" className="mt-2 inline-block text-sm text-emerald-400 hover:underline">返回看板</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-3 pb-24">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Link href={`/session/${session.id}`} className="text-zinc-500 hover:text-zinc-300">← 返回牌桌</Link>
      </div>
      <h1 className="mb-1 text-base font-bold text-zinc-100">局末结算与对账</h1>
      <p className="mb-4 text-[11px] text-zinc-500">{session.title} · {RAKE_MODE_LABELS[session.rake_mode as RakeMode]}</p>

      {error && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{error}</div>
      )}

      {/* Global reconciliation */}
      {stats && reconciliation && (
        <section className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
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
            <Row label="总带入（含未结清）" value={mask(fmtMoney(stats.totalBuyins))} />
            <Row label={session.rake_mode === 'profit_percentage' ? '总退码（含水费，已结清）' : '总退码（已结清）'} value={`− ${mask(fmtMoney(stats.totalCashout))}`} />
            {session.rake_mode !== 'profit_percentage' && (
              <Row label={`总水费 · ${reconciliation.modeLabel}`} value={`− ${mask(fmtMoney(stats.totalRake))}`} />
            )}
            <Row label="保险池净额（IN − OUT）" value={`− ${mask(fmtMoney(stats.insuranceNet))}`} />
            <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
              <dt className="font-medium text-zinc-300">未平账差额</dt>
              <dd className={`font-bold tabular-nums ${reconciliation.balanced ? 'text-emerald-400' : 'text-amber-400'}`}>
                {mask(fmtSigned(stats.unaccountedDelta))}
              </dd>
            </div>
            {!reconciliation.balanced && (
              <p className="mt-1 text-[10px] text-zinc-600">
                差额≠0 时，通常代表存在未录入的玩家带入或退码
              </p>
            )}
          </dl>
        </section>
      )}

      {/* Player list */}
      <section className="mb-4">
        <h3 className="mb-2 text-sm font-semibold text-zinc-300">玩家战绩</h3>
        <div className="space-y-2">
          {players.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
              暂无玩家
            </p>
          ) : (
            players.map((p: PlayerCard) => (
              <div key={p.record.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">{p.member.name}</span>
                    <Badge tone={p.record.is_settled ? 'neutral' : 'green'}>
                      {p.record.is_settled ? '已结清' : '进行中'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className={`text-base font-bold tabular-nums ${
                      p.record.is_settled
                        ? p.netPnl > 0 ? 'text-emerald-400' : p.netPnl < 0 ? 'text-red-400' : 'text-zinc-300'
                        : 'text-zinc-500'
                    }`}>
                      {p.record.is_settled ? mask(fmtSigned(p.netPnl)) : '—'}
                    </div>
                  </div>
                </div>
                <div className="mt-1 flex gap-4 text-[11px] text-zinc-500">
                  <span>带入 {mask(fmtMoney(p.totalBuyins))}</span>
                  {p.record.is_settled && (
                    <>
                      <span>退码 {mask(fmtMoney(p.cashoutAmount))}</span>
                      {session.rake_mode === 'profit_percentage' && p.rake > 0 && (
                        <span className="text-amber-400">水 {mask(fmtMoney(p.rake))}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* End session button */}
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
          >
            结束本场
          </Button>
        </div>
      )}

      {/* End confirmation modal */}
      {endConfirmOpen && (
        <Modal open={true} onClose={() => setEndConfirmOpen(false)} title="⚠️ 结束场次确认">
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-300">
              当前未平账差额为 <span className="font-bold">{fmtSigned(stats?.unaccountedDelta ?? 0)}</span>，
              通常代表存在未录入的玩家带入或退码。
            </div>
            <p className="text-sm text-zinc-400">确定要结束场次吗？结束后将无法继续录入数据。</p>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="tabular-nums text-zinc-200">{value}</dd>
    </div>
  )
}
