import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import Telemetry from "./telemetry-client"
import "./globals.css"

export const metadata: Metadata = {
  title: "PayKit — billing for AI apps",
  description: "Add credits, usage-based billing, and subscriptions to any AI app. Drop-in React components and a metering API — without building billing infrastructure.",
}

// Only mount Clerk once its publishable key is set, so the app renders fine without it.
const clerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const tree = (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased"
        style={{
          margin: 0,
          background: "#0a0a0a",
          color: "#e4e4e7",
          fontFamily: "'Geist', system-ui, -apple-system, sans-serif",
        }}
      >
        {children}
        <Telemetry />
      </body>
    </html>
  )
  return clerkConfigured ? <ClerkProvider>{tree}</ClerkProvider> : tree
}
