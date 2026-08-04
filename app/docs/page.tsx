"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { CREDIT_PACK_SIZE, CREDIT_PACK_USD, PRO_PRICE_USD } from "@/lib/types"

/* Parse a CSS string into a React style object (same helper as the showcase). */
function css(s: string): React.CSSProperties {
  const o: Record<string, string> = {}
  for (const decl of s.split(";")) {
    const i = decl.indexOf(":")
    if (i < 0) continue
    const prop = decl.slice(0, i).trim()
    if (!prop) continue
    o[prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = decl.slice(i + 1).trim()
  }
  return o as React.CSSProperties
}

/* ----------------------------- nav model ----------------------------- */

type NavItem = { id: string; label: string }
const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Getting started",
    items: [
      { id: "introduction", label: "Introduction" },
      { id: "quickstart", label: "Quickstart" },
    ],
  },
  {
    group: "Concepts",
    items: [
      { id: "concepts", label: "Core concepts" },
      { id: "metering", label: "Metering & credits" },
      { id: "billing", label: "Billing & Stripe" },
    ],
  },
  {
    group: "Reference",
    items: [
      { id: "react-sdk", label: "React SDK" },
      { id: "embed", label: "Embed script" },
      { id: "rest-api", label: "REST API" },
    ],
  },
  {
    group: "Operate",
    items: [
      { id: "self-hosting", label: "Self-hosting" },
      { id: "security", label: "Security" },
      { id: "faq", label: "FAQ" },
    ],
  },
]
const FLAT = NAV.flatMap((g) => g.items)

/* ----------------------------- primitives ----------------------------- */

function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <rect width="26" height="26" rx="7" fill="var(--ac)" />
      <path fillRule="evenodd" fill="rgba(255,255,255,0.93)" d="M4.5 5H7.5C13.5 5 13.5 12.5 7.5 12.5V21H4.5ZM7.5 8C11 8 11 11 7.5 11Z" />
      <line x1="14.5" y1="5" x2="14.5" y2="21" stroke="rgba(255,255,255,0.93)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="15.5" y1="12.5" x2="21.5" y2="5" stroke="rgba(255,255,255,0.93)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="15.5" y1="12.5" x2="21.5" y2="21" stroke="rgba(255,255,255,0.93)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function Code({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    try {
      navigator.clipboard?.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* ignore */
    }
  }
  const lines = code.replace(/\n$/, "").split("\n")
  return (
    <div className="docs-code" style={css("margin:18px 0;border:1px solid #1f1f23;border-radius:12px;background:#0c0c0e;overflow:hidden;")}>
      {lang && (
        <div style={css("display:flex;align-items:center;justify-content:space-between;padding:7px 14px;border-bottom:1px solid #161619;background:#0e0e10;")}>
          <span style={css("font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#5b5b63;font-family:'Geist Mono',monospace;")}>{lang}</span>
        </div>
      )}
      <button className="docs-copy" onClick={copy} style={lang ? css("top:38px;") : undefined}>
        {copied ? "Copied" : "Copy"}
      </button>
      <pre style={css("margin:0;padding:15px 16px;overflow-x:auto;font-family:'Geist Mono',monospace;font-size:13px;line-height:1.65;color:#cdcdd4;")}>
        {lines.map((ln, i) => {
          const t = ln.trimStart()
          const isComment = t.startsWith("//") || t.startsWith("#") || t.startsWith("<!--") || t.startsWith("*")
          return (
            <div key={i} style={isComment ? css("color:#565a66;") : undefined}>
              {ln || " "}
            </div>
          )
        })}
      </pre>
    </div>
  )
}

function H2({ id, children, eyebrow }: { id: string; children: ReactNode; eyebrow?: string }) {
  return (
    <div id={id} data-sec style={css("scroll-margin-top:80px;margin:0 0 18px;")}>
      {eyebrow && <div style={css("font-size:12px;font-weight:600;color:var(--ac);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px;")}>{eyebrow}</div>}
      <h2 style={css("font-size:28px;font-weight:600;letter-spacing:-0.03em;color:#fafafa;margin:0;line-height:1.15;")}>{children}</h2>
    </div>
  )
}

