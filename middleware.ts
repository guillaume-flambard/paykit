import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// Clerk only activates once its keys are set; otherwise requests pass straight through
// so the app keeps working unauthenticated.
const clerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export default clerkConfigured ? clerkMiddleware() : () => NextResponse.next()

export const config = {
  matcher: ["/((?!_next|.*\\.[\\w]+$).*)", "/(api|trpc)(.*)"],
}
