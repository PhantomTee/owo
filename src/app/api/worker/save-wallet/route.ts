import { NextResponse } from "next/server"
import { getCircleWalletAddress } from "@/lib/circle"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { email, userToken } = await request.json()
    const normalized = String(email || "").toLowerCase().trim()
    if (!normalized || !userToken) return NextResponse.json({ error: "Email and userToken required" }, { status: 400 })

    const { address, walletId } = await getCircleWalletAddress(userToken)

    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from("workers")
      .update({ wallet_address: address, circle_wallet_id: walletId })
      .eq("email", normalized)
    if (error) throw error

    return NextResponse.json({ walletAddress: address })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save wallet" }, { status: 500 })
  }
}
