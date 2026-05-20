import { NextResponse } from "next/server"
import { getEarnedSoFar } from "@/lib/contract"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const streamId = BigInt(params.id)
    const { txHash, amountUsdc } = await request.json()
    if (!txHash) return NextResponse.json({ error: "txHash required" }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from("payment_logs").insert({
      stream_id: Number(streamId),
      amount_usdc: amountUsdc ?? null,
      tx_hash: txHash
    })
    if (error) throw error

    const remaining = await getEarnedSoFar(streamId)
    return NextResponse.json({ ok: true, remainingEarned: remaining.toString() })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
