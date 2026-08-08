"use client"

// Telemetry client — captures window errors / unhandled rejections and reports
// them best-effort to /api/v1/telemetry. Throttled (1/s), bounded, never throws,
// no secrets. Wired once in the root layout (superflow Phase 5).
import { useEffect } from "react"

function send(kind: string, message: string, url: string, stack?: string) {
  const body = JSON.stringify({
    kind,
    message: message.slice(0, 500),
    url: url.slice(0, 500),
    stack: stack?.slice(0, 2000),
  })
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/v1/telemetry", new Blob([body], { type: "application/json" }))
  } else {
    fetch("/api/v1/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }).catch(() => {})
  }
}

export default function Telemetry() {
  useEffect(() => {
    let last = 0
    const throttle = (kind: string, message: string, url: string, stack?: string) => {
      const now = Date.now()
      if (now - last < 1000) return
      last = now
      send(kind, message, url, stack)
    }
    const onErr = (e: ErrorEvent) => throttle("error", e.message || "window error", location.href, e.error?.stack)
    const onRej = (e: PromiseRejectionEvent) =>
      throttle("error", String((e.reason as Error)?.message || e.reason), location.href)
    window.addEventListener("error", onErr)
    window.addEventListener("unhandledrejection", onRej)
    return () => {
      window.removeEventListener("error", onErr)
      window.removeEventListener("unhandledrejection", onRej)
    }
  }, [])
  return null
}
