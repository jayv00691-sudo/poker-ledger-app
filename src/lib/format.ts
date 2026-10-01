export function fmtMoney(n: number): string {
  const v = Number.isFinite(n) ? n : 0
  const sign = v < 0 ? '-' : ''
  return `${sign}${Math.abs(v).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
}

export function fmtSigned(n: number): string {
  const v = Number.isFinite(n) ? n : 0
  return `${v > 0 ? '+' : v < 0 ? '-' : ''}${Math.abs(v).toLocaleString('zh-CN', {
    maximumFractionDigits: 2,
  })}`
}

export function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function todayTitle(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 现金局`
}