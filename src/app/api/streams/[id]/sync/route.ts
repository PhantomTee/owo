import { NextResponse } from "next/server"
import { getStreamOnChain } from "@/lib/contract"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const streamId = BigInt(params.id)
    const stream = await getStreamOnChain(streamId)

    const { error } = await getSupabaseAdmin()
      .from("streams")
      .update({
        employer_wallet: stream.employer.toLowerCase(),
        rate_per_second: stream.ratePerSecond.toString(),
        start_time: new Date(Number(stream.startTime) * 1000).toISOString(),
        active: stream.active
      })
      .eq("id", Number(stream.id))

    if (error) throw error
    return NextResponse.json({ ok: true, active: stream.active })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
