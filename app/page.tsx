"use client"

import { useState } from "react"
import { PayKitProvider, usePayKit, Paywall } from "@/lib/paykit-react"

// A mock "AI app" that uses PayKit for credits + paywall — the live demo of the value prop.
function Demo() {
  const { account, loading, meter, buyCredits, upgrade } = usePayKit()
  const [log, setLog] = useState<string[]>([])

  async function generate() {
    const r = await meter("image_gen")
    setLog((l) => [r.blocked ? "❌ Blocked — out of credits" : `🖼️ Generated (–1 credit, ${r.remaining} left)`, ...l])
  }

  if (loading) return <p className="text-neutral-500">Loading…</p>

  return (
    <div className="flex flex-col gap-8">
      {/* Account bar */}
      <div className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900/60 px-6 py-4">
        <div>
          <div className="text-sm text-neutral-500">Plan</div>
          <div className="font-semibold capitalize">{account?.plan}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-neutral-500">Credits</div>
          <div className="text-2xl font-bold text-emerald-400">{account?.credits}</div>
        </div>
      </div>

      {/* The metered action */}
      <div className="flex flex-col gap-3">
        <button
          onClick={generate}
          className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-neutral-950 transition hover:bg-emerald-300"
        >
          Generate image (1 credit)
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => buyCredits(10)}
            className="flex-1 rounded-xl border border-neutral-700 px-4 py-2.5 text-sm hover:border-neutral-500"
          >
            Buy 10 credits
          </button>
          <button
            onClick={() => upgrade(account?.plan === "pro" ? "free" : "pro")}
            className="flex-1 rounded-xl border border-neutral-700 px-4 py-2.5 text-sm hover:border-neutral-500"
          >
            {account?.plan === "pro" ? "Downgrade to Free" : "Upgrade to Pro"}
          </button>
        </div>
      </div>

      {/* Paywalled feature */}
      <Paywall
        plan="pro"
        fallback={
          <div className="rounded-2xl border border-dashed border-neutral-700 px-6 py-5 text-neutral-500">
            🔒 <strong className="text-neutral-300">Pro feature</strong> — upgrade to unlock HD upscaling.
          </div>
        }
      >
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-5 text-emerald-300">
          ✨ <strong>Pro feature unlocked</strong> — HD upscaling enabled.
        </div>
      </Paywall>

      {/* Log */}
      {log.length > 0 && (
        <div className="flex flex-col gap-1 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-400">
          {log.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">PayKit — live demo</h1>
        <p className="text-neutral-400">
          A mock AI app wired to PayKit. <code className="text-emerald-400">meter()</code> deducts credits per
          generation; <code className="text-emerald-400">&lt;Paywall&gt;</code> gates the Pro feature. All real, in-memory.
        </p>
      </header>
      <PayKitProvider userId="demo-user">
        <Demo />
      </PayKitProvider>
      <footer className="text-sm text-neutral-600">
        Next: swap the in-memory store for Postgres and wire Stripe Checkout → webhook → grantCredits.
      </footer>
    </main>
  )
}
