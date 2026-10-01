'use client'

import { useEffect, type ReactNode } from 'react'
import { X, Plus } from 'lucide-react'

/* ================================================================
 * 浅色液态设计系统组件
 * 玻璃效果仅用于 Modal/浮层，内容区使用纯白卡片
 * ================================================================ */

/* ================================================================
 * Modal — Bottom sheet on mobile, centered on desktop（液态玻璃浮层）
 * ================================================================ */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/35 backdrop-blur-[4px] sm:items-center"
      onClick={onClose}
    >
      <div
        className="glass w-full max-w-md rounded-t-3xl p-5 sm:rounded-3xl"
        style={{ background: 'rgba(255,255,255,0.88)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="mt-0.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-700 active:scale-[0.92]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ================================================================
 * Button — 触觉反馈、统一尺寸
 * ================================================================ */
export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger' | 'warn'
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}) {
  const base =
    'inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.97]'
  const variants: Record<string, string> = {
    primary:
      'bg-blue-600 text-white shadow-sm shadow-blue-600/25 hover:bg-blue-500',
    ghost:
      'border border-slate-200 bg-white text-slate-700 shadow-sm shadow-slate-200/50 hover:bg-slate-50 hover:text-slate-900',
    danger: 'bg-red-500 text-white shadow-sm shadow-red-500/25 hover:bg-red-400',
    warn: 'bg-amber-500 text-white shadow-sm shadow-amber-500/25 hover:bg-amber-400',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

/* ================================================================
 * Stat — 指标卡
 * ================================================================ */
export function Stat({
  label,
  value,
  tone = 'neutral',
  sub,
  icon,
}: {
  label: string
  value: string
  tone?: 'neutral' | 'positive' | 'negative' | 'warn'
  sub?: string
  icon?: ReactNode
}) {
  const tones: Record<string, string> = {
    neutral: 'text-slate-900',
    positive: 'text-emerald-600',
    negative: 'text-red-500',
    warn: 'text-amber-600',
  }
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {icon}
        {label}
      </div>
      <div className={`mt-1.5 text-xl font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-[10px] text-slate-400">{sub}</div> : null}
    </div>
  )
}

/* ================================================================
 * Badge — 状态指示
 * ================================================================ */
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'emerald' | 'blue'
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-slate-100 text-slate-500 border-slate-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

/* ================================================================
 * Field — 表单字段容器
 * ================================================================ */
export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-500">{label}</span>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </label>
  )
}

/* ================================================================
 * Input — 标准输入
 * ================================================================ */
export const inputClass =
  'w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none shadow-sm shadow-slate-100 transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20'

/* ================================================================
 * Spinner
 * ================================================================ */
export function Spinner() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
  )
}

/* ================================================================
 * EmptyState
 * ================================================================ */
export function EmptyState({ icon, title, sub }: { icon?: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-12 text-center">
      {icon && <div className="mb-3 text-slate-300">{icon}</div>}
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {sub && <p className="mt-1 text-[11px] text-slate-400">{sub}</p>}
    </div>
  )
}

/* ================================================================
 * SectionCard — 内容区块
 * ================================================================ */
export function SectionCard({
  title,
  action,
  children,
  className = '',
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}
