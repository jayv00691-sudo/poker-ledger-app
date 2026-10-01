'use client'

import { useState } from 'react'
import type { InsuranceLog, InsuranceType, Session } from '@/lib/types'
import { fmtMoney, fmtSigned, fmtTime } from '@/lib/format'
import { Badge, Button, Field, Modal, inputClass } from './ui'

export function InsurancePanel({
  session,
  logs,
  net,
  busy,
  onAdd,
  onDelete,
}: {
  session: Session | null
  logs: InsuranceLog[]
  net: number
  busy: boolean
  onAdd: (input: { type: InsuranceType; amount: number; remark?: string }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<InsuranceType>('out')
  const [amount, setAmount] = useState('')
  const [remark, setRemark] = useState('')
  const [working, setWorking] = useState(false)

  const disabled = busy || !session || session.status !== 'active'

  const totalIn = logs.filter((l) => l.type === 'in').reduce((s, l) => s + Number(l.amount), 0)
  const totalOut = logs.filter((l) => l.type === 'out').reduce((s, l) => s + Number(l.amount), 0)

  async function submit() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return
    setWorking(true)
    try {
      await onAdd({ type, amount: value, remark: remark.trim() })
      setAmount('')
      setRemark('')
      setOpen(false)
    } finally {
      setWorking(false)
    }
  }

  if (!session) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        请先创建一场牌局
      </div>
    )
  }

  return (
    <section className="space-y-3">
      {/* 汇总 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] text-slate-500">保险池纯盈亏（IN − OUT）</div>
            <div
              className={`mt-1 text-2xl font-bold tabular-nums ${
                net > 0 ? 'text-emerald-600' : net < 0 ? 'text-red-500' : 'text-slate-900'
              }`}
            >
              {fmtSigned(net)}
            </div>
          </div>
          <Button onClick={() => setOpen(true)} disabled={disabled}>
            记一笔
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <div className="text-[10px] text-emerald-600">买入 IN（玩家付保险费）</div>
            <div className="mt-0.5 text-sm font-bold tabular-nums text-emerald-600">
              {fmtMoney(totalIn)}
            </div>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2">
            <div className="text-[10px] text-red-500">赔付 OUT（保险赔出）</div>
            <div className="mt-0.5 text-sm font-bold tabular-nums text-red-500">
              {fmtMoney(totalOut)}
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-slate-700">
        流水明细
        <span className="ml-2 text-[11px] font-normal text-slate-500">{logs.length} 笔</span>
      </h3>

      {logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          保险采用盲记账，只记录 IN / OUT 金额，无需绑定玩家
        </div>
      ) : (
        <ul className="space-y-2">
          {logs.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Badge tone={l.type === 'in' ? 'green' : 'red'}>
                  {l.type === 'in' ? 'IN' : 'OUT'}
                </Badge>
                <div className="min-w-0">
                  <div
                    className={`text-sm font-bold tabular-nums ${
                      l.type === 'in' ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {l.type === 'in' ? '+' : '-'}
                    {fmtMoney(Number(l.amount))}
                  </div>
                  <div className="truncate text-[11px] text-slate-500">
                    {fmtTime(l.timestamp)}
                    {l.remark ? ` · ${l.remark}` : ''}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onDelete(l.id)}
                disabled={disabled}
                aria-label="删除该笔流水"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="保险记账">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setType('in')}
              className={`min-h-12 cursor-pointer rounded-xl border text-sm font-semibold transition-colors ${
                type === 'in'
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-600'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              IN · 收保险费
            </button>
            <button
              onClick={() => setType('out')}
              className={`min-h-12 cursor-pointer rounded-xl border text-sm font-semibold transition-colors ${
                type === 'out'
                  ? 'border-red-500/50 bg-red-500/15 text-red-500'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              OUT · 保险赔付
            </button>
          </div>

          <Field label="金额">
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="0"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-4 gap-2">
            {[200, 500, 1000, 2000].map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className="min-h-11 cursor-pointer rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                {a}
              </button>
            ))}
          </div>

          <Field label="备注（可选）">
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="例如：第 5 手 AA 被爆"
              className={inputClass}
            />
          </Field>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button className="flex-1" onClick={submit} disabled={working || !amount}>
              {working ? '保存中…' : '确认记账'}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}