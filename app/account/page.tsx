import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { SignInButton, UserButton } from "@clerk/nextjs"
import { listProjectsByOwner } from "@/lib/paykit-core"
import { CreateProject, ProjectCard } from "./account-ui"

export const metadata = { title: "PayKit — your account" }

const clerkConfigured = !!process.env.CLERK_SECRET_KEY

const wrap: React.CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "clamp(40px,6vw,80px) 24px" }
const h1: React.CSSProperties = { fontSize: 26, fontWeight: 600, color: "#fafafa", letterSpacing: "-0.02em", margin: "0 0 8px" }
const sub: React.CSSProperties = { color: "#9a9aa2", lineHeight: 1.55, margin: "0 0 28px", fontSize: 15 }
const accentBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 10, background: "var(--ac)", color: "#06120c", fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer", textDecoration: "none" }

export default async function Account() {
  if (!clerkConfigured) {
    return (
      <main style={wrap}>
        <Link href="/" style={{ fontSize: 13, color: "#a5a5ad", textDecoration: "none" }}>← PayKit</Link>
        <h1 style={{ ...h1, marginTop: 16 }}>Accounts aren&apos;t turned on yet</h1>
        <p style={sub}>
          PayKit uses <strong>Clerk</strong> for sign-in. Add your Clerk keys to enable real accounts and project ownership. Until then, the demo dashboard still works.
        </p>
        <ol style={{ color: "#a5a5ad", lineHeight: 1.8, fontSize: 14, paddingLeft: 18 }}>
          <li>Create a free app at <code style={{ fontFamily: "monospace", color: "#cfcfd6" }}>dashboard.clerk.com</code></li>
          <li>Copy the API keys, then set them in Vercel (Production + Preview):
            <pre tabIndex={0} style={{ background: "#0e0e10", border: "1px solid #1f1f23", borderRadius: 8, padding: 12, marginTop: 8, fontSize: 12.5, color: "#cfcfd6", overflowX: "auto" }}>{`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...`}</pre>
          </li>
          <li>Redeploy — sign-in lights up here automatically.</li>
        </ol>
      </main>
    )
  }

  const { userId } = await auth()

  if (!userId) {
    return (
      <main style={wrap}>
        <Link href="/" style={{ fontSize: 13, color: "#a5a5ad", textDecoration: "none" }}>← PayKit</Link>
        <h1 style={{ ...h1, marginTop: 16 }}>Sign in to PayKit</h1>
        <p style={sub}>Access your projects, API keys, and customer data.</p>
        <SignInButton mode="modal">
          <button style={accentBtn}>Sign in</button>
        </SignInButton>
      </main>
    )
  }

  const projects = await listProjectsByOwner(userId)

  return (
    <main style={wrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href="/" style={{ fontSize: 13, color: "#a5a5ad", textDecoration: "none", flex: 1 }}>← PayKit</Link>
        <UserButton />
      </div>
      <h1 style={h1}>Your projects</h1>
      <p style={sub}>Each project has its own keys and isolated customer data. Use a project&apos;s publishable key in the embed.</p>

      <div style={{ marginBottom: 24 }}>
        <CreateProject />
      </div>

      {projects.length === 0 ? (
        <p style={{ color: "#9a9aa2", fontSize: 14 }}>No projects yet — create your first one above.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </main>
  )
}
