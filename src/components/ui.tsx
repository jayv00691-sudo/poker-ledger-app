'use client'

import { useEffect, type ReactNode } from 'react'
import { X, Plus } from 'lucide-react'

/* ================================================================
 * Modal — Bottom sheet on mobile, centered on desktop
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/80 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl shadow-black/40 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="mt-0.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-200 active:scale-[0.92]"
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
 * Button — Tactile feedback, consistent sizing
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
    primary: 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-900/20',
    ghost: 'border border-zinc-700/60 bg-zinc-800/40 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
    danger: 'bg-red-600/90 text-white hover:bg-red-500 shadow-sm shadow-red-900/20',
    warn: 'bg-amber-600 text-white hover:bg-amber-500 shadow-sm shadow-amber-900/20',
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
 * Stat — Metric display card
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
    neutral: 'text-zinc-100',
    positive: 'text-emerald-400',
    negative: 'text-red-400',
    warn: 'text-amber-400',
  }
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {icon}
        {label}
      </div>
      <div className={`mt-1.5 text-xl font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-[10px] text-zinc-600">{sub}</div> : null}
    </div>
  )
}

/* ================================================================
 * Badge — Status indicator
 * ================================================================ */
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'emerald'
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    red: 'bg-red-500/10 text-red-400 border-red-500/25',
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
 * Field — Form field wrapper
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
        <span className="text-[11px] font-medium text-zinc-400">{label}</span>
        {hint && <span className="text-[10px] text-zinc-600">{hint}</span>}
      </div>
      {children}
    </label>
  )
}

/* ================================================================
 * Input — Standard input styling
 * ================================================================ */
export const inputClass =
  'w-full min-h-11 rounded-lg border border-zinc-700/50 bg-zinc-950/80 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30'

/* ================================================================
 * Spinner
 * ================================================================ */
export function Spinner() {
  return (
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
  )
}

/* ================================================================
 * EmptyState
 * ================================================================ */
export function EmptyState({ icon, title, sub }: { icon?: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/60 bg-zinc-900/20 px-4 py-12 text-center">
      {icon && <div className="mb-3 text-zinc-600">{icon}</div>}
      <p className="text-sm text-zinc-500">{title}</p>
      {sub && <p className="mt-1 text-[11px] text-zinc-600">{sub}</p>}
    </div>
  )
}

/* ================================================================
 * SectionCard — Content section wrapper
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
    <section className={`rounded-xl border border-zinc-800/60 bg-zinc-900/30 ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}
