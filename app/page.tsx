"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PayKitProvider, usePayKit } from "@/lib/paykit-react"
import type { Account, Analytics } from "@/lib/types"

/* ------------------------------------------------------------------ *
 * PayKit showcase — faithful implementation of design/PayKit.dc.html
 * Four screens (Landing / Dashboard / Quickstart / Widget) with a
 * preview chrome: tab nav + emerald|indigo accent toggle.
 * ------------------------------------------------------------------ */

// Parse a CSS declaration string into a React style object so the
// design's inline styles can be carried over verbatim.
function css(s: string): React.CSSProperties {
  const o: Record<string, string> = {}
  for (const decl of s.split(";")) {
    const i = decl.indexOf(":")
    if (i < 0) continue
    const prop = decl.slice(0, i).trim()
    if (!prop) continue
    const val = decl.slice(i + 1).trim()
    const camel = prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    o[camel] = val
  }
  return o as React.CSSProperties
}

function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none">
      <rect width="26" height="26" rx="7" fill="var(--ac)" />
      {/* P — filled with evenodd counter */}
      <path
        fillRule="evenodd"
        fill="rgba(255,255,255,0.93)"
        d="M4.5 5H7.5C13.5 5 13.5 12.5 7.5 12.5V21H4.5ZM7.5 8C11 8 11 11 7.5 11Z"
      />
      {/* K — stem + two diagonal arms */}
      <line x1="14.5" y1="5" x2="14.5" y2="21" stroke="rgba(255,255,255,0.93)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="15.5" y1="12.5" x2="21.5" y2="5" stroke="rgba(255,255,255,0.93)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="15.5" y1="12.5" x2="21.5" y2="21" stroke="rgba(255,255,255,0.93)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

type Screen = "landing" | "dashboard" | "quickstart" | "widget"
type DashView = "overview" | "plans" | "usage" | "customers" | "keys" | "settings"

const HERO_CODE = `import { PayKitProvider, Paywall, usePayKit } from "@paykit/react"

export default function App({ user }) {
  return (
    <PayKitProvider userId={user.id}>
      <ImageStudio />
      <Paywall plan="pro" fallback={<UpgradeCard />}>
        <HDUpscale />
      </Paywall>
    </PayKitProvider>
  )
}`

const HERO_CODE_HTML = `<span style="color:#c084fc">import</span> { PayKitProvider, Paywall, usePayKit } <span style="color:#c084fc">from</span> <span style="color:#fbbf24">"@paykit/react"</span>

<span style="color:#c084fc">export default function</span> <span style="color:#7dd3fc">App</span>({ user }) {
  <span style="color:#c084fc">return</span> (
    <span style="color:#6b7280">&lt;</span><span style="color:#7dd3fc">PayKitProvider</span> <span style="color:#cfcfd6">userId</span>={user.id}<span style="color:#6b7280">&gt;</span>
      <span style="color:#6b7280">&lt;</span><span style="color:#7dd3fc">ImageStudio</span> <span style="color:#6b7280">/&gt;</span>
      <span style="color:#6b7280">&lt;</span><span style="color:#7dd3fc">Paywall</span> plan=<span style="color:#fbbf24">"pro"</span> fallback={<span style="color:#6b7280">&lt;</span><span style="color:#7dd3fc">UpgradeCard</span> <span style="color:#6b7280">/&gt;</span>}<span style="color:#6b7280">&gt;</span>
        <span style="color:#6b7280">&lt;</span><span style="color:#7dd3fc">HDUpscale</span> <span style="color:#6b7280">/&gt;</span>   <span style="color:#565a66">// gated — Pro only</span>
      <span style="color:#6b7280">&lt;/</span><span style="color:#7dd3fc">Paywall</span><span style="color:#6b7280">&gt;</span>
    <span style="color:#6b7280">&lt;/</span><span style="color:#7dd3fc">PayKitProvider</span><span style="color:#6b7280">&gt;</span>
  )
}
<span style="color:#c084fc">function</span> <span style="color:#7dd3fc">ImageStudio</span>() {
  <span style="color:#c084fc">const</span> { meter, credits } = <span style="color:#7dd3fc">usePayKit</span>()
  <span style="color:#c084fc">async function</span> <span style="color:#7dd3fc">generate</span>() {
    <span style="color:#c084fc">const</span> { blocked } = <span style="color:#c084fc">await</span> <span style="color:#7dd3fc">meter</span>(<span style="color:#fbbf24">"image_gen"</span>)  <span style="color:#565a66">// −1 credit</span>
    <span style="color:#c084fc">if</span> (blocked) <span style="color:#c084fc">return</span> <span style="color:#7dd3fc">openBuyCredits</span>()
    <span style="color:#7dd3fc">runModel</span>()
  }
}`

const STATUS: Record<string, [string, string, string]> = {
  active: ["#6ee7b7", "rgba(52,211,153,.12)", "Active"],
  trialing: ["#93c5fd", "rgba(96,165,250,.12)", "Trialing"],
  past_due: ["#fcd34d", "rgba(251,191,36,.13)", "Past due"],
  canceled: ["#a1a1aa", "rgba(161,161,170,.12)", "Canceled"],
}

