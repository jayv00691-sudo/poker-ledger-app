'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Settings2,
  SlidersHorizontal,
  Users,
  Coins,
  Save,
  CheckCircle2,
  Plus,
  X,
  Building2,
  UserCircle,
  ChevronRight,
  Percent,
} from 'lucide-react'
import type { AppConfig, RakeMode } from '@/lib/types'
import { RAKE_MODE_SHORT } from '@/lib/types'
import { getAppConfigs, upsertAppConfig } from '@/lib/api'
import { Badge, Button, Spinner, Field, inputClass, SectionCard } from '@/components/ui'

type ShareholderEntry = { name: string; percent: number }

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // 个人设置
  const [defaultCurrency, setDefaultCurrency] = useState('CNY')

  // 系统设置
  const [defaultRakeMode, setDefaultRakeMode] = useState<RakeMode>('dealer_shift')
  const [defaultStakes, setDefaultStakes] = useState('')
  const [shareholders, setShareholders] = useState<ShareholderEntry[]>([])
  const [quickAmounts, setQuickAmounts] = useState<string[]>(['500', '1000', '2000'])

  // 输入缓冲
  const [shareName, setShareName] = useState('')
  const [sharePct, setSharePct] = useState('')
  const [amtInput, setAmtInput] = useState('')

  useEffect(() => {
    getAppConfigs().then((list) => {
      const map: Record<string, unknown> = {}
      for (const c of list) map[c.key] = c.value

      if (typeof map['default_currency'] === 'string') setDefaultCurrency(map['default_currency'])
      if (typeof map['default_rake_mode'] === 'string') {
        const m = map['default_rake_mode'] as RakeMode
        if (m === 'dealer_shift' || m === 'box_count') setDefaultRakeMode(m)
      }
      if (typeof map['default_stakes'] === 'string') setDefaultStakes(map['default_stakes'])

      if (Array.isArray(map['shareholders'])) {
        setShareholders(
          (map['shareholders'] as unknown[]).map((x) => {
            if (typeof x === 'string') return { name: x, percent: 0 }
            if (x && typeof x === 'object' && 'name' in x) {
              const o = x as Record<string, unknown>
              return { name: String(o.name), percent: Number(o.percent ?? 0) }
            }
            return null
          }).filter((x): x is ShareholderEntry => x !== null),
        )
      }

      if (Array.isArray(map['quick_amounts'])) {
        setQuickAmounts((map['quick_amounts'] as number[]).map(String))
      }
    }).finally(() => setLoading(false))
  }, [])

  /* ---------- chip helpers ---------- */
  const addShareholder = () => {
    const name = shareName.trim()
    if (!name || shareholders.some((s) => s.name === name)) return
    const pct = Number(sharePct) || 0
    setShareholders((s) => [...s, { name, percent: pct }])
    setShareName('')
    setSharePct('')
  }
  const updatePct = (name: string, pct: number) => {
    setShareholders((s) => s.map((x) => (x.name === name ? { ...x, percent: pct } : x)))
  }
  const addAmount = () => {
    const n = Number(amtInput)
    if (!n || n <= 0 || quickAmounts.includes(String(n))) return
    setQuickAmounts((s) => [...s, String(n)])
    setAmtInput('')
  }

  async function handleSave() {
    // 自动归一化百分比（如果总和 > 0 且 ≠ 100）
    let normalized = shareholders
    const total = shareholders.reduce((s, x) => s + x.percent, 0)
    if (shareholders.length > 0 && total !== 100 && total > 0) {
      normalized = shareholders.map((s) => ({ ...s, percent: (s.percent / total) * 100 }))
    }

    setSaving(true)
    setSaved(false)
    try {
      await Promise.all([
        upsertAppConfig('default_currency', defaultCurrency, '默认货币'),
        upsertAppConfig('default_rake_mode', defaultRakeMode, '默认抽水模式'),
        upsertAppConfig('default_stakes', defaultStakes, '默认盲注级别'),
        upsertAppConfig('shareholders', normalized, '股东名册'),
        upsertAppConfig('quick_amounts', quickAmounts.map(Number), '快捷买入面额'),
      ])
      setShareholders(normalized)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-400">
        <Spinner />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  const totalPct = shareholders.reduce((s, x) => s + x.percent, 0)

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-2.5 pt-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
          <Settings2 className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">设置</h1>
          <p className="text-[11px] text-slate-400">个人偏好 · 系统默认</p>
        </div>
      </div>

      {/* ========== 个人设置 ========== */}
      <SectionCard
        title="个人设置"
        action={<UserCircle className="h-4 w-4 text-slate-400" />}
      >
        <div className="space-y-3">
          <Field label="默认货币">
            <input
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value.toUpperCase())}
              placeholder="CNY"
              className={inputClass}
            />
          </Field>
          <Link
            href="/internal"
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 transition-colors hover:bg-slate-100"
          >
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-slate-500" />
              <div>
                <div className="text-sm font-medium text-slate-700">内部 / 分账</div>
                <div className="text-[10px] text-slate-400">股东账户资金流与分红</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </SectionCard>

      {/* ========== 系统设置 ========== */}
      <SectionCard
        title="系统设置"
        action={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}
      >
        <div className="space-y-4">
          {/* 抽水模式 */}
          <div>
            <div className="mb-1.5 text-[11px] font-medium text-slate-500">默认抽水模式</div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(RAKE_MODE_SHORT) as RakeMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setDefaultRakeMode(m)}
                  className={`min-h-11 cursor-pointer rounded-xl text-[12px] font-semibold transition-all active:scale-[0.97] ${
                    defaultRakeMode === m
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {RAKE_MODE_SHORT[m]}
                </button>
              ))}
            </div>
          </div>

          {/* 盲注级别 */}
          <Field label="默认盲注级别">
            <input
              value={defaultStakes}
              onChange={(e) => setDefaultStakes(e.target.value)}
              placeholder="如 1/2"
              className={inputClass}
            />
          </Field>

          {/* 快捷面额 */}
          <div>
            <div className="mb-1.5 text-[11px] font-medium text-slate-500">快捷买入面额</div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quickAmounts.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
                >
                  +{a}
                  <button
                    onClick={() => setQuickAmounts((s) => s.filter((x) => x !== a))}
                    className="cursor-pointer text-emerald-400 transition-colors hover:text-emerald-600"
                    aria-label="移除"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {quickAmounts.length === 0 && (
                <span className="text-[11px] text-slate-400">暂无预设面额</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={amtInput}
                onChange={(e) => setAmtInput(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && addAmount()}
                inputMode="numeric"
                placeholder="输入金额，回车添加…"
                className={inputClass}
              />
              <Button variant="ghost" onClick={addAmount} className="shrink-0 px-3">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ========== 股东名册 ========== */}
      <SectionCard
        title="股东名册"
        action={
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-slate-400" />
            {shareholders.length > 0 && (
              <span className={`text-[10px] font-medium ${Math.abs(totalPct - 100) < 0.01 ? 'text-emerald-600' : 'text-amber-600'}`}>
                合计 {totalPct.toFixed(1)}%
              </span>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          {shareholders.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-slate-400">
              尚未配置股东，添加后可用于分账
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {shareholders.map((sh) => (
                <div key={sh.name} className="flex items-center gap-2.5 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[12px] font-bold text-blue-600">
                    {sh.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{sh.name}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={sh.percent || ''}
                        onChange={(e) => updatePct(sh.name, Number(e.target.value))}
                        className="h-8 w-16 rounded-lg border border-slate-200 bg-white px-2 pr-5 text-right text-[12px] tabular-nums text-slate-800 outline-none focus:border-blue-400"
                      />
                      <Percent className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                  <button
                    onClick={() => setShareholders((s) => s.filter((x) => x.name !== sh.name))}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    aria-label="移除股东"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 添加股东 */}
          <div className="flex gap-2">
            <input
              value={shareName}
              onChange={(e) => setShareName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addShareholder() }
              }}
              placeholder="股东姓名"
              className={inputClass}
            />
            <input
              type="number"
              inputMode="decimal"
              value={sharePct}
              onChange={(e) => setSharePct(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addShareholder() }
              }}
              placeholder="%"
              className={`${inputClass} w-20 shrink-0`}
            />
            <Button variant="ghost" onClick={addShareholder} className="shrink-0 px-3">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {shareholders.length > 1 && Math.abs(totalPct - 100) >= 0.01 && (
            <p className="flex items-center gap-1.5 text-[10px] text-amber-600">
              <Percent className="h-3 w-3" />
              占比合计 {totalPct.toFixed(1)}%，保存时自动归一化为 100%
            </p>
          )}
        </div>
      </SectionCard>

      {/* ========== Save ========== */}
      <div className="flex items-center gap-3 pt-1">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? '保存中…' : <><Save className="h-4 w-4" /> 保存设置</>}
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> 已保存
          </span>
        )}
      </div>
    </div>
  )
}
