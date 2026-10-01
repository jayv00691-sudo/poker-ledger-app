'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

const PrivacyContext = createContext<{
  privacyMode: boolean
  togglePrivacy: () => void
  mask: (value: string) => string
}>({
  privacyMode: false,
  togglePrivacy: () => {},
  mask: (v) => v,
})

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [privacyMode, setPrivacyMode] = useState(false)

  const togglePrivacy = () => setPrivacyMode((p) => !p)

  const mask = (value: string) => (privacyMode ? '••••' : value)

  return (
    <PrivacyContext.Provider value={{ privacyMode, togglePrivacy, mask }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  return useContext(PrivacyContext)
}