function H3({ children }: { children: ReactNode }) {
  return <h3 style={css("font-size:16.5px;font-weight:600;letter-spacing:-0.01em;color:#fafafa;margin:34px 0 12px;")}>{children}</h3>
}

function P({ children }: { children: ReactNode }) {
  return <p style={css("font-size:15px;line-height:1.7;color:#a8a8b0;margin:12px 0;")}>{children}</p>
}

function Mono({ children }: { children: ReactNode }) {
  return <code style={css("font-family:'Geist Mono',monospace;font-size:0.88em;color:#d8d8de;background:#161619;border:1px solid #232327;border-radius:5px;padding:1px 6px;")}>{children}</code>
}

function A({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} className="docs-a">{children}</a>
}

function Section({ children, top }: { children: ReactNode; top?: boolean }) {
  return <section style={css(`padding:${top ? "0" : "56px"} 0 0;`)}>{children}</section>
}

function Callout({ children, kind = "note" }: { children: ReactNode; kind?: "note" | "warn" }) {
  const tone = kind === "warn" ? "#f5b97a" : "var(--ac)"
  return (
    <div style={css(`display:flex;gap:12px;margin:18px 0;padding:14px 16px;border-radius:11px;background:color-mix(in srgb,${tone} 7%,#0c0c0e);border:1px solid color-mix(in srgb,${tone} 26%,#1f1f23);`)}>
      <div style={css(`flex:none;width:18px;height:18px;border-radius:50%;background:color-mix(in srgb,${tone} 18%,transparent);color:${tone};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;margin-top:1px;`)}>{kind === "warn" ? "!" : "i"}</div>
      <div style={css("font-size:14px;line-height:1.6;color:#b4b4bc;")}>{children}</div>
    </div>
  )
}

/* A simple two-column data table. */
function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div style={css("margin:18px 0;border:1px solid #1f1f23;border-radius:11px;overflow:hidden;")}>
      <table style={css("width:100%;border-collapse:collapse;font-size:13.5px;")}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} style={css("text-align:left;padding:10px 14px;background:#0e0e10;border-bottom:1px solid #1f1f23;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:#6b6b73;")}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} style={css(`padding:11px 14px;color:${j === 0 ? "#e4e4e7" : "#9a9aa2"};line-height:1.55;vertical-align:top;${i < rows.length - 1 ? "border-bottom:1px solid #161619;" : ""}`)}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const METHOD_TONE: Record<string, string> = { GET: "#4ade80", POST: "#60a5fa", PATCH: "#fbbf24", DELETE: "#f87171" }
function Endpoint({ method, path, children }: { method: string; path: string; children: ReactNode }) {
  const tone = METHOD_TONE[method] ?? "#9a9aa2"
  return (
    <div style={css("margin:26px 0;padding:18px 20px;border:1px solid #1f1f23;border-radius:13px;background:linear-gradient(180deg,#0d0d0f,#0a0a0c);")}>
      <div style={css("display:flex;align-items:center;gap:11px;margin-bottom:6px;flex-wrap:wrap;")}>
        <span style={css(`font-family:'Geist Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.04em;color:${tone};background:color-mix(in srgb,${tone} 13%,transparent);border:1px solid color-mix(in srgb,${tone} 32%,transparent);border-radius:6px;padding:3px 9px;`)}>{method}</span>
        <span style={css("font-family:'Geist Mono',monospace;font-size:14px;font-weight:500;color:#fafafa;")}>{path}</span>
      </div>
      {children}
    </div>
  )
}

/* ----------------------------- page ----------------------------- */

