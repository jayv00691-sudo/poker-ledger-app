'use client'

import { useEffect, useState } from 'react'
import {
  Settings2,
  SlidersHorizontal,
  Users,
  Coins,
  Save,
  CheckCircle2,
  Plus,
  X,
} from 'lucide-react'
import type { AppConfig, RakeMode } from '@/lib/types'
import { RAKE_MODE_SHORT } from '@/lib/types'
import { getAppConfigs, upsertAppConfig } from '@/lib/api'
import { Badge, Button, Spinner, inputClass } from '@/components/ui'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Local form state
  const [defaultRakeMode, setDefaultRakeMode] = useState<RakeMode>('profit_percentage')
  const [defaultStakes, setDefaultStakes] = useState('')
  const [defaultCurrency, setDefaultCurrency] = useState('CNY')
  const [shareholders, setShareholders] = useState<string[]>([])
  const [quickAmounts, setQuickAmounts] = useState<string[]>(['500', '1000', '2000'])
  const [shareInput, setShareInput] = useState('')
  const [amtInput, setAmtInput] = useState('')

  useEffect(() => {
    getAppConfigs().then((list) => {
      const map: Record<string, unknown> = {}
      for (const c of list) map[c.key] = c.value
      if (typeof map['default_rake_mode'] === 'string') setDefaultRakeMode(map['default_rake_mode'] as RakeMode)
      if (typeof map['default_stakes'] === 'string') setDefaultStakes(map['default_stakes'])
      if (typeof map['default_currency'] === 'string') setDefaultCurrency(map['default_currency'])
      if (Array.isArray(map['shareholders'])) setShareholders(map['shareholders'] as string[])
      if (Array.isArray(map['quick_amounts'])) setQuickAmounts((map['quick_amounts'] as number[]).map(String))
    }).finally(() => setLoading(false))
  }, [])

  /* Chip add/remove helpers */
  const addShareholder = () => {
    const v = shareInput.trim()
    if (!v || shareholders.includes(v)) return
    setShareholders((s) => [...s, v])
    setShareInput('')
  }
  const addAmount = () => {
    const n = Number(amtInput)
    if (!n || n <= 0 || quickAmounts.includes(String(n))) return
    setQuickAmounts((s) => [...s, String(n)])
    setAmtInput('')
  }
  const onShareKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addShareholder() }
    if (e.key === 'Backspace' && !shareInput && shareholders.length) setShareholders((s) => s.slice(0, -1))
  }
  const onAmtKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addAmount() }
    if (e.key === 'Backspace' && !amtInput && quickAmounts.length) setQuickAmounts((s) => s.slice(0, -1))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await Promise.all([
        upsertAppConfig('default_rake_mode', defaultRakeMode, '默认抽水模式'),
        upsertAppConfig('default_stakes', defaultStakes, '默认盲注级别'),
        upsertAppConfig('default_currency', defaultCurrency, '默认货币'),
        upsertAppConfig('shareholders', shareholders, '股东名册'),
        upsertAppConfig('quick_amounts', quickAmounts.map(Number), '快捷买入面额'),
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-zinc-400">
        <Spinner />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 pb-24">
      {/* Title */}
      <div className="mb-5 flex items-center gap-2">
        <Settings2 className="h-5 w-5 text-emerald-500" />
        <h1 className="text-lg font-bold text-zinc-100">系统设置</h1>
      </div>

      <div className="space-y-3">
        {/* ========== 1. Default game setup ========== */}
        <Card icon={<SlidersHorizontal className="h-4 w-4 text-emerald-500" />} title="默认开局配置" sub="新建场次时自动带入">
          <div className="space-y-3">
            {/* Rake mode — segmented control */}
            <div>
              <div className="mb-1.5 text-[11px] font-medium text-zinc-400">抽水模式</div>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-zinc-800 bg-zinc-950/80 p-1">
                {(Object.keys(RAKE_MODE_SHORT) as RakeMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDefaultRakeMode(m)}
                    className={`min-h-9 cursor-pointer rounded-lg text-[11px] font-semibold transition-all active:scale-[0.97] ${
                      defaultRakeMode === m
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/30'
                        : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300'
                    }`}
                  >
                    {RAKE_MODE_SHORT[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1.5 text-[11px] font-medium text-zinc-400">盲注级别</div>
                <input
                  value={defaultStakes}
                  onChange={(e) => setDefaultStakes(e.target.value)}
                  placeholder="如 1/2"
                  className={inputClass}
                />
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-medium text-zinc-400">货币</div>
                <input
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                  placeholder="CNY"
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* ========== 2. Shareholders ========== */}
        <Card icon={<Users className="h-4 w-4 text-emerald-500" />} title="股东名册" sub="新建场次时可选归属股东">
          <div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {shareholders.map((name) => (
                <Chip key={name} onRemove={() => setShareholders((s) => s.filter((x) => x !== name))}>
                  {name}
                </Chip>
              ))}
              {shareholders.length === 0 && (
                <span className="text-[11px] text-zinc-600">暂无股东，输入后回车添加</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={shareInput}
                onChange={(e) => setShareInput(e.target.value)}
                onKeyDown={onShareKeyDown}
                placeholder="输入股东姓名，回车添加…"
                className={inputClass}
              />
              <Button variant="ghost" onClick={addShareholder} className="shrink-0 px-3">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* ========== 3. Quick amounts ========== */}
        <Card icon={<Coins className="h-4 w-4 text-emerald-500" />} title="快捷买入面额" sub="入场 / 加码弹窗中显示的预设筹码">
          <div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quickAmounts.map((a) => (
                <Chip key={a} onRemove={() => setQuickAmounts((s) => s.filter((x) => x !== a))} tone="emerald">
                  +{a}
                </Chip>
              ))}
              {quickAmounts.length === 0 && (
                <span className="text-[11px] text-zinc-600">暂无预设面额</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={amtInput}
                onChange={(e) => setAmtInput(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={onAmtKeyDown}
                inputMode="numeric"
                placeholder="输入金额，回车添加…"
                className={inputClass}
              />
              <Button variant="ghost" onClick={addAmount} className="shrink-0 px-3">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* ========== Save ========== */}
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? '保存中…' : <><Save className="h-4 w-4" /> 保存设置</>}
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> 已保存
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ================================================================
 * Card — settings section
 * ================================================================ */
function Card({
  icon,
  title,
  sub,
  children,
}: {
  icon: React.ReactNode
  title: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
          {sub && <p className="text-[10px] text-zinc-500">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

/* ================================================================
 * Chip — removable pill
 * ================================================================ */
function Chip({
  children,
  onRemove,
  tone = 'neutral',
}: {
  children: React.ReactNode
  onRemove: () => void
  tone?: 'neutral' | 'emerald'
}) {
  const styles =
    tone === 'emerald'
      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
      : 'border-zinc-700/60 bg-zinc-800/60 text-zinc-300'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${styles}`}>
      {children}
      <button
        onClick={onRemove}
        className="cursor-pointer text-zinc-500 transition-colors hover:text-zinc-200"
        aria-label="移除"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
