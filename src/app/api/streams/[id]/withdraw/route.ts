import { NextResponse } from "next/server"
import { createCircleWithdrawChallenge } from "@/lib/circle"
import { getEarnedSoFar, requireContractAddress } from "@/lib/contract"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const streamId = BigInt(params.id)
    const { workerToken } = await request.json()
    if (!workerToken) return NextResponse.json({ error: "Missing worker Circle user token" }, { status: 400 })

    const earned = await getEarnedSoFar(streamId)
    if (earned <= 0n) return NextResponse.json({ error: "Stream depleted" }, { status: 409 })

    const supabase = getSupabaseAdmin()
    const { data: streamRow, error } = await supabase
      .from("streams")
      .select("worker_id, workers(circle_wallet_id)")
      .eq("id", Number(streamId))
      .single()
    if (error) throw error

    const workers = streamRow.workers as { circle_wallet_id?: string } | Array<{ circle_wallet_id?: string }> | null
    const walletId = Array.isArray(workers) ? workers[0]?.circle_wallet_id : workers?.circle_wallet_id
    if (!walletId) throw new Error("Worker Circle wallet id is missing")

    const challenge = await createCircleWithdrawChallenge({
      userToken: workerToken,
      walletId,
      contractAddress: requireContractAddress(),
      streamId
    })

    return NextResponse.json({
      claimable: earned.toString(),
      challengeId: challenge.data?.challengeId,
      status: "CHALLENGE_CREATED"
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
