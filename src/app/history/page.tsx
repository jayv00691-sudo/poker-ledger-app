'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Session } from '@/lib/types'
import { listSessions } from '@/lib/api'
import { fmtDate } from '@/lib/format'
import { Badge, Spinner } from '@/components/ui'
import { RAKE_MODE_SHORT } from '@/lib/types'

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listSessions().then(setSessions).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-zinc-400">
        <Spinner />
        <span className="text-sm">加载中…</span>
      </div>
    )
  }

  const ended = sessions.filter((s) => s.status === 'ended')

  return (
    <div className="mx-auto max-w-3xl px-3 py-4">
      <h1 className="mb-4 text-lg font-bold text-zinc-100">历史战报</h1>

      {ended.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-12 text-center">
          <p className="text-sm text-zinc-500">还没有已结束的场次</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ended.map((s) => (
            <Link
              key={s.id}
              href={`/session/${s.id}/settle`}
              className="block rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 transition-colors hover:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-zinc-100">{s.title}</span>
                    <Badge tone="neutral">已结束</Badge>
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">
                    {fmtDate(s.start_time)} · {RAKE_MODE_SHORT[s.rake_mode]}
                    {s.stakes ? ` · ${s.stakes}` : ''}
                    {s.shareholder ? ` · ${s.shareholder}` : ''}
                  </div>
                </div>
                <div className="text-xs text-zinc-500">
                  {s.currency}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