const DASH_TITLE: Record<DashView, string> = {
  overview: "Overview",
  plans: "Plans & credit packs",
  usage: "Usage",
  customers: "Customers",
  keys: "API keys",
  settings: "Settings",
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing")
  const [accent, setAccent] = useState<"emerald" | "indigo">("emerald")
  const [waitEmail, setWaitEmail] = useState("")
  const [waitJoined, setWaitJoined] = useState(false)
  const [dashView, setDashView] = useState<DashView>("overview")
  const [revealSecret, setRevealSecret] = useState(false)
  const [copied, setCopied] = useState("")
  const [qsDone, setQsDone] = useState({ install: false, key: false, meter: false })
  const [qsRan, setQsRan] = useState(false)

  useEffect(() => {
    document.documentElement.style.setProperty("--ac", accent === "indigo" ? "#6366f1" : "#34d399")
  }, [accent])

  function go(s: Screen) {
    setScreen(s)
    if (typeof window !== "undefined") window.scrollTo(0, 0)
  }

  function copy(id: string, text: string) {
    try {
      navigator.clipboard?.writeText(text)
    } catch {
      /* clipboard unavailable */
    }
    setCopied(id)
    setTimeout(() => setCopied((c) => (c === id ? "" : c)), 1500)
  }

  function qsCopy(step: "install" | "key" | "meter", text: string) {
    copy("qs_" + step, text)
    setQsDone((d) => ({ ...d, [step]: true }))
  }
  function qsRun() {
    setQsRan(true)
    setQsDone({ install: true, key: true, meter: true })
  }
  function qsReset() {
    setQsRan(false)
    setQsDone({ install: false, key: false, meter: false })
  }

  function joinWaitlist() {
    if (waitEmail.trim()) setWaitJoined(true)
  }

  // ---- derived ----
  const baseTab = "padding:6px 13px;border-radius:7px;font-size:13px;font-weight:500;color:#8b8b94;background:transparent;border:1px solid transparent;cursor:pointer;letter-spacing:-0.01em;font-family:inherit;"
  const onTab = "padding:6px 13px;border-radius:7px;font-size:13px;font-weight:600;color:#fafafa;background:#1c1c1f;border:1px solid #2a2a2e;cursor:pointer;letter-spacing:-0.01em;font-family:inherit;"
  const tab = (k: Screen) => css(screen === k ? onTab : baseTab)

  const baseNav = "display:flex;align-items:center;gap:11px;padding:8px 11px;border-radius:8px;font-size:13.5px;font-weight:450;color:#9a9aa2;background:transparent;border:none;width:100%;cursor:pointer;text-align:left;font-family:inherit;letter-spacing:-0.005em;"
  const onNav = "display:flex;align-items:center;gap:11px;padding:8px 11px;border-radius:8px;font-size:13.5px;font-weight:550;color:#fafafa;background:#19191c;border:none;width:100%;cursor:pointer;text-align:left;font-family:inherit;letter-spacing:-0.005em;"
  const nav = (k: DashView) => css(dashView === k ? onNav : baseNav)

  const qsProgress = (qsDone.install ? 1 : 0) + (qsDone.key ? 1 : 0) + (qsDone.meter ? 1 : 0)
  const qsComplete = qsRan || (qsDone.install && qsDone.key && qsDone.meter)
  const secretShown = revealSecret ? "sk_live_a3f9C2k8Lp0Qe7Rt5Yu1Wx4Zb6Nm9Vc" : "sk_live_••••••••••••••••••••••••••"

  const featureCardCode ="display:inline-block;font-family:'Geist Mono',monospace;font-size:12px;color:#cfcfd6;background:#131316;border:1px solid #232327;border-radius:7px;padding:5px 9px;"

  return (
    <div style={css("min-height:100vh;background:#0a0a0a;color:#e4e4e7;font-family:'Geist',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;")}>
      {/* ===== PREVIEW CHROME ===== */}
      <div style={css("position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:14px;height:56px;padding:0 18px;background:rgba(10,10,10,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid #1a1a1d;")}>
        <div style={css("display:flex;align-items:center;gap:9px;")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="PayKit" style={{height:28,width:"auto",display:"block"} as React.CSSProperties} />
          <span style={css("font-size:9.5px;font-weight:600;color:#7c7c85;border:1px solid #2a2a2e;border-radius:5px;padding:1.5px 5px;letter-spacing:0.05em;")}>PREVIEW</span>
        </div>
        <div style={css("display:flex;align-items:center;gap:3px;margin-left:6px;padding:3px;background:#121214;border:1px solid #1f1f22;border-radius:10px;")}>
          <button className="pk-tab" onClick={() => go("landing")} style={tab("landing")}>Landing</button>
          <button className="pk-tab" onClick={() => go("dashboard")} style={tab("dashboard")}>Dashboard</button>
          <button className="pk-tab" onClick={() => go("quickstart")} style={tab("quickstart")}>Quickstart</button>
          <button className="pk-tab" onClick={() => go("widget")} style={tab("widget")}>Widget</button>
        </div>
        <div style={{ flex: 1 }} />
        <div style={css("display:flex;align-items:center;gap:14px;")}>
          <Link href="/demo" className="pk-link" style={css("font-size:12px;color:#7c7c85;font-weight:500;text-decoration:none;")}>Live demo →</Link>
          <button
            onClick={() => setAccent(accent === "emerald" ? "indigo" : "emerald")}
            title={`Switch theme (${accent === "emerald" ? "indigo" : "emerald"})`}
            style={css("width:20px;height:20px;border-radius:50%;background:var(--ac);border:2px solid rgba(255,255,255,.18);cursor:pointer;padding:0;display:block;flex-shrink:0;")}
          />
        </div>
      </div>

      <main>
        {screen === "landing" && (
          <Landing
            go={go}
            copied={copied}
            copy={copy}
            waitEmail={waitEmail}
            setWaitEmail={setWaitEmail}
            waitJoined={waitJoined}
            joinWaitlist={joinWaitlist}
            featureCardCode={featureCardCode}
          />
        )}

        {screen === "dashboard" && (
          <Dashboard
            dashView={dashView}
            setDashView={setDashView}
            nav={nav}
            revealSecret={revealSecret}
            setRevealSecret={setRevealSecret}
            secretShown={secretShown}
            copied={copied}
            copy={copy}
          />
        )}

        {screen === "quickstart" && (
          <Quickstart
            go={go}
            qsDone={qsDone}
            qsProgress={qsProgress}
            qsComplete={qsComplete}
            qsCopy={qsCopy}
            qsRun={qsRun}
            qsReset={qsReset}
            copied={copied}
          />
        )}

        {screen === "widget" && <WidgetLive />}
      </main>
    </div>
  )
}

/* ===================== LANDING ===================== */
function Landing({
  go,
  copied,
  copy,
  waitEmail,
  setWaitEmail,
  waitJoined,
  joinWaitlist,
  featureCardCode,
}: {
  go: (s: Screen) => void
  copied: string
  copy: (id: string, text: string) => void
  waitEmail: string
  setWaitEmail: (v: string) => void
  waitJoined: boolean
  joinWaitlist: () => void
  featureCardCode: string
}) {
  const check = (stroke: string, w = 15) => (
    <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={css("margin-top:2px;flex:none;")}><path d="M20 6 9 17l-5-5" /></svg>
  )
  const features = [
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 12 16.2 9.2" /><path d="M12 3v2" /></svg>,
      title: "Credits & usage billing",
      body: "Meter every AI call with one function. Sell credit packs and bill for exactly what users consume.",
      code: `<span style="color:#7dd3fc">meter</span>(<span style="color:#fbbf24">"image_gen"</span>)`,
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
      title: "Subscriptions & paywall",
      body: "Wrap any Pro feature in a component. Plans and entitlements gate access automatically.",
      code: `<span style="color:#6b7280">&lt;</span><span style="color:#7dd3fc">Paywall</span> plan=<span style="color:#fbbf24">"pro"</span><span style="color:#6b7280">&gt;</span>`,
    },
    {
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" /><path d="m4 7.5 8 4.5 8-4.5" /><path d="M12 12v9" /></svg>,
      title: "Drop-in, no backend",
      body: "One provider on the client, our API runs the ledger. No tables, no webhooks, no infra to babysit.",
      code: `<span style="color:#6b7280">&lt;</span><span style="color:#7dd3fc">PayKitProvider</span> <span style="color:#6b7280">/&gt;</span>`,
    },
  ]

  return (
    <div style={css("position:relative;overflow:hidden;")}>
      <div aria-hidden="true" style={css("position:absolute;inset:0;pointer-events:none;background:radial-gradient(58% 46% at 50% -8%, color-mix(in srgb, var(--ac) 15%, transparent), transparent 72%);")} />
      <div aria-hidden="true" style={css("position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(#ffffff07 1px,transparent 1px),linear-gradient(90deg,#ffffff07 1px,transparent 1px);background-size:58px 58px;mask-image:radial-gradient(72% 50% at 50% 0%,#000,transparent 78%);-webkit-mask-image:radial-gradient(72% 50% at 50% 0%,#000,transparent 78%);")} />

      {/* HERO */}
      <section style={css("position:relative;z-index:1;max-width:1200px;margin:0 auto;padding:clamp(54px,8vw,116px) 24px clamp(40px,5vw,68px);")}>
        <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(440px,100%),1fr));gap:clamp(34px,5vw,66px);align-items:center;")}>
          <div>
            <div style={css("display:inline-flex;align-items:center;gap:8px;padding:5px 13px 5px 9px;border:1px solid #232326;border-radius:999px;background:#101012;margin-bottom:26px;")}>
              <span style={css("width:7px;height:7px;border-radius:50%;background:var(--ac);box-shadow:0 0 10px var(--ac);")} />
              <span style={css("font-size:12.5px;color:#b4b4bc;font-weight:500;letter-spacing:-0.01em;")}>Billing for AI apps — without the backend</span>
            </div>
            <h1 style={css("font-size:clamp(38px,5.3vw,62px);line-height:1.03;font-weight:600;letter-spacing:-0.038em;color:#fafafa;margin:0 0 22px;text-wrap:balance;")}>
              Get paid for your AI app<br />— in <span style={{ color: "var(--ac)" }}>10 minutes</span>.
            </h1>
            <p style={css("font-size:clamp(16px,1.5vw,18.5px);line-height:1.62;color:#9a9aa2;max-width:520px;margin:0 0 32px;letter-spacing:-0.011em;")}>
              Add credits, usage-based billing, and subscriptions to any AI app. Drop-in React components and a metering API — charge per call and gate Pro features without building billing infrastructure.
            </p>
            <div style={css("display:flex;flex-wrap:wrap;gap:12px;margin-bottom:24px;")}>
              <button className="pk-hero-cta" onClick={() => go("quickstart")} style={css("display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:10px;background:var(--ac);color:#06120c;font-size:15px;font-weight:600;border:none;cursor:pointer;letter-spacing:-0.01em;font-family:inherit;box-shadow:0 0 0 1px color-mix(in srgb,var(--ac) 55%,transparent),0 10px 34px color-mix(in srgb,var(--ac) 26%,transparent);transition:transform .13s ease,box-shadow .13s ease;")}>
                Start in 10 minutes
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
              </button>
              <button className="pk-ghost" onClick={() => go("dashboard")} style={css("display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:10px;background:#131315;color:#e4e4e7;font-size:15px;font-weight:550;border:1px solid #2a2a2e;cursor:pointer;letter-spacing:-0.01em;font-family:inherit;")}>See the dashboard</button>
            </div>
            <div style={css("display:flex;align-items:center;gap:9px;font-size:13px;color:#6f6f77;letter-spacing:-0.005em;")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              No credit card · Works with Next.js, Lovable, Bolt, v0 &amp; Cursor
            </div>
          </div>

          <div style={css("position:relative;")}>
            <div aria-hidden="true" style={css("position:absolute;inset:8% 10%;border-radius:24px;background:radial-gradient(60% 60% at 60% 30%, color-mix(in srgb,var(--ac) 30%,transparent), transparent 70%);filter:blur(46px);")} />
            <div style={css("position:relative;border:1px solid #232327;border-radius:14px;background:#0c0c0e;overflow:hidden;box-shadow:0 28px 64px -22px rgba(0,0,0,.85);")}>
              <div style={css("display:flex;align-items:center;gap:7px;padding:11px 14px;border-bottom:1px solid #1c1c20;background:#0e0e10;")}>
                <span style={css("width:11px;height:11px;border-radius:50%;background:#2b2b30;")} />
                <span style={css("width:11px;height:11px;border-radius:50%;background:#2b2b30;")} />
                <span style={css("width:11px;height:11px;border-radius:50%;background:#2b2b30;")} />
                <span style={css("margin-left:7px;font-family:'Geist Mono',monospace;font-size:12px;color:#6b6b73;")}>app/page.tsx</span>
                <div style={{ flex: 1 }} />
                <button className="pk-copybtn" onClick={() => copy("hero", HERO_CODE)} style={css("display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:7px;background:#161619;border:1px solid #26262b;color:#9a9aa2;font-size:11.5px;font-weight:500;cursor:pointer;font-family:inherit;")}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                  {copied === "hero" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre style={css("margin:0;padding:18px 18px 20px;overflow-x:auto;font-family:'Geist Mono','SF Mono',monospace;font-size:12px;line-height:1.65;color:#cfcfd6;")} dangerouslySetInnerHTML={{ __html: HERO_CODE_HTML }} />
            </div>
          </div>
        </div>
      </section>

      {/* 3-PAIN BLOCK */}
      <section style={css("position:relative;z-index:1;max-width:1200px;margin:0 auto;padding:clamp(28px,4vw,52px) 24px;")}>
        <div style={css("border-top:1px solid #1a1a1d;border-bottom:1px solid #1a1a1d;padding:clamp(34px,4vw,52px) 0;")}>
          <div style={css("font-size:12px;font-weight:600;color:var(--ac);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;")}>The problem</div>
          <h2 style={css("font-size:clamp(24px,3vw,34px);font-weight:600;letter-spacing:-0.03em;color:#ededed;margin:0 0 38px;max-width:680px;line-height:1.12;text-wrap:balance;")}>Billing is a tax on shipping your AI app.</h2>
          <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:28px;")}>
            {[
              "Weeks wiring Stripe, webhooks, customer portals, and a database just to take payment.",
              "Every model call costs you money — but metering usage per user is fiddly and easy to get wrong.",
              "Hard-coded paywalls leak revenue, frustrate users, and break the moment plans change.",
            ].map((t, i) => (
              <div key={i}>
                <div style={css("font-family:'Geist Mono',monospace;font-size:13px;color:#3f3f46;margin-bottom:10px;")}>{`0${i + 1}`}</div>
                <p style={css("margin:0;font-size:15px;line-height:1.55;color:#a5a5ad;letter-spacing:-0.01em;")}>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={css("position:relative;z-index:1;max-width:1200px;margin:0 auto;padding:clamp(20px,3vw,40px) 24px clamp(36px,5vw,64px);")}>
        <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:18px;")}>
          {features.map((f) => (
            <div key={f.title} className="pk-feature" style={css("border:1px solid #1f1f23;border-radius:14px;background:#0c0c0e;padding:26px 24px;")}>
              <div style={css("width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--ac) 13%,transparent);border:1px solid color-mix(in srgb,var(--ac) 26%,transparent);margin-bottom:18px;")}>{f.icon}</div>
              <h3 style={css("font-size:16.5px;font-weight:600;color:#fafafa;margin:0 0 9px;letter-spacing:-0.02em;")}>{f.title}</h3>
              <p style={css("font-size:14px;line-height:1.55;color:#8f8f97;margin:0 0 16px;letter-spacing:-0.005em;")}>{f.body}</p>
              <code style={css(featureCardCode)} dangerouslySetInnerHTML={{ __html: f.code }} />
            </div>
          ))}
        </div>
      </section>

      {/* PRICING TEASER */}
      <section style={css("position:relative;z-index:1;max-width:1200px;margin:0 auto;padding:clamp(20px,3vw,40px) 24px clamp(36px,5vw,64px);")}>
        <div style={css("text-align:center;margin-bottom:34px;")}>
          <div style={css("font-size:12px;font-weight:600;color:var(--ac);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;")}>Pricing</div>
          <h2 style={css("font-size:clamp(24px,3vw,34px);font-weight:600;letter-spacing:-0.03em;color:#ededed;margin:0;line-height:1.12;")}>Free to start. One price to scale.</h2>
        </div>
        <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:18px;max-width:720px;margin:0 auto;")}>
          {/* Free */}
          <div style={css("border:1px solid #1f1f23;border-radius:14px;background:#0c0c0e;padding:28px 26px;")}>
            <div style={css("font-size:14px;font-weight:600;color:#cfcfd6;letter-spacing:-0.01em;")}>Free</div>
            <div style={css("display:flex;align-items:baseline;gap:4px;margin:14px 0 4px;")}><span style={css("font-size:40px;font-weight:600;color:#fafafa;letter-spacing:-0.04em;")}>$0</span></div>
            <div style={css("font-size:13px;color:#6f6f77;margin-bottom:22px;")}>For prototyping &amp; your first users.</div>
            <button className="pk-ghost" onClick={() => go("quickstart")} style={css("width:100%;padding:10px;border-radius:9px;background:#131315;color:#e4e4e7;font-size:14px;font-weight:550;border:1px solid #2a2a2e;cursor:pointer;font-family:inherit;")}>Start free</button>
            <div style={css("display:flex;flex-direction:column;gap:11px;margin-top:24px;")}>
              {["Up to 100 metered calls / mo", "Credits, paywall & React SDK", "Test-mode keys"].map((t) => (
                <div key={t} style={css("display:flex;gap:9px;align-items:flex-start;font-size:13.5px;color:#a5a5ad;")}>{check("#52525b")}{t}</div>
              ))}
            </div>
          </div>
          {/* Launch */}
          <div style={css("position:relative;border:1px solid color-mix(in srgb,var(--ac) 40%,#1f1f23);border-radius:14px;background:linear-gradient(180deg,color-mix(in srgb,var(--ac) 7%,#0c0c0e),#0c0c0e);padding:28px 26px;box-shadow:0 0 0 1px color-mix(in srgb,var(--ac) 18%,transparent),0 18px 50px -24px color-mix(in srgb,var(--ac) 50%,transparent);")}>
            <div style={css("position:absolute;top:18px;right:18px;font-size:10.5px;font-weight:600;color:var(--ac);background:color-mix(in srgb,var(--ac) 13%,transparent);border:1px solid color-mix(in srgb,var(--ac) 30%,transparent);border-radius:999px;padding:3px 9px;letter-spacing:0.03em;")}>POPULAR</div>
            <div style={css("font-size:14px;font-weight:600;color:var(--ac);letter-spacing:-0.01em;")}>Launch</div>
            <div style={css("display:flex;align-items:baseline;gap:5px;margin:14px 0 4px;")}><span style={css("font-size:40px;font-weight:600;color:#fafafa;letter-spacing:-0.04em;")}>$19</span><span style={css("font-size:14px;color:#8f8f97;")}>/mo</span></div>
            <div style={css("font-size:13px;color:#6f6f77;margin-bottom:22px;")}>Everything you need to charge for real.</div>
            <button className="pk-primary" onClick={() => go("quickstart")} style={css("width:100%;padding:10px;border-radius:9px;background:var(--ac);color:#06120c;font-size:14px;font-weight:600;border:none;cursor:pointer;font-family:inherit;box-shadow:0 8px 24px color-mix(in srgb,var(--ac) 28%,transparent);")}>Get started</button>
            <div style={css("display:flex;flex-direction:column;gap:11px;margin-top:24px;")}>
              {["Unlimited metered calls", "Credit packs & subscriptions", "Live Stripe payouts & webhooks", "Usage analytics & cost guardrails"].map((t) => (
                <div key={t} style={css("display:flex;gap:9px;align-items:flex-start;font-size:13.5px;color:#cfcfd6;")}>{check("var(--ac)")}{t}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WAITLIST CTA */}
      <section style={css("position:relative;z-index:1;max-width:1200px;margin:0 auto;padding:clamp(20px,3vw,40px) 24px clamp(48px,6vw,80px);")}>
        <div style={css("position:relative;overflow:hidden;border:1px solid #1f1f23;border-radius:18px;background:#0b0b0d;padding:clamp(36px,5vw,56px) clamp(24px,4vw,48px);text-align:center;")}>
          <div aria-hidden="true" style={css("position:absolute;inset:0;background:radial-gradient(50% 120% at 50% 0%,color-mix(in srgb,var(--ac) 12%,transparent),transparent 70%);")} />
          <div style={css("position:relative;")}>
            <h2 style={css("font-size:clamp(26px,3.4vw,38px);font-weight:600;letter-spacing:-0.032em;color:#fafafa;margin:0 0 12px;line-height:1.1;text-wrap:balance;")}>Start charging for your AI app.</h2>
            <p style={css("font-size:15.5px;color:#9a9aa2;margin:0 auto 28px;max-width:440px;line-height:1.55;")}>Join the waitlist — we&apos;ll email you when your workspace is ready.</p>
            {waitJoined ? (
              <div style={css("display:inline-flex;align-items:center;gap:10px;padding:13px 22px;border-radius:11px;background:color-mix(in srgb,var(--ac) 12%,transparent);border:1px solid color-mix(in srgb,var(--ac) 32%,transparent);color:var(--ac);font-size:15px;font-weight:550;")}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                You&apos;re on the list — check your inbox.
              </div>
            ) : (
              <div style={css("display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:480px;margin:0 auto;")}>
                <input className="pk-input" value={waitEmail} onChange={(e) => setWaitEmail(e.target.value)} placeholder="you@yourstartup.com" style={css("flex:1;min-width:220px;padding:12px 15px;border-radius:10px;background:#0e0e10;border:1px solid #2a2a2e;color:#fafafa;font-size:14.5px;font-family:inherit;outline:none;")} />
                <button className="pk-primary" onClick={joinWaitlist} style={css("padding:12px 22px;border-radius:10px;background:var(--ac);color:#06120c;font-size:14.5px;font-weight:600;border:none;cursor:pointer;font-family:inherit;white-space:nowrap;box-shadow:0 8px 24px color-mix(in srgb,var(--ac) 26%,transparent);")}>Join the waitlist</button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={css("position:relative;z-index:1;border-top:1px solid #1a1a1d;")}>
        <div style={css("max-width:1200px;margin:0 auto;padding:26px 24px;display:flex;flex-wrap:wrap;align-items:center;gap:16px;justify-content:space-between;")}>
          <div style={css("display:flex;align-items:center;gap:9px;")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="PayKit" style={{height:22,width:"auto",display:"block"} as React.CSSProperties} />
            <span style={css("font-size:12.5px;color:#5b5b63;")}>© 2026</span>
          </div>
          <div style={css("display:flex;flex-wrap:wrap;gap:22px;font-size:13px;color:#7c7c85;")}>
            {["Docs", "Pricing", "Changelog", "GitHub", "Privacy"].map((l) => (
              <span key={l} className="pk-link">{l}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ===================== DASHBOARD ===================== */
function Dashboard({
  dashView,
  setDashView,
  nav,
  revealSecret,
  setRevealSecret,
  secretShown,
  copied,
  copy,
}: {
  dashView: DashView
  setDashView: (v: DashView) => void
  nav: (k: DashView) => React.CSSProperties
  revealSecret: boolean
  setRevealSecret: (f: (b: boolean) => boolean) => void
  secretShown: string
  copied: string
  copy: (id: string, text: string) => void
}) {
  // The merchant's project (persisted locally). Without one, data scopes to the demo project.
  type Proj = { id: string; name: string; publishableKey: string; secretKey: string; secureMetering?: boolean }
  const [project, setProject] = useState<Proj | null>(() => {
    try {
      const s = typeof localStorage !== "undefined" ? localStorage.getItem("paykit_project") : null
      return s ? JSON.parse(s) : null
    } catch {
      return null
    }
  })
  const [creating, setCreating] = useState(false)
  function saveProject(p: Proj | null) {
    if (p) localStorage.setItem("paykit_project", JSON.stringify(p))
    setProject(p)
  }
  async function createProject() {
    setCreating(true)
    try {
      const r = await fetch("/api/v1/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "My project" }) })
      saveProject(await r.json())
    } catch {
      /* ignore */
    }
    setCreating(false)
  }
  async function toggleSecureMetering() {
    if (!project) return
    const next = !project.secureMetering
    saveProject({ ...project, secureMetering: next }) // optimistic
    try {
      await fetch("/api/v1/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secureMetering: next, key: project.secretKey }) })
    } catch {
      saveProject({ ...project, secureMetering: !next }) // revert on failure
    }
  }
  const pubKey = project?.publishableKey ?? "pk_live_demo"
  const realSecret = project?.secretKey ?? "sk_live_demo"

  // Live data from the real API, scoped to the active project's key.
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [an, setAn] = useState<(Analytics & { stats: { total: number; pro: number; mrr: number; creditsOutstanding: number } }) | null>(null)
  useEffect(() => {
    let alive = true
    const q = "?key=" + encodeURIComponent(pubKey)
    fetch("/api/v1/accounts" + q)
      .then((r) => r.json())
      .then((d) => alive && setAccounts(d.accounts ?? []))
      .catch(() => alive && setAccounts([]))
    fetch("/api/v1/analytics" + q)
      .then((r) => r.json())
      .then((d) => alive && setAn(d))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [pubKey])
  const stats = an?.stats ?? null

  // Build an SVG polyline (viewBox 0 0 720 180) from a series of values.
  const pts = (vals: number[], max: number) =>
    vals
      .map((v, i) => {
        const x = vals.length <= 1 ? 360 : 10 + (i * 700) / (vals.length - 1)
        const y = 170 - (max > 0 ? (v / max) * 150 : 0)
        return `${x.toFixed(0)},${y.toFixed(0)}`
      })
      .join(" ")
  const fmtAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return "just now"
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  const proChip = "color:var(--ac);background:color-mix(in srgb,var(--ac) 12%,transparent);border:1px solid color-mix(in srgb,var(--ac) 26%,transparent);padding:2px 9px;border-radius:6px;font-size:11.5px;font-weight:550;"
  const freeChip = "color:#a1a1aa;background:#161619;border:1px solid #26262a;padding:2px 9px;border-radius:6px;font-size:11.5px;font-weight:550;"
  const customers = (accounts ?? []).map((a) => {
    const isPro = a.plan === "pro"
    const st = STATUS[isPro ? "active" : "trialing"]
    return {
      key: a.userId,
      label: a.userId,
      sub: isPro ? `Pro · ${a.entitlements.join(", ") || "—"}` : "Free plan",
      plan: isPro ? "Pro" : "Free",
      planStyle: css(isPro ? proChip : freeChip),
      credits: String(a.credits),
      statusColor: st[0],
      statusBg: st[1],
      statusLabel: st[2],
      initials: (a.userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2) || "··").toUpperCase(),
    }
  })
  const statCard = "border:1px solid #1f1f23;border-radius:12px;background:#0c0c0e;padding:17px 18px 15px;"
  const statLabel = "font-size:11px;font-weight:600;color:#76767e;letter-spacing:0.06em;text-transform:uppercase;"
  const statNum = "font-size:26px;font-weight:600;color:#fafafa;letter-spacing:-0.03em;font-variant-numeric:tabular-nums;"
  const labelInput ="display:block;font-size:11px;font-weight:600;color:#76767e;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:6px;"
  const fieldInput = "width:100%;padding:8px 11px;border-radius:8px;background:#0e0e10;border:1px solid #2a2a2e;color:#fafafa;font-size:13.5px;font-family:inherit;outline:none;"
  const fieldMono = fieldInput.replace("font-family:inherit", "font-family:'Geist Mono',monospace")
  const copyBtnSm = "display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:8px;background:#131316;border:1px solid #2a2a2e;color:#a5a5ad;font-size:12.5px;font-weight:500;cursor:pointer;font-family:inherit;white-space:nowrap;"

  return (
    <div style={css("display:flex;min-height:calc(100vh - 56px);background:#0a0a0a;")}>
      {/* SIDEBAR */}
      <aside style={css("width:236px;flex:none;border-right:1px solid #18181b;background:#0b0b0d;display:flex;flex-direction:column;padding:14px 12px;")}>
        <button className="pk-ws" style={css("display:flex;align-items:center;gap:9px;padding:8px 9px;border-radius:9px;background:#111114;border:1px solid #1f1f23;cursor:pointer;width:100%;text-align:left;margin-bottom:14px;font-family:inherit;")}>
          <div style={css("width:27px;height:27px;border-radius:7px;flex:none;background:color-mix(in srgb,var(--ac) 16%,transparent);border:1px solid color-mix(in srgb,var(--ac) 30%,transparent);display:flex;align-items:center;justify-content:center;color:var(--ac);font-weight:700;font-size:13px;font-family:'Geist Mono',monospace;")}>V</div>
          <div style={css("flex:1;min-width:0;")}>
            <div style={css("font-size:13px;font-weight:600;color:#fafafa;letter-spacing:-0.01em;")}>Vellum AI</div>
            <div style={css("font-size:11px;color:#6b6b73;")}>Pro workspace</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6b73" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <div style={css("display:flex;flex-direction:column;gap:2px;")}>
          <button className="pk-nav" onClick={() => setDashView("overview")} style={nav("overview")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>Overview</button>
          <button className="pk-nav" onClick={() => setDashView("plans")} style={nav("plans")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></svg>Plans</button>
          <button className="pk-nav" onClick={() => setDashView("usage")} style={nav("usage")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m7 14 3-4 4 3 5-7" /></svg>Usage</button>
          <button className="pk-nav" onClick={() => setDashView("customers")} style={nav("customers")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="3.5" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13A4 4 0 0 1 16 11" /></svg>Customers</button>
          <button className="pk-nav" onClick={() => setDashView("keys")} style={nav("keys")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="4.5" /><path d="m10.7 12.3 8-8" /><path d="m16.5 6.5 2 2" /><path d="m19.5 3.5 2 2" /></svg>API keys</button>
        </div>
        <div style={{ flex: 1 }} />
        <div style={css("display:flex;flex-direction:column;gap:2px;")}>
          <button className="pk-nav" onClick={() => setDashView("settings")} style={nav("settings")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><circle cx="4" cy="12" r="2" /><circle cx="12" cy="6" r="2" /><circle cx="20" cy="14" r="2" /></svg>Settings</button>
        </div>
        <div style={css("display:flex;align-items:center;gap:9px;padding:10px 8px 2px;border-top:1px solid #18181b;margin-top:8px;")}>
          <div style={css("width:28px;height:28px;border-radius:50%;flex:none;background:#1c1c20;border:1px solid #2a2a2e;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#cfcfd6;")}>MC</div>
          <div style={css("flex:1;min-width:0;")}>
            <div style={css("font-size:12.5px;font-weight:550;color:#e4e4e7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>maya@vellum.ai</div>
            <div style={css("font-size:11px;color:#6b6b73;")}>Owner</div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={css("flex:1;min-width:0;display:flex;flex-direction:column;")}>
        <header style={css("display:flex;align-items:center;gap:14px;padding:16px 28px;border-bottom:1px solid #18181b;background:rgba(10,10,10,.6);")}>
          <h1 style={css("font-size:18px;font-weight:600;color:#fafafa;letter-spacing:-0.02em;margin:0;")}>{DASH_TITLE[dashView]}</h1>
          <span style={css("font-size:11px;font-weight:600;color:#fcd34d;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.22);border-radius:999px;padding:3px 9px;letter-spacing:0.02em;")}>Test mode</span>
          <div style={{ flex: 1 }} />
          <div style={css("display:flex;align-items:center;gap:7px;padding:7px 11px;border-radius:9px;background:#0e0e10;border:1px solid #1f1f23;color:#76767e;font-size:13px;min-width:180px;")}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>Search…</div>
          <button className="pk-primary" style={css("display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:9px;background:var(--ac);color:#06120c;font-size:13.5px;font-weight:600;border:none;cursor:pointer;font-family:inherit;")}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>Create</button>
        </header>

        <div style={css("flex:1;padding:24px 28px 40px;")}>
          {/* OVERVIEW */}
          {dashView === "overview" && (
            <>
              <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:14px;margin-bottom:18px;")}>
                {[
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6b73" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 14.2c0 1 1.1 1.7 2.5 1.7s2.5-.6 2.5-1.7-1-1.5-2.5-1.9-2.5-.8-2.5-1.8S10.6 8 12 8s2.5.6 2.5 1.5" /></svg>, label: "MRR", num: `$${(an?.stats.mrr ?? 0).toLocaleString()}`, sub: `${an?.stats.pro ?? 0} Pro × $19/mo` },
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6b73" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="3.5" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></svg>, label: "Active subs", num: `${an?.stats.pro ?? 0}`, sub: `of ${an?.stats.total ?? 0} accounts` },
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6b73" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></svg>, label: "Credits sold", num: (an?.creditsSoldThisMonth ?? 0).toLocaleString(), sub: "this month" },
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6b73" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>, label: "Metered calls", num: (an?.meteredThisMonth ?? 0).toLocaleString(), sub: "this month" },
                ].map((s) => (
                  <div key={s.label} style={css(statCard)}>
                    <div style={css("display:flex;align-items:center;gap:7px;margin-bottom:13px;")}>{s.icon}<span style={css(statLabel)}>{s.label}</span></div>
                    <div style={css(statNum)}>{s.num}</div>
                    <div style={css("margin-top:7px;font-size:12.5px;color:#5b5b63;font-weight:450;")}>{s.sub}</div>
                  </div>
                ))}
              </div>

              <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(340px,100%),1fr));gap:14px;align-items:stretch;")}>
                {(() => {
                  const series = an?.series ?? []
                  const gVals = series.map((s) => s.granted)
                  const mVals = series.map((s) => s.metered)
                  const max = Math.max(1, ...gVals, ...mVals)
                  return (
                    <div style={css("grid-column:span 2;min-width:0;border:1px solid #1f1f23;border-radius:14px;background:#0c0c0e;padding:20px 22px;")}>
                      <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px;")}>
                        <div><div style={css("font-size:14.5px;font-weight:600;color:#fafafa;letter-spacing:-0.01em;")}>Credits — sold vs consumed</div><div style={css("font-size:12px;color:#6b6b73;margin-top:2px;")}>Last 14 days · live</div></div>
                        <div style={css("display:flex;gap:16px;")}>
                          <div style={css("display:flex;align-items:center;gap:6px;font-size:12px;color:#a5a5ad;")}><span style={css("width:9px;height:9px;border-radius:2px;background:var(--ac);")} />Sold</div>
                          <div style={css("display:flex;align-items:center;gap:6px;font-size:12px;color:#a5a5ad;")}><span style={css("width:9px;height:9px;border-radius:2px;background:#3f3f46;")} />Consumed</div>
                        </div>
                      </div>
                      <svg viewBox="0 0 720 200" preserveAspectRatio="none" style={css("width:100%;height:190px;display:block;overflow:visible;")}>
                        {[37.5, 75, 112.5, 150].map((y) => <line key={y} x1="0" y1={y} x2="720" y2={y} stroke="#ffffff0a" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
                        <polyline points={pts(gVals, max)} fill="none" stroke="var(--ac)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                        <polyline points={pts(mVals, max)} fill="none" stroke="#3f3f46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                      </svg>
                      <div style={css("display:flex;justify-content:space-between;margin-top:10px;font-size:10px;color:#5b5b63;font-variant-numeric:tabular-nums;")}>{series.filter((_, i) => i % 2 === 0).map((s, i) => <span key={i}>{s.label}</span>)}</div>
                    </div>
                  )
                })()}

                <div style={css("min-width:0;border:1px solid #1f1f23;border-radius:14px;background:#0c0c0e;padding:20px 22px;")}>
                  <div style={css("font-size:14.5px;font-weight:600;color:#fafafa;letter-spacing:-0.01em;margin-bottom:16px;")}>Recent activity</div>
                  <div style={css("display:flex;flex-direction:column;gap:14px;")}>
                    {an && an.recent.length === 0 && (
                      <div style={css("font-size:12.5px;color:#6b6b73;")}>No activity yet — meter a call or buy credits in the Widget.</div>
                    )}
                    {(an?.recent ?? []).map((e, i) => {
                      const dot = e.kind === "grant" ? "#6ee7b7" : e.kind === "plan" ? "var(--ac)" : "#93c5fd"
                      const main =
                        e.kind === "grant" ? (
                          <>{e.userId} bought {e.amount} credits</>
                        ) : e.kind === "plan" ? (
                          <>{e.userId} → <span style={css("color:var(--ac);font-weight:550;")}>{e.name}</span></>
                        ) : (
                          <>{e.userId} · <span style={css("font-family:'Geist Mono',monospace;")}>{e.name}</span></>
                        )
                      const kindLabel = e.kind === "meter" ? "metered call" : e.kind === "grant" ? "purchase" : "plan change"
                      return (
                        <div key={i} style={css("display:flex;gap:11px;align-items:flex-start;")}>
                          <span style={css(`width:7px;height:7px;border-radius:50%;background:${dot};margin-top:6px;flex:none;`)} />
                          <div style={css("min-width:0;")}>
                            <div style={css("font-size:13px;color:#e4e4e7;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{main}</div>
                            <div style={css("font-size:11.5px;color:#6b6b73;margin-top:2px;")}>{kindLabel} · {fmtAgo(e.at)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PLANS */}
          {dashView === "plans" && (
            <div style={css("max-width:880px;")}>
              <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;")}><div style={css("font-size:13px;font-weight:600;color:#76767e;letter-spacing:0.06em;text-transform:uppercase;")}>Plans</div></div>
              <div style={css("display:flex;flex-direction:column;gap:12px;margin-bottom:34px;")}>
                <div style={css("display:flex;align-items:center;gap:16px;border:1px solid #1f1f23;border-radius:12px;background:#0c0c0e;padding:16px 20px;")}>
                  <div style={css("flex:1;")}><div style={css("font-size:15px;font-weight:600;color:#fafafa;")}>Free</div><div style={css("font-size:12.5px;color:#6b6b73;margin-top:2px;")}>5 credits included · no entitlements</div></div>
                  <div style={css("font-size:15px;font-weight:600;color:#cfcfd6;font-variant-numeric:tabular-nums;")}>$0<span style={css("font-size:12px;color:#6b6b73;font-weight:400;")}>/mo</span></div>
                  <button className="pk-ghost" style={css("padding:6px 12px;border-radius:8px;background:#131316;border:1px solid #2a2a2e;color:#a5a5ad;font-size:12.5px;font-weight:500;cursor:pointer;font-family:inherit;")}>Edit</button>
                </div>
                <div style={css("border:1px solid color-mix(in srgb,var(--ac) 35%,#1f1f23);border-radius:12px;background:linear-gradient(180deg,color-mix(in srgb,var(--ac) 5%,#0c0c0e),#0c0c0e);padding:20px;")}>
                  <div style={css("display:flex;align-items:center;gap:10px;margin-bottom:18px;")}><div style={css("font-size:15px;font-weight:600;color:var(--ac);")}>Pro</div><span style={css("font-size:10.5px;font-weight:600;color:#76767e;border:1px solid #2a2a2e;border-radius:5px;padding:1px 6px;")}>EDITING</span></div>
                  <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:14px;")}>
                    <label style={css("display:block;")}><span style={css(labelInput)}>Plan name</span><input className="pk-input" defaultValue="Pro" style={css(fieldInput)} /></label>
                    <label style={css("display:block;")}><span style={css(labelInput)}>Price / mo (USD)</span><input className="pk-input" defaultValue="19" style={css(fieldMono)} /></label>
                    <label style={css("display:block;")}><span style={css(labelInput)}>Included credits / mo</span><input className="pk-input" defaultValue="500" style={css(fieldMono)} /></label>
                  </div>
                  <div style={css("margin-top:16px;")}><span style={css("display:block;font-size:11px;font-weight:600;color:#76767e;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:9px;")}>Entitlements</span><div style={css("display:flex;flex-wrap:wrap;gap:8px;")}>{["pro", "hd_upscale"].map((e) => <span key={e} style={css("display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--ac);background:color-mix(in srgb,var(--ac) 12%,transparent);border:1px solid color-mix(in srgb,var(--ac) 26%,transparent);border-radius:7px;padding:4px 10px;")}>{e}</span>)}<span style={css("display:inline-flex;align-items:center;gap:5px;font-size:12.5px;color:#76767e;background:#131316;border:1px dashed #2a2a2e;border-radius:7px;padding:4px 10px;cursor:pointer;")}>+ Add</span></div></div>
                  <div style={css("display:flex;gap:10px;margin-top:20px;")}><button className="pk-primary" style={css("padding:8px 16px;border-radius:8px;background:var(--ac);color:#06120c;font-size:13px;font-weight:600;border:none;cursor:pointer;font-family:inherit;")}>Save plan</button><button className="pk-ghost" style={css("padding:8px 16px;border-radius:8px;background:transparent;color:#a5a5ad;font-size:13px;font-weight:500;border:1px solid #2a2a2e;cursor:pointer;font-family:inherit;")}>Cancel</button></div>
                </div>
              </div>
              <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;")}><div style={css("font-size:13px;font-weight:600;color:#76767e;letter-spacing:0.06em;text-transform:uppercase;")}>Credit packs</div><button style={css("display:inline-flex;align-items:center;gap:5px;font-size:12.5px;color:var(--ac);background:transparent;border:none;cursor:pointer;font-family:inherit;font-weight:550;")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>New pack</button></div>
              <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px;")}>
                {[["100", "$9"], ["500", "$39"], ["2,000", "$129"]].map(([n, p]) => (
                  <div key={n} style={css("border:1px solid #1f1f23;border-radius:12px;background:#0c0c0e;padding:18px;")}><div style={css("font-size:22px;font-weight:600;color:#fafafa;font-variant-numeric:tabular-nums;letter-spacing:-0.02em;")}>{n}</div><div style={css("font-size:12px;color:#6b6b73;margin:2px 0 12px;")}>credits</div><div style={css("font-size:15px;font-weight:600;color:var(--ac);font-variant-numeric:tabular-nums;")}>{p}</div></div>
                ))}
              </div>
            </div>
          )}

          {/* USAGE */}
          {dashView === "usage" && (
            <div style={css("max-width:880px;")}>
              <div style={css("border:1px solid #1f1f23;border-radius:14px;background:#0c0c0e;padding:20px 22px;margin-bottom:14px;")}>
                <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;")}><div style={css("font-size:14.5px;font-weight:600;color:#fafafa;")}>Metered calls</div><div style={css("font-size:13px;color:#6b6b73;")}>{(an?.meteredThisMonth ?? 0).toLocaleString()} this month</div></div>
                {(() => {
                  const m = (an?.series ?? []).map((s) => s.metered)
                  const max = Math.max(1, ...m)
                  return (
                    <svg viewBox="0 0 720 200" preserveAspectRatio="none" style={css("width:100%;height:170px;display:block;")}>
                      {[50, 100, 150].map((y) => <line key={y} x1="0" y1={y} x2="720" y2={y} stroke="#ffffff0a" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
                      <polyline points={pts(m, max)} fill="none" stroke="var(--ac)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  )
                })()}
                <div style={css("display:flex;justify-content:space-between;margin-top:8px;font-size:10px;color:#5b5b63;font-variant-numeric:tabular-nums;")}>{(an?.series ?? []).filter((_, i) => i % 2 === 0).map((s, i) => <span key={i}>{s.label}</span>)}</div>
              </div>
              <div style={css("border:1px solid #1f1f23;border-radius:14px;background:#0c0c0e;padding:20px 22px;")}>
                <div style={css("font-size:14.5px;font-weight:600;color:#fafafa;margin-bottom:18px;")}>Top events</div>
                <div style={css("display:flex;flex-direction:column;gap:16px;")}>
                  {an && an.topEvents.length === 0 && (
                    <div style={css("font-size:12.5px;color:#6b6b73;")}>No metered events yet.</div>
                  )}
                  {(() => {
                    const top = an?.topEvents ?? []
                    const max = Math.max(1, ...top.map((t) => t.count))
                    return top.map((t, i) => (
                      <div key={t.name}>
                        <div style={css("display:flex;justify-content:space-between;margin-bottom:7px;font-size:13px;")}><span style={css("color:#e4e4e7;font-family:'Geist Mono',monospace;")}>{t.name}</span><span style={css("color:#76767e;font-variant-numeric:tabular-nums;")}>{t.count.toLocaleString()}</span></div>
                        <div style={css("height:7px;border-radius:4px;background:#16161a;overflow:hidden;")}><div style={css(`height:100%;width:${Math.round((t.count / max) * 100)}%;background:var(--ac);border-radius:4px;opacity:${Math.max(0.4, 1 - i * 0.15)};`)} /></div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* CUSTOMERS */}
          {dashView === "customers" && (
            <div>
              <div style={css("display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;")}>
                <div style={css("display:flex;align-items:center;gap:7px;padding:7px 11px;border-radius:9px;background:#0e0e10;border:1px solid #1f1f23;color:#76767e;font-size:13px;min-width:200px;")}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>Search customers…</div>
                <span style={css("display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--ac);background:color-mix(in srgb,var(--ac) 12%,transparent);border:1px solid color-mix(in srgb,var(--ac) 28%,transparent);border-radius:999px;padding:3px 9px;letter-spacing:0.02em;")}><span style={css("width:6px;height:6px;border-radius:50%;background:var(--ac);")} />LIVE</span>
                <div style={{ flex: 1 }} />
                <span style={css("font-size:12.5px;color:#6b6b73;")}>{accounts === null ? "loading…" : `${stats?.total ?? customers.length} accounts · ${(stats?.creditsOutstanding ?? 0).toLocaleString()} credits outstanding`}</span>
              </div>
              <div style={css("border:1px solid #1f1f23;border-radius:12px;background:#0c0c0e;overflow:hidden;")}>
                <div style={css("display:grid;grid-template-columns:2fr 0.9fr 0.9fr 1fr 0.8fr;gap:12px;padding:11px 18px;border-bottom:1px solid #18181b;font-size:11px;font-weight:600;color:#76767e;letter-spacing:0.05em;text-transform:uppercase;")}>
                  <span>Customer</span><span>Plan</span><span style={css("text-align:right;")}>Credits</span><span>Status</span><span style={css("text-align:right;")}>Joined</span>
                </div>
                {customers.map((c) => (
                  <div key={c.key} className="pk-row" style={css("display:grid;grid-template-columns:2fr 0.9fr 0.9fr 1fr 0.8fr;gap:12px;padding:13px 18px;border-bottom:1px solid #141417;align-items:center;")}>
                    <div style={css("display:flex;align-items:center;gap:11px;min-width:0;")}><div style={css("width:30px;height:30px;border-radius:50%;flex:none;background:#1a1a1e;border:1px solid #2a2a2e;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#a5a5ad;")}>{c.initials}</div><div style={css("min-width:0;")}><div style={css("font-size:13.5px;font-weight:550;color:#e4e4e7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{c.label}</div><div style={css("font-size:11.5px;color:#6b6b73;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;")}>{c.sub}</div></div></div>
                    <div><span style={c.planStyle}>{c.plan}</span></div>
                    <div style={css("text-align:right;font-size:13px;color:#cfcfd6;font-variant-numeric:tabular-nums;font-family:'Geist Mono',monospace;")}>{c.credits}</div>
                    <div><span style={css(`display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:999px;font-size:11.5px;font-weight:550;letter-spacing:-0.01em;color:${c.statusColor};background:${c.statusBg};`)}><span style={css(`width:5px;height:5px;border-radius:50%;flex:none;background:${c.statusColor};`)} />{c.statusLabel}</span></div>
                    <div style={css("text-align:right;font-size:12.5px;color:#76767e;")}>—</div>
                  </div>
                ))}
                {accounts !== null && customers.length === 0 && (
                  <div style={css("padding:28px 18px;text-align:center;font-size:13px;color:#6b6b73;")}>No accounts yet — meter a call or run a checkout to create the first one.</div>
                )}
              </div>
            </div>
          )}

          {/* API KEYS */}
          {dashView === "keys" && (
            <div style={css("max-width:760px;")}>
              {!project ? (
                <div style={css("border:1px solid color-mix(in srgb,var(--ac) 32%,#1f1f23);border-radius:14px;background:linear-gradient(180deg,color-mix(in srgb,var(--ac) 6%,#0c0c0e),#0c0c0e);padding:22px;margin-bottom:18px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;")}>
                  <div style={css("flex:1;min-width:200px;")}>
                    <div style={css("font-size:15px;font-weight:600;color:#fafafa;letter-spacing:-0.01em;")}>Create your project</div>
                    <div style={css("font-size:13px;color:#9a9aa2;margin-top:3px;line-height:1.5;")}>Get your own keys so your customers&apos; data is isolated from everyone else&apos;s. Takes one click.</div>
                  </div>
                  <button className="pk-primary" onClick={createProject} style={css("padding:10px 18px;border-radius:10px;background:var(--ac);color:#06120c;font-size:14px;font-weight:600;border:none;cursor:pointer;font-family:inherit;")}>{creating ? "Creating…" : "Create project"}</button>
                </div>
              ) : (
                <div style={css("display:flex;align-items:center;gap:10px;margin-bottom:18px;")}>
                  <span style={css("display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--ac);background:color-mix(in srgb,var(--ac) 12%,transparent);border:1px solid color-mix(in srgb,var(--ac) 28%,transparent);border-radius:999px;padding:3px 9px;")}><span style={css("width:6px;height:6px;border-radius:50%;background:var(--ac);")} />{project.name}</span>
                  <span style={css("font-size:12.5px;color:#6b6b73;")}>your project · data is isolated to these keys</span>
                </div>
              )}
              <p style={css("font-size:13.5px;color:#8f8f97;margin:0 0 24px;line-height:1.55;max-width:560px;")}>Use your <span style={css("color:#cfcfd6;")}>publishable</span> key in the embed / browser SDK and your <span style={css("color:#cfcfd6;")}>secret</span> key only on your server.</p>
              <div style={css("border:1px solid #1f1f23;border-radius:12px;background:#0c0c0e;padding:18px 20px;margin-bottom:14px;")}>
                <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;")}><span style={css("font-size:11px;font-weight:600;color:#76767e;letter-spacing:0.05em;text-transform:uppercase;")}>Publishable key</span><span style={css("font-size:11px;color:#6b6b73;")}>Safe in client code</span></div>
                <div style={css("display:flex;align-items:center;gap:10px;")}>
                  <code style={css("flex:1;min-width:0;font-family:'Geist Mono',monospace;font-size:13px;color:#cfcfd6;background:#0e0e10;border:1px solid #1f1f23;border-radius:8px;padding:9px 12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;")}>{pubKey}</code>
                  <button className="pk-copybtn" onClick={() => copy("pub", pubKey)} style={css(copyBtnSm)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>{copied === "pub" ? "Copied" : "Copy"}</button>
                </div>
              </div>
              <div style={css("border:1px solid #1f1f23;border-radius:12px;background:#0c0c0e;padding:18px 20px;")}>
                <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;")}><span style={css("font-size:11px;font-weight:600;color:#76767e;letter-spacing:0.05em;text-transform:uppercase;")}>Secret key</span><span style={css("font-size:11px;color:#fca5a5;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:5px;padding:1px 7px;")}>Server only</span></div>
                <div style={css("display:flex;align-items:center;gap:10px;flex-wrap:wrap;")}>
                  <code style={css("flex:1;min-width:200px;font-family:'Geist Mono',monospace;font-size:13px;color:#cfcfd6;background:#0e0e10;border:1px solid #1f1f23;border-radius:8px;padding:9px 12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;")}>{revealSecret ? realSecret : "sk_live_" + "•".repeat(24)}</code>
                  <div style={css("display:flex;gap:8px;")}>
                    <button className="pk-copybtn" onClick={() => setRevealSecret((b) => !b)} style={css(copyBtnSm)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>{revealSecret ? "Hide" : "Reveal"}</button>
                    <button className="pk-copybtn" onClick={() => copy("secret", realSecret)} style={css(copyBtnSm)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>{copied === "secret" ? "Copied" : "Copy"}</button>
                  </div>
                </div>
              </div>
              {project && (
                <div style={css("display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:14px;padding:16px 20px;border:1px solid #1f1f23;border-radius:12px;background:#0c0c0e;")}>
                  <div style={css("flex:1;min-width:0;")}>
                    <div style={css("font-size:13.5px;font-weight:550;color:#e4e4e7;")}>Secure metering</div>
                    <div style={css("font-size:12px;color:#6b6b73;margin-top:2px;line-height:1.5;")}>Require your <span style={css("color:#cfcfd6;")}>secret</span> key to deduct credits (server-side, authoritative). Off = the no-code embed can meter from the browser.</div>
                  </div>
                  <div
                    onClick={toggleSecureMetering}
                    style={css(`width:38px;height:22px;border-radius:999px;position:relative;flex:none;cursor:pointer;transition:background .15s;background:${project.secureMetering ? "var(--ac)" : "#2a2a2e"};`)}
                  >
                    <div style={css(`position:absolute;top:2px;${project.secureMetering ? "right:2px" : "left:2px"};width:18px;height:18px;border-radius:50%;transition:all .15s;background:${project.secureMetering ? "#06120c" : "#76767e"};`)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS */}
          {dashView === "settings" && (
            <div style={css("max-width:600px;display:flex;flex-direction:column;gap:18px;")}>
              {[
                ["Workspace name", "Vellum AI", false],
                ["Billing email", "billing@vellum.ai", false],
                ["Webhook URL", "https://api.vellum.ai/paykit/webhook", true],
              ].map(([label, val, mono]) => (
                <label key={label as string} style={css("display:block;")}><span style={css("display:block;font-size:11px;font-weight:600;color:#76767e;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:7px;")}>{label}</span><input className="pk-input" defaultValue={val as string} style={css(`width:100%;padding:9px 12px;border-radius:8px;background:#0e0e10;border:1px solid #2a2a2e;color:${mono ? "#cfcfd6" : "#fafafa"};font-size:${mono ? "13.5px" : "14px"};font-family:${mono ? "'Geist Mono',monospace" : "inherit"};outline:none;`)} /></label>
              ))}
              <div style={css("display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border:1px solid #1f1f23;border-radius:10px;background:#0c0c0e;")}><div><div style={css("font-size:13.5px;font-weight:550;color:#e4e4e7;")}>Block calls when out of credits</div><div style={css("font-size:12px;color:#6b6b73;margin-top:2px;")}>Return <span style={css("font-family:'Geist Mono',monospace;")}>blocked: true</span> instead of charging overage</div></div><div style={css("width:38px;height:22px;border-radius:999px;background:var(--ac);position:relative;flex:none;cursor:pointer;")}><div style={css("position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:#06120c;")} /></div></div>
              <div><button className="pk-primary" style={css("padding:9px 18px;border-radius:9px;background:var(--ac);color:#06120c;font-size:13.5px;font-weight:600;border:none;cursor:pointer;font-family:inherit;")}>Save changes</button></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ===================== QUICKSTART ===================== */
function Quickstart({
  go,
  qsDone,
  qsProgress,
  qsComplete,
  qsCopy,
  qsRun,
  qsReset,
  copied,
}: {
  go: (s: Screen) => void
  qsDone: { install: boolean; key: boolean; meter: boolean }
  qsProgress: number
  qsComplete: boolean
  qsCopy: (step: "install" | "key" | "meter", text: string) => void
  qsRun: () => void
  qsReset: () => void
  copied: string
}) {
  const EMBED = '<div id="paykit"></div>\n<script src="https://paykit-zoanlogias-projects.vercel.app/embed.js" data-key="pk_live_..."></script>'
  const EMBED_HTML =
    '<span style="color:#6b7280">&lt;</span><span style="color:#7dd3fc">div</span> <span style="color:#cfcfd6">id</span>=<span style="color:#fbbf24">"paykit"</span><span style="color:#6b7280">&gt;&lt;/</span><span style="color:#7dd3fc">div</span><span style="color:#6b7280">&gt;</span>\n<span style="color:#6b7280">&lt;</span><span style="color:#7dd3fc">script</span> <span style="color:#cfcfd6">src</span>=<span style="color:#fbbf24">"https://paykit-zoanlogias-projects.vercel.app/embed.js"</span> <span style="color:#cfcfd6">data-key</span>=<span style="color:#fbbf24">"pk_live_..."</span><span style="color:#6b7280">&gt;&lt;/</span><span style="color:#7dd3fc">script</span><span style="color:#6b7280">&gt;</span>'
  const [embedCopied, setEmbedCopied] = useState(false)
  function copyEmbed() {
    try {
      navigator.clipboard?.writeText(EMBED)
    } catch {
      /* clipboard unavailable */
    }
    setEmbedCopied(true)
    setTimeout(() => setEmbedCopied(false), 1500)
  }
  const steps: {
    key: "install" | "key" | "meter"
    n: string
    title: string
    desc: React.ReactNode
    codeHtml: string
    copyText: string
    done: boolean
    copiedId: string
  }[] = [
    {
      key: "install",
      n: "1",
      title: "Install the SDK",
      desc: "Add the React client and the Node helper to your project.",
      codeHtml: `<span style="color:#565a66">$</span> npm install <span style="color:#fbbf24">@paykit/react @paykit/node</span>`,
      copyText: "npm install @paykit/react @paykit/node",
      done: qsDone.install,
      copiedId: "qs_install",
    },
    {
      key: "key",
      n: "2",
      title: "Add your secret key",
      desc: <>Drop your key into <span style={css("font-family:'Geist Mono',monospace;color:#cfcfd6;")}>.env.local</span> — server-side only, never in the browser.</>,
      codeHtml: `<span style="color:#7dd3fc">PAYKIT_SECRET_KEY</span>=<span style="color:#fbbf24">sk_live_a3f9C2k8Lp0Qe7Rt5</span>`,
      copyText: "PAYKIT_SECRET_KEY=sk_live_a3f9C2k8Lp0Qe7Rt5",
      done: qsDone.key,
      copiedId: "qs_key",
    },
    {
      key: "meter",
      n: "3",
      title: "Meter your first call",
      desc: <>Wrap any AI call. If <span style={css("font-family:'Geist Mono',monospace;color:#cfcfd6;")}>blocked</span> comes back true, the user is out of credits.</>,
      codeHtml: `<span style="color:#c084fc">const</span> { blocked } = <span style="color:#c084fc">await</span> <span style="color:#7dd3fc">meter</span>(<span style="color:#fbbf24">"image_gen"</span>)`,
      copyText: 'const { blocked } = await meter("image_gen")',
      done: qsDone.meter,
      copiedId: "qs_meter",
    },
  ]

  return (
    <div style={css("position:relative;min-height:calc(100vh - 56px);overflow:hidden;")}>
      <div aria-hidden="true" style={css("position:absolute;inset:0;pointer-events:none;background:radial-gradient(50% 36% at 50% -4%, color-mix(in srgb, var(--ac) 12%, transparent), transparent 72%);")} />
      <div style={css("position:relative;z-index:1;max-width:680px;margin:0 auto;padding:clamp(40px,5vw,72px) 24px 64px;")}>
        <div style={css("text-align:center;margin-bottom:38px;")}>
          <div style={css("font-size:12px;font-weight:600;color:var(--ac);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:13px;")}>Quickstart</div>
          <h1 style={css("font-size:clamp(28px,4vw,40px);font-weight:600;letter-spacing:-0.034em;color:#fafafa;margin:0 0 12px;line-height:1.08;")}>Connect PayKit in minutes</h1>
          <p style={css("font-size:15.5px;color:#9a9aa2;margin:0 auto;max-width:460px;line-height:1.55;")}>Two ways to add credits &amp; a paywall — pick the one that fits. No code for any website, or React for developers.</p>
        </div>

        {/* ===== NO CODE ===== */}
        <div style={css("border:1px solid color-mix(in srgb,var(--ac) 32%,#1f1f23);border-radius:16px;background:linear-gradient(180deg,color-mix(in srgb,var(--ac) 6%,#0c0c0e),#0c0c0e);padding:24px;margin-bottom:18px;")}>
          <div style={css("display:flex;align-items:center;gap:10px;margin-bottom:6px;")}>
            <span style={css("font-size:11px;font-weight:700;color:#06120c;background:var(--ac);border-radius:6px;padding:2px 8px;letter-spacing:0.02em;")}>NO CODE</span>
            <h3 style={css("font-size:17px;font-weight:600;color:#fafafa;margin:0;letter-spacing:-0.015em;")}>Paste one line. Done.</h3>
          </div>
          <p style={css("font-size:13.5px;color:#9a9aa2;margin:0 0 16px;line-height:1.55;")}>Works on any website — Webflow, Wix, WordPress, or plain HTML. Drop in the credits meter, a “Buy credits” button, and a Pro paywall. No install, no account to wire up.</p>
          <div style={css("position:relative;border:1px solid #1f1f23;border-radius:10px;background:#0e0e10;padding:14px;")}>
            <button className="pk-copybtn" onClick={copyEmbed} style={css("position:absolute;top:10px;right:10px;display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:7px;background:#161619;border:1px solid #26262b;color:#9a9aa2;font-size:11.5px;font-weight:500;cursor:pointer;font-family:inherit;")}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>{embedCopied ? "Copied" : "Copy"}</button>
            <pre style={css("margin:0;font-family:'Geist Mono',monospace;font-size:12.5px;line-height:1.6;color:#cfcfd6;overflow-x:auto;white-space:pre;padding-right:64px;")} dangerouslySetInnerHTML={{ __html: EMBED_HTML }} />
          </div>
          <div style={css("display:flex;flex-wrap:wrap;align-items:center;gap:14px;margin-top:16px;")}>
            <a href="/embed-demo.html" target="_blank" rel="noopener" className="pk-primary" style={css("display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:10px;background:var(--ac);color:#06120c;font-size:13.5px;font-weight:600;text-decoration:none;font-family:inherit;")}>See it live <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg></a>
            <span style={css("font-size:12.5px;color:#76767e;line-height:1.5;")}>Add <code style={css("font-family:'Geist Mono',monospace;color:#cfcfd6;")}>data-paykit-meter=&quot;...&quot;</code> to any button to charge a credit on click.</span>
          </div>
        </div>

        {/* ===== DEVELOPERS ===== */}
        <div style={css("display:flex;align-items:center;gap:12px;margin:6px 0 16px;")}>
          <span style={css("font-size:11px;font-weight:600;color:#76767e;letter-spacing:0.08em;text-transform:uppercase;white-space:nowrap;")}>For developers · React</span>
          <div style={{ flex: 1, height: 1, background: "#1a1a1d" }} />
          <span style={css("font-size:12px;color:#76767e;font-variant-numeric:tabular-nums;white-space:nowrap;")}><span style={css("font-weight:600;color:var(--ac);")}>{qsProgress}</span> / 3</span>
        </div>

        <div style={css("display:flex;flex-direction:column;gap:14px;")}>
          {steps.map((s) => (
            <div key={s.key} style={css("border:1px solid #1f1f23;border-radius:14px;background:#0c0c0e;padding:20px 22px;")}>
              <div style={css("display:flex;align-items:center;gap:13px;margin-bottom:6px;")}>
                {s.done ? (
                  <div style={css("width:30px;height:30px;border-radius:50%;flex:none;background:var(--ac);display:flex;align-items:center;justify-content:center;")}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#06120c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
                ) : (
                  <div style={css("width:30px;height:30px;border-radius:50%;flex:none;border:1px solid #2a2a2e;background:#131316;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#a5a5ad;font-family:'Geist Mono',monospace;")}>{s.n}</div>
                )}
                <h3 style={css("font-size:16px;font-weight:600;color:#fafafa;margin:0;letter-spacing:-0.015em;")}>{s.title}</h3>
              </div>
              <p style={css("font-size:13.5px;color:#8f8f97;margin:0 0 14px;line-height:1.5;")}>{s.desc}</p>
              <div style={css("position:relative;border:1px solid #1f1f23;border-radius:10px;background:#0e0e10;padding:12px 14px;")}>
                <button className="pk-copybtn" onClick={() => qsCopy(s.key, s.copyText)} style={css("position:absolute;top:9px;right:9px;display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:7px;background:#161619;border:1px solid #26262b;color:#9a9aa2;font-size:11.5px;font-weight:500;cursor:pointer;font-family:inherit;")}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>{copied === s.copiedId ? "Copied" : "Copy"}</button>
                <code style={css("display:block;font-family:'Geist Mono',monospace;font-size:13px;line-height:1.5;color:#cfcfd6;overflow-x:auto;white-space:pre;padding-right:64px;")} dangerouslySetInnerHTML={{ __html: s.codeHtml }} />
              </div>
            </div>
          ))}
        </div>

        {qsComplete ? (
          <div style={css("margin-top:22px;border:1px solid color-mix(in srgb,var(--ac) 36%,transparent);border-radius:14px;background:linear-gradient(180deg,color-mix(in srgb,var(--ac) 9%,#0c0c0e),#0c0c0e);padding:24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;")}>
            <div style={css("width:42px;height:42px;border-radius:50%;flex:none;background:var(--ac);display:flex;align-items:center;justify-content:center;box-shadow:0 0 24px color-mix(in srgb,var(--ac) 45%,transparent);")}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06120c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
            <div style={css("flex:1;min-width:180px;")}><div style={css("font-size:16px;font-weight:600;color:#fafafa;letter-spacing:-0.015em;")}>You&apos;re live — first call metered.</div><div style={css("font-size:13px;color:#9a9aa2;margin-top:3px;")}>Credits are deducting. Open the dashboard to watch usage roll in.</div></div>
            <div style={css("display:flex;gap:10px;")}><button className="pk-primary" onClick={() => go("dashboard")} style={css("padding:9px 16px;border-radius:9px;background:var(--ac);color:#06120c;font-size:13.5px;font-weight:600;border:none;cursor:pointer;font-family:inherit;")}>Go to dashboard</button><button className="pk-ghost" onClick={qsReset} style={css("padding:9px 14px;border-radius:9px;background:transparent;color:#a5a5ad;font-size:13.5px;font-weight:500;border:1px solid #2a2a2e;cursor:pointer;font-family:inherit;")}>Reset</button></div>
          </div>
        ) : (
          <div style={css("margin-top:22px;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;")}>
            <span style={css("font-size:13.5px;color:#76767e;")}>Done copying? Fire a test event to confirm wiring.</span>
            <button className="pk-ghost" onClick={qsRun} style={css("display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:9px;background:#131316;color:#e4e4e7;font-size:13.5px;font-weight:550;border:1px solid #2a2a2e;cursor:pointer;font-family:inherit;")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 3 14 9-14 9V3Z" /></svg>Run a test call</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ===================== WIDGET (live, wired to the real API) ===================== */
// A per-visit demo account so each viewer gets their own real ledger in Postgres.
function WidgetLive() {
  const [uid] = useState(() => "widget-demo-" + Math.random().toString(36).slice(2, 10))
  return (
    <PayKitProvider userId={uid}>
      <WidgetConnected />
    </PayKitProvider>
  )
}

function WidgetConnected() {
  const { account, meter, buyCredits, upgrade } = usePayKit()
  const [wShots, setWShots] = useState<number[]>([212, 158, 286])
  const [wLog, setWLog] = useState<string[]>([])

  const wCredits = account?.credits ?? 0
  const wIsPro = account?.plan === "pro"
  const wPct = Math.max(0, Math.min(100, Math.round((wCredits / 60) * 100)))

  async function wGenerate() {
    const r = await meter("image_gen") // real POST /api/v1/meter — deducts a credit in Neon
    if (r.blocked) {
      setWLog((l) => ["Blocked — out of credits. Buy more to keep generating.", ...l].slice(0, 5))
      return
    }
    const hue = Math.floor(Math.random() * 360)
    setWShots((s) => [hue, ...s].slice(0, 8))
    setWLog((l) => [`Generated image · −1 credit · ${r.remaining} left`, ...l].slice(0, 5))
  }
  async function wBuy() {
    await buyCredits(50) // real POST /api/v1/credits
    setWLog((l) => ["Bought 50 credits · $9.00", ...l].slice(0, 5))
  }
  async function wUpgrade() {
    const next = wIsPro ? "free" : "pro"
    await upgrade(next) // real POST /api/v1/credits (plan)
    setWLog((l) => [next === "pro" ? "Upgraded to Pro · $19/mo" : "Switched to Free plan", ...l].slice(0, 5))
  }

  return (
    <Widget
      wCredits={wCredits}
      wPct={wPct}
      wIsPro={wIsPro}
      wShots={wShots}
      wLog={wLog}
      wGenerate={wGenerate}
      wBuy={wBuy}
      wUpgrade={wUpgrade}
    />
  )
}

function Widget({
  wCredits,
  wPct,
  wIsPro,
  wShots,
  wLog,
  wGenerate,
  wBuy,
  wUpgrade,
}: {
  wCredits: number
  wPct: number
  wIsPro: boolean
  wShots: number[]
  wLog: string[]
  wGenerate: () => void
  wBuy: () => void
  wUpgrade: () => void
}) {
  return (
    <div style={css("position:relative;min-height:calc(100vh - 56px);padding:clamp(32px,4vw,56px) 24px;")}>
      <div style={css("max-width:920px;margin:0 auto;")}>
        <div style={css("text-align:center;margin-bottom:30px;")}>
          <div style={css("font-size:12px;font-weight:600;color:var(--ac);letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;")}>Drop-in widget</div>
          <h1 style={css("font-size:clamp(26px,3.4vw,36px);font-weight:600;letter-spacing:-0.032em;color:#fafafa;margin:0 0 10px;line-height:1.1;")}>How it looks inside your app</h1>
          <p style={css("font-size:15px;color:#9a9aa2;margin:0 auto;max-width:440px;line-height:1.55;")}>The credits meter and <span style={css("font-family:'Geist Mono',monospace;color:#cfcfd6;")}>&lt;Paywall&gt;</span> live next to your UI. Try it — every generation spends a credit.</p>
        </div>

        {/* customer app window */}
        <div style={css("border:1px solid #232327;border-radius:14px;background:#0c0c0e;overflow:hidden;box-shadow:0 30px 70px -28px rgba(0,0,0,.85);")}>
          <div style={css("display:flex;align-items:center;gap:8px;padding:11px 14px;border-bottom:1px solid #1c1c20;background:#0e0e10;")}>
            <span style={css("width:11px;height:11px;border-radius:50%;background:#2b2b30;")} /><span style={css("width:11px;height:11px;border-radius:50%;background:#2b2b30;")} /><span style={css("width:11px;height:11px;border-radius:50%;background:#2b2b30;")} />
            <div style={css("flex:1;display:flex;justify-content:center;")}><div style={css("font-family:'Geist Mono',monospace;font-size:11.5px;color:#6b6b73;background:#131316;border:1px solid #1f1f23;border-radius:6px;padding:3px 14px;")}>imagestudio.app</div></div>
          </div>
          <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(290px,100%),1fr));gap:0;")}>
            {/* left: the customer's app UI */}
            <div style={css("padding:24px;border-right:1px solid #18181b;min-width:0;")}>
              <div style={css("display:flex;align-items:center;gap:9px;margin-bottom:20px;")}><div style={css("width:24px;height:24px;border-radius:6px;background:linear-gradient(135deg,#a78bfa,#7dd3fc);")} /><span style={css("font-size:15px;font-weight:650;color:#fafafa;letter-spacing:-0.02em;")}>ImageStudio</span></div>
              <div style={css("font-size:11px;font-weight:600;color:#76767e;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px;")}>Prompt</div>
              <div style={css("border:1px solid #1f1f23;border-radius:10px;background:#0e0e10;padding:12px 13px;font-size:13.5px;color:#cfcfd6;line-height:1.5;margin-bottom:14px;")}>A neon koi swimming through clouds, cinematic, 35mm</div>
              <button className="pk-primary" onClick={wGenerate} style={css("width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px;border-radius:10px;background:var(--ac);color:#06120c;font-size:14px;font-weight:600;border:none;cursor:pointer;font-family:inherit;box-shadow:0 8px 24px color-mix(in srgb,var(--ac) 24%,transparent);")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3Z" /></svg>Generate image</button>
              <div style={css("font-size:11.5px;color:#6b6b73;text-align:center;margin-top:9px;")}>Each generation calls <span style={css("font-family:'Geist Mono',monospace;color:#8f8f97;")}>meter(&quot;image_gen&quot;)</span></div>
              <div style={css("display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:20px;")}>
                {wShots.map((h, i) => (
                  <div key={i} style={{ aspectRatio: "1", borderRadius: "8px", border: "1px solid #ffffff10", background: `linear-gradient(135deg, hsl(${h} 68% 56%), hsl(${h} 70% 38%))` }} />
                ))}
              </div>
            </div>

            {/* right: the PayKit widget */}
            <div style={css("padding:24px;background:#0a0a0c;min-width:0;display:flex;flex-direction:column;gap:14px;")}>
              <div style={css("border:1px solid #1f1f23;border-radius:14px;background:#0c0c0e;padding:18px;")}>
                <div style={css("display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;")}>
                  <span style={css("font-size:11px;font-weight:600;color:#76767e;letter-spacing:0.05em;text-transform:uppercase;")}>Credits</span>
                  {wIsPro ? (
                    <span style={css("font-size:11px;font-weight:600;color:var(--ac);background:color-mix(in srgb,var(--ac) 13%,transparent);border:1px solid color-mix(in srgb,var(--ac) 30%,transparent);border-radius:999px;padding:2px 10px;")}>Pro</span>
                  ) : (
                    <span style={css("font-size:11px;font-weight:600;color:#a1a1aa;background:#161619;border:1px solid #26262a;border-radius:999px;padding:2px 10px;")}>Free</span>
                  )}
                </div>
                <div style={css("display:flex;align-items:baseline;gap:7px;")}><span style={css("font-size:38px;font-weight:600;color:#fafafa;letter-spacing:-0.04em;font-variant-numeric:tabular-nums;line-height:1;")}>{wCredits}</span><span style={css("font-size:13px;color:#76767e;")}>credits left</span></div>
                <div style={css("height:7px;border-radius:4px;background:#16161a;overflow:hidden;margin:14px 0 16px;")}><div style={{ height: "100%", width: `${wPct}%`, background: "var(--ac)", borderRadius: "4px", transition: "width .35s ease" }} /></div>
                <button className="pk-ghost" onClick={wBuy} style={css("width:100%;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px;border-radius:9px;background:#131316;color:#e4e4e7;font-size:13.5px;font-weight:550;border:1px solid #2a2a2e;cursor:pointer;font-family:inherit;")}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>Buy 50 credits · $9</button>
              </div>

              {/* Paywalled feature */}
              {wIsPro ? (
                <div style={css("border:1px solid color-mix(in srgb,var(--ac) 34%,transparent);border-radius:14px;background:linear-gradient(180deg,color-mix(in srgb,var(--ac) 8%,#0c0c0e),#0c0c0e);padding:16px 18px;")}>
                  <div style={css("display:flex;align-items:center;gap:9px;margin-bottom:6px;")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ac)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3v4M3 5h4M19 17v4M17 19h4M13 4l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" /></svg><span style={css("font-size:14px;font-weight:600;color:#fafafa;")}>HD upscale unlocked</span></div>
                  <p style={css("font-size:12.5px;color:#9a9aa2;margin:0 0 12px;line-height:1.5;")}>Pro is active — 4× upscaling is available on every render.</p>
                  <button className="pk-ghost" onClick={wUpgrade} style={css("width:100%;padding:9px;border-radius:9px;background:transparent;color:#76767e;font-size:12.5px;font-weight:500;border:1px solid #2a2a2e;cursor:pointer;font-family:inherit;")}>Switch back to Free</button>
                </div>
              ) : (
                <div style={css("border:1px dashed #2a2a2e;border-radius:14px;background:#0c0c0e;padding:16px 18px;")}>
                  <div style={css("display:flex;align-items:center;gap:9px;margin-bottom:6px;")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#76767e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg><span style={css("font-size:14px;font-weight:600;color:#cfcfd6;")}>HD upscale</span></div>
                  <p style={css("font-size:12.5px;color:#76767e;margin:0 0 12px;line-height:1.5;")}>4× upscaling is a Pro feature. Upgrade to unlock it for every render.</p>
                  <button className="pk-primary" onClick={wUpgrade} style={css("width:100%;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px;border-radius:9px;background:var(--ac);color:#06120c;font-size:13.5px;font-weight:600;border:none;cursor:pointer;font-family:inherit;")}>Upgrade to Pro · $19/mo</button>
                </div>
              )}

              <div style={css("display:flex;align-items:center;justify-content:center;gap:6px;opacity:.6;")}><Logo size={13} /><span style={css("font-size:11px;color:#6b6b73;font-weight:500;")}>Powered by PayKit</span></div>
            </div>
          </div>
        </div>

        {/* live activity log */}
        {wLog.length > 0 && (
          <div style={css("margin-top:16px;border:1px solid #1f1f23;border-radius:12px;background:#0c0c0e;padding:14px 18px;")}>
            <div style={css("font-size:11px;font-weight:600;color:#76767e;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:10px;")}>Live events</div>
            <div style={css("display:flex;flex-direction:column;gap:8px;font-family:'Geist Mono',monospace;font-size:12px;")}>
              {wLog.map((line, i) => (
                <div key={i} style={css("color:#9a9aa2;display:flex;align-items:center;gap:8px;")}><span style={css("color:var(--ac);")}>→</span>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
