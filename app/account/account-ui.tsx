"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const card = "border:1px solid #1f1f23;border-radius:14px;background:#0c0c0e;padding:18px 20px"
const keyRow = "display:flex;align-items:center;gap:10px;margin-top:8px"
const keyCode = "flex:1;min-width:0;font-family:'Geist Mono',monospace;font-size:12.5px;color:#cfcfd6;background:#0e0e10;border:1px solid #1f1f23;border-radius:8px;padding:8px 11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
const btn = "padding:7px 12px;border-radius:8px;background:#131316;border:1px solid #2a2a2e;color:#a5a5ad;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;white-space:nowrap"

function css(s: string): React.CSSProperties {
  const o: Record<string, string> = {}
  for (const d of s.split(";")) {
    const i = d.indexOf(":")
    if (i < 0) continue
    const k = d.slice(0, i).trim()
    if (!k) continue
    o[k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = d.slice(i + 1).trim()
  }
  return o as React.CSSProperties
}

type Project = { id: string; name: string; publishableKey: string; secretKey: string }

export function CreateProject() {
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  async function create() {
    setBusy(true)
    try {
      await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || "My project" }),
      })
      setName("")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }
  return (
    <div style={css("display:flex;gap:10px;flex-wrap:wrap")}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name (e.g. My SaaS)"
        style={css("flex:1;min-width:200px;padding:10px 13px;border-radius:10px;background:#0e0e10;border:1px solid #2a2a2e;color:#fafafa;font-size:14px;font-family:inherit;outline:none")}
      />
      <button onClick={create} disabled={busy} style={css("padding:10px 18px;border-radius:10px;background:var(--ac);color:#06120c;font-size:14px;font-weight:600;border:none;cursor:pointer;font-family:inherit")}>
        {busy ? "Creating…" : "Create project"}
      </button>
    </div>
  )
}

export function ProjectCard({ project }: { project: Project }) {
  const [reveal, setReveal] = useState(false)
  const [copied, setCopied] = useState("")
  function copy(id: string, text: string) {
    try {
      navigator.clipboard?.writeText(text)
    } catch {
      /* ignore */
    }
    setCopied(id)
    setTimeout(() => setCopied((c) => (c === id ? "" : c)), 1500)
  }
  return (
    <div style={css(card)}>
      <div style={css("font-size:15px;font-weight:600;color:#fafafa;margin-bottom:4px;letter-spacing:-0.01em")}>{project.name}</div>
      <div style={css("font-size:11px;color:#76767e;letter-spacing:0.05em;text-transform:uppercase;margin-top:12px")}>Publishable key</div>
      <div style={css(keyRow)}>
        <code style={css(keyCode)}>{project.publishableKey}</code>
        <button style={css(btn)} onClick={() => copy("pk", project.publishableKey)}>{copied === "pk" ? "Copied" : "Copy"}</button>
      </div>
      <div style={css("font-size:11px;color:#76767e;letter-spacing:0.05em;text-transform:uppercase;margin-top:14px")}>Secret key</div>
      <div style={css(keyRow)}>
        <code style={css(keyCode)}>{reveal ? project.secretKey : "sk_live_" + "•".repeat(24)}</code>
        <button style={css(btn)} onClick={() => setReveal((r) => !r)}>{reveal ? "Hide" : "Reveal"}</button>
        <button style={css(btn)} onClick={() => copy("sk", project.secretKey)}>{copied === "sk" ? "Copied" : "Copy"}</button>
      </div>
      <div style={css("margin-top:14px;padding-top:12px;border-top:1px solid #18181b;font-size:12px;color:#6b6b73;line-height:1.5")}>
        Embed: <code style={css("font-family:'Geist Mono',monospace;color:#9a9aa2")}>&lt;script src=&quot;/embed.js&quot; data-key=&quot;{project.publishableKey}&quot;&gt;&lt;/script&gt;</code>
      </div>
    </div>
  )
}
