import { NextResponse } from "next/server"
import { getEarnedSoFar, getVerifiedWithdrawal } from "@/lib/contract"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const streamId = BigInt(params.id)
    const { txHash } = await request.json()
    if (!txHash) return NextResponse.json({ error: "txHash required" }, { status: 400 })

    const withdrawal = await getVerifiedWithdrawal(String(txHash), streamId)
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from("payment_logs").insert({
      stream_id: Number(streamId),
      amount_usdc: withdrawal.amount.toString(),
      tx_hash: withdrawal.txHash
    })
    if (error?.code === "23505") {
      const remaining = await getEarnedSoFar(streamId)
      return NextResponse.json({ ok: true, duplicate: true, remainingEarned: remaining.toString() })
    }
    if (error) throw error

    const remaining = await getEarnedSoFar(streamId)
    return NextResponse.json({ ok: true, remainingEarned: remaining.toString() })
  } catch (error) {
    const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 500
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status })
  }
}
