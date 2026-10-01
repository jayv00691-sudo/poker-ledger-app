'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Scale,
  Users,
  Wallet,
  ArrowRightLeft,
  TrendingUp,
  Loader2,
  ChevronRight,
  Landmark,
} from 'lucide-react'
import type { Session, RakeMode } from '@/lib/types'
import { listSessions, loadBundle, getAppConfigs, computeTotalRake } from '@/lib/api'
import { fmtMoney, fmtSigned, fmtDate } from '@/lib/format'
import { Badge, Spinner, EmptyState } from '@/components/ui'
import { usePrivacy } from '@/components/PrivacyContext'

/* ================================================================
 * 内部 / 分账 — 股东名册 + 各账户资金流 + 分账分红
 *
 * 模型：股东视为"账户"。
 *   - 输家把筹码付给股东 → 股东账户余额 += 该笔
 *   - 赢家从股东账户取走 → 股东账户余额 -= 该笔
 * 简化口径（本页展示）：
 *   账户流入 = 各玩家 |净亏损| 之和（付给股东的钱）
 *   账户流出 = 各玩家 净盈利 之和（股东付给赢家的钱）
 *   当前余额 = 流入 - 流出 - 抽水 - 保险净额
 * 分红：余额按 app_configs.shareholders 预设百分比分配
 * ================================================================ */

type Shareholder = {
  name: string
  percent: number
}

export default function InternalPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [shareholders, setShareholders] = useState<Shareholder[]>([])
  const [balance, setBalance] = useState(0)
  const [inflow, setInflow] = useState(0)
  const [outflow, setOutflow] = useState(0)
  const { mask } = usePrivacy()

  const refresh = useCallback(async () => {
    const all = await listSessions()
    setSessions(all)
    const target =
      all.find((s) => s.id === selectedId && s.status === 'active') ??
      all.find((s) => s.status === 'active') ??
      all[0] ??
      null
    if (target) setSelectedId(target.id)

    const cfgs = await getAppConfigs()
    const shCfg = cfgs.find((c) => c.key === 'shareholders')
    if (shCfg) {
      try {
        const parsed =
          typeof shCfg.value === 'string'
            ? JSON.parse(shCfg.value)
            : shCfg.value
        if (Array.isArray(parsed)) {
          setShareholders(
            parsed
              .map((x: unknown) => {
                if (typeof x === 'string') return { name: x, percent: 100 / parsed.length }
                if (x && typeof x === 'object' && 'name' in x && 'percent' in x)
                  return x as Shareholder
                return null
              })
              .filter((x): x is Shareholder => x !== null),
          )
        }
      } catch {
        /* ignore */
      }
    }

    if (target) {
      const bundle = await loadBundle(target.id)
      const totalRake = computeTotalRake(target, bundle.dealerShifts)
      const insuranceNet = bundle.stats.insuranceNet
      let inflowSum = 0
      let outflowSum = 0
      for (const p of bundle.players) {
        if (p.netPnl < 0) inflowSum += Math.abs(p.netPnl)
        else outflowSum += p.netPnl
      }
      // 抽水与保险是股东净赚的部分
      const net = inflowSum - outflowSum + totalRake - insuranceNet
      setInflow(inflowSum + totalRake)
      setOutflow(outflowSum + insuranceNet)
      setBalance(net)
    } else {
      setInflow(0)
      setOutflow(0)
      setBalance(0)
    }
  }, [selectedId])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-3 text-slate-400">
        <Spinner />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  const selected = sessions.find((s) => s.id === selectedId) ?? null
  const totalPercent = shareholders.reduce((s, x) => s + x.percent, 0)

  const distribution = shareholders.map((sh) => ({
    ...sh,
    amount: balance * (sh.percent / 100),
  }))

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-lg font-bold text-slate-900">内部 / 分账</h1>
          <p className="mt-0.5 text-[11px] text-slate-400">股东账户资金流与分红</p>
        </div>
        {selected && (
          <Badge tone={selected.status === 'active' ? 'blue' : 'neutral'}>
            {selected.status === 'active' ? '进行中' : '已结束'}
          </Badge>
        )}
      </div>

      {/* 场次选择 */}
      {sessions.length > 0 && (
        <div className="card p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <Landmark className="h-3 w-3" /> 选择场次
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sessions.slice(0, 8).map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                  s.id === selectedId
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {fmtDate(s.start_time)}
              </button>
            ))}
          </div>
        </div>
      )}

      {!selected ? (
        <EmptyState
          icon={<Scale className="h-10 w-10" strokeWidth={1} />}
          title="暂无场次可分账"
          sub="先在本局信息创建一个场次"
        />
      ) : (
        <>
          {/* 资金流 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <TrendingUp className="h-3 w-3 text-emerald-500" /> 账户流入
              </div>
              <div className="mt-1.5 text-xl font-bold tabular-nums text-emerald-600">
                {mask(fmtMoney(inflow))}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-400">输家赔付 + 抽水</div>
            </div>
            <div className="card p-3.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <ArrowRightLeft className="h-3 w-3 text-red-400" /> 账户流出
              </div>
              <div className="mt-1.5 text-xl font-bold tabular-nums text-red-500">
                {mask(fmtMoney(outflow))}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-400">赢家取走 + 保险净额</div>
            </div>
            <div className="card col-span-2 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  <Wallet className="h-3 w-3 text-blue-500" /> 当前股东余额
                </div>
                <span
                  className={`text-2xl font-bold tabular-nums ${
                    balance > 0
                      ? 'text-emerald-600'
                      : balance < 0
                        ? 'text-red-500'
                        : 'text-slate-400'
                  }`}
                >
                  {mask(fmtSigned(balance))}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400">
                流入 − 流出 + 抽水 − 保险净额
              </div>
            </div>
          </div>

          {/* 股东名册 */}
          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Users className="h-3.5 w-3.5" /> 股东名册
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {shareholders.length > 0
                  ? `共 ${shareholders.length} 位，合计 ${totalPercent.toFixed(0)}%`
                  : '尚未配置股东，请到个人设置添加'}
              </p>
            </div>
            {shareholders.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <Link
                  href="/settings"
                  className="text-[12px] font-medium text-blue-600 hover:text-blue-500"
                >
                  前往设置添加股东 →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {shareholders.map((sh, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[12px] font-bold text-blue-600">
                      {sh.name.slice(0, 1)}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-800">{sh.name}</div>
                      <div className="text-[10px] text-slate-400">
                        占比 {sh.percent.toFixed(1)}%
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        sh.percent > 0 && balance > 0
                          ? 'text-emerald-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {mask(fmtSigned(distribution[i].amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 分红预览 */}
          {shareholders.length > 0 && Math.abs(balance) > 0 && (
            <div className="card p-4">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <Scale className="h-3.5 w-3.5" /> 分红预览
              </h3>
              <p className="mt-1 text-[11px] text-slate-500">
                按当前余额 {mask(fmtSigned(balance))} 与预设占比自动分配。确认后请在结算页登记。
              </p>
              <div className="mt-3 space-y-1.5">
                {distribution.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <span className="text-sm text-slate-600">
                      {d.name}
                      <span className="ml-1.5 text-[10px] text-slate-400">
                        {d.percent.toFixed(1)}%
                      </span>
                    </span>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        d.amount >= 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}
                    >
                      {mask(fmtSigned(d.amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
