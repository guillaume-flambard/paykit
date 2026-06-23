import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "PayKit — billing for AI apps",
  description: "Add credits, usage-based billing, and subscriptions to any AI app. Drop-in React components and a metering API — without building billing infrastructure.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
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
      </body>
    </html>
  )
}
