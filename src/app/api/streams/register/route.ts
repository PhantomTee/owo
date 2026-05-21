import { NextResponse } from "next/server"
import { getStreamOnChain } from "@/lib/contract"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const streamId = BigInt(body.streamId)
    const workerId = String(body.workerId || "")
    const monthlySalaryUSD = Number(body.monthlySalaryUSD)
    if (!workerId || !Number.isFinite(monthlySalaryUSD) || monthlySalaryUSD <= 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    const stream = await getStreamOnChain(streamId)

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from("streams").upsert({
      id: Number(stream.id),
      employer_wallet: stream.employer.toLowerCase(),
      worker_id: workerId,
      rate_per_second: stream.ratePerSecond.toString(),
      monthly_salary_usd: monthlySalaryUSD,
      start_time: new Date(Number(stream.startTime) * 1000).toISOString(),
      active: stream.active
    })
    if (error) throw error
    return NextResponse.json({ ok: true, streamId: stream.id.toString() })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
