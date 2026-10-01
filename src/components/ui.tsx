'use client'

import { useEffect, type ReactNode } from 'react'

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
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
        className="w-full max-w-md rounded-t-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-100 active:scale-[0.92]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

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
  variant?: 'primary' | 'ghost' | 'danger' | 'success'
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}) {
  const base =
    'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97]'
  const variants: Record<string, string> = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-500',
    ghost: 'border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
    danger: 'bg-red-600 text-white hover:bg-red-500',
    success: 'bg-amber-600 text-white hover:bg-amber-500',
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

export function Stat({
  label,
  value,
  tone = 'neutral',
  sub,
}: {
  label: string
  value: string
  tone?: 'neutral' | 'positive' | 'negative' | 'warn'
  sub?: string
}) {
  const tones: Record<string, string> = {
    neutral: 'text-zinc-100',
    positive: 'text-emerald-400',
    negative: 'text-red-400',
    warn: 'text-amber-400',
  }
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
      <div className="text-[11px] font-medium tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-zinc-500">{sub}</div> : null}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'green' | 'amber' | 'red' | 'sky'
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    sky: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-zinc-400">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full min-h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40'

export function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}