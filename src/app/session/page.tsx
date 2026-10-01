'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getActiveSession } from '@/lib/api'
import { Spinner } from '@/components/ui'

export default function SessionRedirectPage() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    getActiveSession().then((session) => {
      if (session) {
        router.replace(`/session/${session.id}`)
      } else {
        router.replace('/')
      }
    }).finally(() => setChecked(true))
  }, [router])

  return (
    <div className="flex min-h-[60vh] items-center justify-center gap-3 text-zinc-400">
      <Spinner />
      <span className="text-sm">跳转中…</span>
    </div>
  )
}
