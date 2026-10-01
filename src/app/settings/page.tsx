'use client'

import { useEffect, useState } from 'react'
import type { AppConfig, RakeMode } from '@/lib/types'
import { RAKE_MODE_LABELS, RAKE_MODE_SHORT } from '@/lib/types'
import { getAppConfigs, upsertAppConfig } from '@/lib/api'
import { Badge, Button, Field, Spinner, inputClass } from '@/components/ui'

export default function SettingsPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Local form state
  const [defaultRakeMode, setDefaultRakeMode] = useState<RakeMode>('profit_percentage')
  const [defaultStakes, setDefaultStakes] = useState('')
  const [defaultCurrency, setDefaultCurrency] = useState('CNY')
  const [shareholders, setShareholders] = useState('')
  const [quickAmounts, setQuickAmounts] = useState('500, 1000, 2000')

  useEffect(() => {
    getAppConfigs().then((list) => {
      const map: Record<string, string> = {}
      for (const c of list) {
        map[c.key] = typeof c.value === 'string' ? c.value : JSON.stringify(c.value)
      }
      setConfigs(map)
      if (map['default_rake_mode']) setDefaultRakeMode(JSON.parse(map['default_rake_mode']) as RakeMode)
      if (map['default_stakes']) setDefaultStakes(JSON.parse(map['default_stakes']))
      if (map['default_currency']) setDefaultCurrency(JSON.parse(map['default_currency']))
      if (map['shareholders']) {
        try { setShareholders(JSON.parse(map['shareholders']).join(', ')) } catch { setShareholders('') }
      }
      if (map['quick_amounts']) {
        try { setQuickAmounts(JSON.parse(map['quick_amounts']).join(', ')) } catch { setQuickAmounts('') }
      }
    }).finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await Promise.all([
        upsertAppConfig('default_rake_mode', defaultRakeMode, '默认抽水模式'),
        upsertAppConfig('default_stakes', defaultStakes, '默认盲注级别'),
        upsertAppConfig('default_currency', defaultCurrency, '默认货币'),
        upsertAppConfig('shareholders', shareholders.split(',').map((s) => s.trim()).filter(Boolean), '股东名册'),
        upsertAppConfig('quick_amounts', quickAmounts.split(',').map((s) => Number(s.trim())).filter(Boolean), '快捷买入面额'),
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
    <div className="mx-auto max-w-3xl px-3 py-4">
      <h1 className="mb-4 text-lg font-bold text-zinc-100">系统设置</h1>

      <div className="space-y-4">
        {/* Default rake mode */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">默认开局配置</h2>
          <div className="space-y-3">
            <Field label="默认抽水模式">
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
                {(Object.keys(RAKE_MODE_LABELS) as RakeMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDefaultRakeMode(m)}
                    className={`min-h-9 cursor-pointer rounded-lg text-[11px] font-semibold transition-colors ${
                      defaultRakeMode === m ? 'bg-emerald-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {RAKE_MODE_SHORT[m]}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="默认盲注级别">
                <input value={defaultStakes} onChange={(e) => setDefaultStakes(e.target.value)} placeholder="如 1/2" className={inputClass} />
              </Field>
              <Field label="默认货币">
                <input value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)} placeholder="CNY" className={inputClass} />
              </Field>
            </div>
          </div>
        </section>

        {/* Shareholders */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">股东名册</h2>
          <Field label="股东名单（逗号分隔）">
            <input
              value={shareholders}
              onChange={(e) => setShareholders(e.target.value)}
              placeholder="如 张三, 李四, 王五"
              className={inputClass}
            />
          </Field>
          {shareholders.trim() && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {shareholders.split(',').map((s) => s.trim()).filter(Boolean).map((name) => (
                <Badge key={name} tone="sky">{name}</Badge>
              ))}
            </div>
          )}
        </section>

        {/* Quick amounts */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">快捷买入面额</h2>
          <Field label="面额预设（逗号分隔）">
            <input
              value={quickAmounts}
              onChange={(e) => setQuickAmounts(e.target.value)}
              placeholder="如 500, 1000, 2000"
              className={inputClass}
            />
          </Field>
          {quickAmounts.trim() && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickAmounts.split(',').map((s) => Number(s.trim())).filter(Boolean).map((amt) => (
                <Badge key={amt} tone="green">+{amt}</Badge>
              ))}
            </div>
          )}
        </section>

        {/* Save */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? '保存中…' : '保存设置'}
          </Button>
          {saved && (
            <span className="text-sm text-emerald-400">✓ 已保存</span>
          )}
        </div>
      </div>
    </div>
  )
}
