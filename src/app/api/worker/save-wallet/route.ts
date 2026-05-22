import { NextResponse } from "next/server"
import { getCircleWalletAddress } from "@/lib/circle"
import { getSupabaseAdmin } from "@/lib/supabase"

const WALLET_LOOKUP_ATTEMPTS = 6
const WALLET_LOOKUP_DELAY_MS = 1000

async function waitForCircleWallet(userToken: string) {
  for (let attempt = 1; attempt <= WALLET_LOOKUP_ATTEMPTS; attempt++) {
    try {
      return await getCircleWalletAddress(userToken)
    } catch (error) {
      const walletIsPending = error instanceof Error && error.message === "No Circle wallet found for this user"
      if (!walletIsPending) throw error
      if (attempt === WALLET_LOOKUP_ATTEMPTS) {
        throw new Error("Circle wallet setup completed, but the wallet is not available yet. Try again in a moment.")
      }

      await new Promise((resolve) => setTimeout(resolve, WALLET_LOOKUP_DELAY_MS))
    }
  }

  throw new Error("Circle wallet lookup did not complete")
}

export async function POST(request: Request) {
  try {
    const { email, userToken } = await request.json()
    const normalized = String(email || "").toLowerCase().trim()
    if (!normalized || !userToken) return NextResponse.json({ error: "Email and userToken required" }, { status: 400 })

    const { address, walletId } = await waitForCircleWallet(userToken)

    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from("workers")
      .update({ wallet_address: address, circle_wallet_id: walletId })
      .eq("email", normalized)
      .select("id")
      .single()
    if (error) throw error

    return NextResponse.json({ walletAddress: address })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save wallet" }, { status: 500 })
  }
}
