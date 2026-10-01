/** 格式化金额；currency 传入时前置货币符号（如 "¥1,200"） */
export function fmtMoney(n: number, currency?: string): string {
  const v = Number.isFinite(n) ? n : 0
  const sign = v < 0 ? '-' : ''
  const num = Math.abs(v).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
  const prefix = currency ? `${currency} ` : ''
  return `${sign}${prefix}${num}`
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