"use client"

// PayKit React SDK — the thin client. Reads access, triggers metering & purchases.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import type { Account, MeterResult } from "./types"

interface PayKitContextValue {
  account: Account | null
  loading: boolean
  refresh: () => Promise<void>
  meter: (event: string, cost?: number) => Promise<MeterResult>
  /** Local stand-in purchase (no Stripe). */
  buyCredits: (amount: number) => Promise<void>
  upgrade: (plan: string) => Promise<void>
  /** Real Stripe Checkout — redirects. Throws if Stripe isn't configured. */
  checkout: (kind: "credits" | "pro") => Promise<void>
  hasAccess: (plan: string) => boolean
}

const PayKitContext = createContext<PayKitContextValue | null>(null)

export function PayKitProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/v1/access?userId=${encodeURIComponent(userId)}`)
    setAccount(await res.json())
    setLoading(false)
  }, [userId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const meter = useCallback(
    async (event: string, cost = 1): Promise<MeterResult> => {
      const res = await fetch(`/api/v1/meter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, event, cost }),
      })
      const data = (await res.json()) as MeterResult
      await refresh()
      return data
    },
    [userId, refresh],
  )

  const buyCredits = useCallback(
    async (amount: number) => {
      await fetch(`/api/v1/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount }),
      })
      await refresh()
    },
    [userId, refresh],
  )

  const upgrade = useCallback(
    async (plan: string) => {
      await fetch(`/api/v1/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan }),
      })
      await refresh()
    },
    [userId, refresh],
  )

  const checkout = useCallback(
    async (kind: "credits" | "pro") => {
      const res = await fetch(`/api/v1/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, kind }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Checkout unavailable")
      }
      const { url } = await res.json()
      if (url) window.location.href = url
    },
    [userId],
  )

  const hasAccess = useCallback(
    (plan: string) => plan === "free" || Boolean(account?.entitlements.includes(plan)),
    [account],
  )

  return (
    <PayKitContext.Provider
      value={{ account, loading, refresh, meter, buyCredits, upgrade, checkout, hasAccess }}
    >
      {children}
    </PayKitContext.Provider>
  )
}

export function usePayKit() {
  const ctx = useContext(PayKitContext)
  if (!ctx) throw new Error("usePayKit must be used inside <PayKitProvider>")
  return ctx
}

export function Paywall({
  plan,
  children,
  fallback = null,
}: {
  plan: string
  children: ReactNode
  fallback?: ReactNode
}) {
  const { hasAccess } = usePayKit()
  return <>{hasAccess(plan) ? children : fallback}</>
}