export default function DocsPage() {
  const [active, setActive] = useState("introduction")

  // Scroll-spy: highlight the nav entry for the section currently in view.
  useEffect(() => {
    const secs = Array.from(document.querySelectorAll<HTMLElement>("[data-sec]"))
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setActive(vis[0].target.id)
      },
      { rootMargin: "-72px 0px -70% 0px", threshold: 0 },
    )
    secs.forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [])

  return (
    <div style={css("min-height:100vh;background:#0a0a0a;scroll-behavior:smooth;")}>
      {/* top bar */}
      <header style={css("position:sticky;top:0;z-index:20;border-bottom:1px solid #161619;background:rgba(10,10,10,0.82);backdrop-filter:blur(12px);")}>
        <div style={css("max-width:1320px;margin:0 auto;padding:13px 32px;display:flex;align-items:center;justify-content:space-between;gap:16px;")}>
          <Link href="/" style={css("display:flex;align-items:center;gap:9px;text-decoration:none;")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="PayKit" style={{ height: 22, width: "auto", display: "block" } as React.CSSProperties} />
            <span style={css("font-size:12px;font-weight:600;color:#6b6b73;letter-spacing:0.02em;border-left:1px solid #2a2a2e;padding-left:9px;")}>Docs</span>
          </Link>
          <div style={css("display:flex;align-items:center;gap:18px;")}>
            <Link href="/demo" className="pk-link" style={css("font-size:13px;color:#8b8b93;text-decoration:none;")}>Live demo</Link>
            <Link href="/" className="pk-link" style={css("font-size:13px;color:#8b8b93;text-decoration:none;")}>Dashboard</Link>
            <a href="https://paykit-two.vercel.app" className="pk-primary" style={css("display:inline-flex;align-items:center;gap:7px;padding:7px 14px;border-radius:9px;background:var(--ac);color:#06120c;font-size:13px;font-weight:600;text-decoration:none;")}>Get started</a>
          </div>
        </div>
      </header>

      {/* mobile section nav */}
      <div className="docs-mobnav" style={css("position:sticky;top:49px;z-index:15;padding:10px 20px;background:rgba(10,10,10,0.9);backdrop-filter:blur(10px);border-bottom:1px solid #161619;")}>
        <select
          value={active}
          onChange={(e) => { const el = document.getElementById(e.target.value); el?.scrollIntoView({ behavior: "smooth" }) }}
          style={css("width:100%;padding:9px 12px;border-radius:9px;background:#0e0e10;border:1px solid #2a2a2e;color:#e4e4e7;font-size:14px;font-family:inherit;outline:none;")}
        >
          {NAV.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.items.map((it) => <option key={it.id} value={it.id}>{it.label}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="docs-shell">
        {/* left nav */}
        <nav className="docs-sidebar">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="docs-grouplabel">{g.group}</div>
              {g.items.map((it) => (
                <a
                  key={it.id}
                  href={`#${it.id}`}
                  className={"docs-navlink" + (active === it.id ? " active" : "")}
                  onClick={(e) => { e.preventDefault(); document.getElementById(it.id)?.scrollIntoView({ behavior: "smooth" }) }}
                >
                  {it.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* content */}
        <main className="docs-main">
          {/* hero */}
          <Section top>
            <div style={css("display:inline-flex;align-items:center;gap:8px;padding:5px 12px;border-radius:999px;background:color-mix(in srgb,var(--ac) 10%,transparent);border:1px solid color-mix(in srgb,var(--ac) 26%,transparent);margin-bottom:20px;")}>
              <Logo size={15} />
              <span style={css("font-size:12px;font-weight:600;color:var(--ac);letter-spacing:0.02em;")}>Documentation</span>
            </div>
            <h1 style={css("font-size:42px;font-weight:600;letter-spacing:-0.04em;color:#fafafa;margin:0 0 16px;line-height:1.08;")}>
              Billing for AI apps,<br />without building billing.
            </h1>
            <p style={css("font-size:17px;line-height:1.6;color:#a8a8b0;max-width:600px;margin:0;")}>
              Drop in a meter call, gate Pro features, sell credit packs. PayKit runs the ledger and
              Stripe takes the money — no billing tables, no webhook plumbing, no portal to build.
            </p>
            <div style={css("display:flex;flex-wrap:wrap;gap:10px;margin-top:26px;")}>
              <a href="#quickstart" onClick={(e) => { e.preventDefault(); document.getElementById("quickstart")?.scrollIntoView({ behavior: "smooth" }) }} className="pk-hero-cta" style={css("display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:10px;background:var(--ac);color:#06120c;font-size:14.5px;font-weight:600;text-decoration:none;cursor:pointer;box-shadow:0 0 0 1px color-mix(in srgb,var(--ac) 55%,transparent),0 10px 30px color-mix(in srgb,var(--ac) 24%,transparent);")}>
                Quickstart
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
              </a>
              <a href="#rest-api" onClick={(e) => { e.preventDefault(); document.getElementById("rest-api")?.scrollIntoView({ behavior: "smooth" }) }} className="pk-ghost" style={css("display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:10px;background:#131315;color:#e4e4e7;font-size:14.5px;font-weight:550;border:1px solid #2a2a2e;text-decoration:none;cursor:pointer;")}>API reference</a>
            </div>
          </Section>

          {/* Introduction */}
          <Section>
            <H2 id="introduction" eyebrow="Getting started">Introduction</H2>
            <P>
              Charging for an AI app means metering every model call, selling credits, gating premium
              features, and reconciling all of it with Stripe. That&apos;s a database, a webhook handler,
              a customer portal — and a week you don&apos;t have.
            </P>
            <P>
              PayKit gives you one function — <Mono>meter()</Mono> — plus a <Mono>&lt;Paywall&gt;</Mono> and
              a hosted billing API. You call <Mono>meter()</Mono> before each AI call; PayKit deducts a
              credit, tells you if the user is out, and handles buy-more. Subscriptions and credit packs
              settle through Stripe Checkout and land back in the ledger automatically.
            </P>
            <Callout>
              <strong style={css("color:#e4e4e7;")}>PayKit does not run your AI model.</strong> Throughout
              these docs <Mono>image_gen</Mono> is just an example event name — <em>your</em> label for one
              billable action. Name it whatever your app does: <Mono>chat_message</Mono>, <Mono>transcription</Mono>,
              <Mono>render</Mono>. PayKit only counts and bills.
            </Callout>
          </Section>

          {/* Quickstart */}
          <Section>
            <H2 id="quickstart" eyebrow="Getting started">Quickstart</H2>
            <P>Pick the path that matches your stack. All three hit the same API.</P>

            <H3>1 · No-code — any website, 30 seconds</H3>
            <P>Paste one line. Renders a live credits meter + Buy button and wires every <Mono>data-paykit-*</Mono> element. Works on Webflow, Wix, WordPress, plain HTML.</P>
            <Code lang="html" code={`<div id="paykit"></div>
<script src="https://paykit-two.vercel.app/embed.js" data-key="pk_live_…"></script>

<!-- spend a credit on click -->
<button data-paykit-meter="image_gen">Generate</button>

<!-- show only to Pro users -->
<div data-paykit-plan="pro">Pro-only content</div>`} />

            <H3>2 · React</H3>
            <Code lang="tsx" code={`import { PayKitProvider, Paywall, usePayKit } from "@paykit/react"

export default function App({ user }) {
  return (
    <PayKitProvider userId={user.id}>
      <ImageStudio />
      <Paywall plan="pro" fallback={<UpgradeCard />}>
        <HDUpscale />          {/* gated — Pro only */}
      </Paywall>
    </PayKitProvider>
  )
}

function ImageStudio() {
  const { meter, account } = usePayKit()
  async function generate() {
    const { blocked } = await meter("image_gen")   // −1 credit
    if (blocked) return openBuyCredits()
    runYourModel()
  }
  return <button onClick={generate}>Generate ({account?.credits} left)</button>
}`} />

            <H3>3 · Any backend (REST)</H3>
            <P>Meter from your <strong style={css("color:#cfcfd6;")}>server</strong>, where it&apos;s safe — never trust the client for billing.</P>
            <Code lang="bash" code={`curl -X POST https://paykit-two.vercel.app/api/v1/meter \\
  -H "x-paykit-key: sk_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{ "userId": "user_123", "event": "image_gen" }'
# → { "ok": true, "remaining": 4 }`} />
          </Section>

          {/* Concepts */}
          <Section>
            <H2 id="concepts" eyebrow="Concepts">Core concepts</H2>
            <Table
              head={["Concept", "What it is"]}
              rows={[
                [<Mono key="a">Account</Mono>, "One of your users, identified by a userId you choose. Holds plan, credits, entitlements. Created on first touch with 5 free credits."],
                [<Mono key="b">Credit</Mono>, "A unit of usage. meter() deducts credits; packs and grants add them. Deduction is atomic — never goes negative."],
                [<Mono key="c">Plan</Mono>, <>free or pro. A plan maps to entitlements (pro → [&quot;pro&quot;]). Drives &lt;Paywall&gt; and hasAccess().</>],
                [<Mono key="d">Project</Mono>, "Your tenant boundary. Each has a publishable key (pk_live_…) and a secret key (sk_live_…)."],
                [<Mono key="e">Demo project</Mono>, "pk_live_demo / sk_live_demo — an open public sandbox. Try the API with zero setup; never ship it."],
              ]}
            />
            <H3>Keys — and where they go</H3>
            <Table
              head={["Key", "Use it…", "Never…"]}
              rows={[
                [<Mono key="a">pk_live_</Mono>, "Browser, embed script, access/meter reads", "—"],
                [<Mono key="b">sk_live_</Mono>, "Server-side only: granting credits, secure metering", "in client code or a public repo"],
              ]}
            />
            <P>
              PayKit reads the key from (in order): the <Mono>x-paykit-key</Mono> header, a <Mono>key</Mono> field
              in the JSON body, or a <Mono>?key=</Mono> query param. No key → the demo project. An unknown key → <Mono>401</Mono>.
            </P>
          </Section>

          {/* Metering */}
          <Section>
            <H2 id="metering" eyebrow="Concepts">Metering &amp; credits</H2>
            <P>
              Deduction is atomic and <strong style={css("color:#cfcfd6;")}>stops at zero</strong> — a user can&apos;t
              go negative. When credits run out, <Mono>meter()</Mono> returns <Mono>blocked: true</Mono> (REST: <Mono>402</Mono>)
              and your code decides what to do. This is the safe default: you never give away unpaid usage.
            </P>
            <Code lang="ts" code={`const { blocked } = await meter("image_gen")
if (blocked) return openBuyCredits()   // don't run the model
runYourModel()`} />
            <H3>Per-call pricing</H3>
            <P>Pass a <Mono>cost</Mono> to charge different amounts per action:</P>
            <Code lang="ts" code={`await meter("hd_upscale", 4)   // costs 4 credits`} />
            <H3>Secure metering</H3>
            <P>
              By default <Mono>/meter</Mono> accepts the publishable key (handy for client/embed use). Flip
              <Mono>secureMetering</Mono> on a project (<Mono>PATCH /projects</Mono>) to require the secret key,
              so only your server can spend credits. Recommended once you&apos;re past the demo.
            </P>
          </Section>

          {/* Billing */}
          <Section>
            <H2 id="billing" eyebrow="Concepts">Billing &amp; Stripe</H2>
            <Code lang="text" code={`User clicks Buy ──▶ POST /checkout ──▶ Stripe Checkout ──▶ payment
                                                            │
 ledger updated ◀── POST /webhook ◀── checkout.session.completed
 (credits granted / plan = pro)`} />
            <Table
              head={["Product", "Detail"]}
              rows={[
                [<Mono key="a">credits</Mono>, `One-time $${CREDIT_PACK_USD} for a ${CREDIT_PACK_SIZE}-credit pack.`],
                [<Mono key="b">pro</Mono>, `$${PRO_PRICE_USD}/mo subscription. Cancelling reverts the user to free.`],
              ]}
            />
            <P>
              The <Mono>userId</Mono> rides along in Stripe metadata, so the webhook credits the exact account.
              For local testing: <Mono>stripe listen --forward-to localhost:3000/api/v1/webhook</Mono>.
            </P>
          </Section>

          {/* React SDK */}
          <Section>
            <H2 id="react-sdk" eyebrow="Reference">React SDK</H2>
            <H3>&lt;PayKitProvider userId&gt;</H3>
            <P>Wrap your app (or the authed part). Loads the account on mount and exposes the context. The one required prop is <Mono>userId</Mono> — your stable id for the current user.</P>
            <H3>usePayKit()</H3>
            <Code lang="ts" code={`const {
  account,    // { userId, plan, credits, entitlements } | null
  loading,    // boolean — true until the first load resolves
  refresh,    // () => Promise<void>            — re-fetch the account
  meter,      // (event, cost=1) => Promise<{ ok, remaining, blocked? }>
  buyCredits, // (amount) => Promise<void>      — local grant (no Stripe; dev/demo)
  upgrade,    // (plan) => Promise<void>        — local plan change (no Stripe; dev/demo)
  checkout,   // (kind: "credits" | "pro") => Promise<void>  — real Stripe, redirects
  hasAccess,  // (plan) => boolean              — entitlement check, sync
} = usePayKit()`} />
            <Table
              head={["Method", "Notes"]}
              rows={[
                [<Mono key="a">meter(event, cost?)</Mono>, "Deduct cost credits (default 1). Returns { ok, remaining } or { blocked: true } when insufficient."],
                [<Mono key="b">checkout(kind)</Mono>, "Opens Stripe Checkout and redirects. Throws if Stripe isn't configured."],
                [<Mono key="c">buyCredits / upgrade</Mono>, "Local stand-ins that change the ledger with no payment. Dev & demo only."],
              ]}
            />
            <H3>&lt;Paywall plan fallback&gt;</H3>
            <Code lang="tsx" code={`<Paywall plan="pro" fallback={<UpgradeCard />}>
  <PremiumFeature />
</Paywall>`} />
            <Callout kind="warn">
              <Mono>&lt;Paywall&gt;</Mono> and <Mono>hasAccess()</Mono> are client-side UX gates, not security.
              Always re-check entitlements on your server before doing privileged work.
            </Callout>
          </Section>

          {/* Embed */}
          <Section>
            <H2 id="embed" eyebrow="Reference">Embed script</H2>
            <P>One script tag, configured with attributes:</P>
            <Table
              head={["Attribute", "Default", "Purpose"]}
              rows={[
                [<Mono key="a">data-key</Mono>, "—", "Your publishable key. Identifies the project."],
                [<Mono key="b">data-user</Mono>, "per-browser id", "Your logged-in user's id. Omit → one is generated & stored in localStorage."],
                [<Mono key="c">data-accent</Mono>, "#34d399", "Brand colour for the meter widget."],
                [<Mono key="d">data-base</Mono>, "script origin", "API origin, if you self-host the API elsewhere."],
              ]}
            />
            <H3>Declarative attributes</H3>
            <Code lang="html" code={`<button data-paykit-meter="image_gen">Generate</button>   <!-- spends 1 credit -->
<div    data-paykit-plan="pro">Pro-only content</div>      <!-- hidden unless Pro -->`} />
            <H3>Imperative API — window.PayKit</H3>
            <Code lang="js" code={`PayKit.meter("image_gen")   // Promise<{ ok, remaining, blocked? }>, repaints meter
PayKit.buy()                // start Stripe Checkout for a credit pack
PayKit.refresh()            // re-fetch the account
PayKit.account()            // the cached account object
PayKit.user                 // the resolved user id`} />
          </Section>

          {/* REST API */}
          <Section>
            <H2 id="rest-api" eyebrow="Reference">REST API</H2>
            <P>
              Base URL <Mono>https://paykit-two.vercel.app/api/v1</Mono>. Auth via the <Mono>x-paykit-key</Mono> header,
              a <Mono>key</Mono> body field, or <Mono>?key=</Mono>.
            </P>

            <Endpoint method="GET" path="/access">
              <P>Read an account. Safe with the publishable key.</P>
              <Code lang="bash" code={`curl "…/access?userId=user_123&key=pk_live_…"
# → { "userId": "user_123", "plan": "free", "credits": 4, "entitlements": [] }`} />
            </Endpoint>

            <Endpoint method="POST" path="/meter">
              <P>Deduct credits for one billable action. Call from your server.</P>
              <Code lang="json" code={`// body: { "userId": "user_123", "event": "image_gen", "cost": 1 }
// → 200  { "ok": true, "remaining": 3 }
// → 402  { "ok": false, "blocked": true, "remaining": 0 }   (out of credits)`} />
              <P>Errors: missing fields <Mono>400</Mono> · invalid key <Mono>401</Mono> · project requires secret key <Mono>403</Mono>.</P>
            </Endpoint>

            <Endpoint method="POST" path="/credits">
              <P>Grant credits and/or change plan — server-side, authoritative. Requires the secret key for real projects.</P>
              <Code lang="json" code={`// body: { "userId": "user_123", "amount": 100, "plan": "pro" }
// → { "userId": "user_123", "plan": "pro", "credits": 103, "entitlements": ["pro"] }`} />
            </Endpoint>

            <Endpoint method="POST" path="/checkout">
              <P>Create a Stripe Checkout Session (inline prices — no dashboard setup). Redirect the user to the returned <Mono>url</Mono>.</P>
              <Code lang="json" code={`// body: { "userId": "user_123", "kind": "pro", "key": "pk_live_…" }
// → { "url": "https://checkout.stripe.com/c/pay/cs_test_…" }
// no STRIPE_SECRET_KEY → 501`} />
            </Endpoint>

            <Endpoint method="POST" path="/webhook">
              <P>Stripe&apos;s endpoint — you don&apos;t call this. Point a Stripe webhook at it and set <Mono>STRIPE_WEBHOOK_SECRET</Mono>. It verifies the signature, then grants credits / sets the plan on <Mono>checkout.session.completed</Mono> and reverts to free on <Mono>customer.subscription.deleted</Mono>.</P>
            </Endpoint>

            <Endpoint method="GET" path="/analytics  ·  /accounts">
              <P>Dashboard data, scoped by key. <Mono>/analytics</Mono> returns usage series + top events + <Mono>stats {`{ total, pro, mrr, creditsOutstanding }`}</Mono> (MRR = pro × {`$${PRO_PRICE_USD}`}). <Mono>/accounts</Mono> returns the account list + stats.</P>
            </Endpoint>

            <Endpoint method="GET · POST · PATCH" path="/projects">
              <P>Manage tenants (Clerk-authed for create/list). <Mono>POST {`{ name? }`}</Mono> creates a project and returns its keys; <Mono>PATCH {`{ secureMetering, key: sk_… }`}</Mono> toggles secure metering.</P>
            </Endpoint>
          </Section>

          {/* Self-hosting */}
          <Section>
            <H2 id="self-hosting" eyebrow="Operate">Self-hosting</H2>
            <P>PayKit runs with zero config (in-memory store + simulate buttons). Add env vars to go real:</P>
            <Table
              head={["Variable", "Required for", "Notes"]}
              rows={[
                [<Mono key="a">DATABASE_URL</Mono>, "persistence", "postgres://… (e.g. Neon). Tables auto-create & migrate. Without it → in-memory."],
                [<Mono key="b">STRIPE_SECRET_KEY</Mono>, "checkout + webhook", "sk_test_… / sk_live_…"],
                [<Mono key="c">STRIPE_WEBHOOK_SECRET</Mono>, "webhook", "from stripe listen or your dashboard endpoint."],
                [<Mono key="d">NEXT_PUBLIC_BASE_URL</Mono>, "redirect URLs", "your public origin. Falls back to the request origin."],
                [<Mono key="e">CLERK_*</Mono>, "multi-tenant auth", "optional — without it, ownership falls back to a shared demo owner."],
              ]}
            />
            <Code lang="bash" code={`cp .env.example .env.local
npm install
npm run dev      # http://localhost:3000`} />
            <P><strong style={css("color:#cfcfd6;")}>Stack:</strong> Next.js 15 (App Router) · React 19 · Postgres (atomic deduct) · Stripe 17 · Clerk (optional).</P>
          </Section>

          {/* Security */}
          <Section>
            <H2 id="security" eyebrow="Operate">Security</H2>
            <Table
              head={["Rule", "Why"]}
              rows={[
                ["Secret key server-side only", "pk_live_ is browser-safe; sk_live_ never ships to the client."],
                ["Enforce access on the server", "<Paywall> / hasAccess() are UX gates, not security."],
                ["Turn on secure metering", "So only your backend can spend credits."],
                ["Verify webhooks", "Keep STRIPE_WEBHOOK_SECRET set; the endpoint checks the Stripe signature."],
                ["Don't ship the demo project", "pk_live_demo / sk_live_demo is a shared open sandbox."],
              ]}
            />
          </Section>

          {/* FAQ */}
          <Section>
            <H2 id="faq" eyebrow="Operate">FAQ</H2>
            {[
              ["Does PayKit generate images / run my model?", "No. It meters and bills. image_gen is just an example event name — call your events whatever you like."],
              ["What's a credit worth?", "Whatever you decide. One meter() call deducts cost credits (default 1); price your packs to match your model costs."],
              ["How many free credits?", "New accounts start with 5."],
              ["Do I need Stripe to try it?", "No — the in-memory store + buyCredits/upgrade stand-ins let you build the whole flow before adding a single key."],
            ].map(([q, a]) => (
              <div key={q} style={css("padding:16px 0;border-bottom:1px solid #161619;")}>
                <div style={css("font-size:15px;font-weight:600;color:#fafafa;margin-bottom:6px;")}>{q}</div>
                <div style={css("font-size:14.5px;line-height:1.6;color:#9a9aa2;")}>{a}</div>
              </div>
            ))}
            <div style={css("margin-top:48px;padding:26px;border-radius:16px;border:1px solid color-mix(in srgb,var(--ac) 30%,#1f1f23);background:linear-gradient(180deg,color-mix(in srgb,var(--ac) 7%,#0c0c0e),#0a0a0c);text-align:center;")}>
              <div style={css("font-size:19px;font-weight:600;color:#fafafa;letter-spacing:-0.02em;margin-bottom:8px;")}>Ready to charge for your AI app?</div>
              <p style={css("font-size:14.5px;color:#9a9aa2;margin:0 0 18px;")}>Start with the demo project — no keys, no setup.</p>
              <a href="#quickstart" onClick={(e) => { e.preventDefault(); document.getElementById("quickstart")?.scrollIntoView({ behavior: "smooth" }) }} className="pk-primary" style={css("display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:10px;background:var(--ac);color:#06120c;font-size:14.5px;font-weight:600;text-decoration:none;cursor:pointer;box-shadow:0 10px 28px color-mix(in srgb,var(--ac) 26%,transparent);")}>Back to Quickstart</a>
            </div>
          </Section>
        </main>

        {/* right TOC */}
        <aside className="docs-toc">
          <div style={css("font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#5b5b63;margin-bottom:12px;")}>On this page</div>
          {FLAT.map((it) => (
            <a
              key={it.id}
              href={`#${it.id}`}
              className={"docs-toclink" + (active === it.id ? " active" : "")}
              onClick={(e) => { e.preventDefault(); document.getElementById(it.id)?.scrollIntoView({ behavior: "smooth" }) }}
            >
              {it.label}
            </a>
          ))}
        </aside>
      </div>
    </div>
  )
}
