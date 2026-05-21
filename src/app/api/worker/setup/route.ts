import { NextResponse } from "next/server"
import { ensureCircleUser, getCircleUserToken, initializeCircleUser } from "@/lib/circle"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { email, name, jobTitle } = await request.json()
    const normalized = String(email || "").toLowerCase().trim()
    if (!normalized) return NextResponse.json({ error: "Email required" }, { status: 400 })

    // 1. Ensure Circle user exists
    await ensureCircleUser(normalized)

    // 2. Get session token
    const { userToken, encryptionKey } = await getCircleUserToken(normalized)

    // 3. Initialize (get PIN setup challenge)
    let challengeId: string | null = null
    let alreadyInitialized = false
    try {
      challengeId = await initializeCircleUser(userToken)
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code
      if (code === 155106) {
        alreadyInitialized = true
      } else {
        throw err
      }
    }

    // 4. Upsert worker record (without wallet address yet if new)
    if (name) {
      const supabase = getSupabaseAdmin()
      await supabase.from("workers").upsert(
        { email: normalized, name: String(name), job_title: String(jobTitle || ""), circle_user_id: normalized },
        { onConflict: "email" }
      )
    }

    return NextResponse.json({ challengeId, userToken, encryptionKey, alreadyInitialized })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Setup failed" }, { status: 500 })
  }
}
