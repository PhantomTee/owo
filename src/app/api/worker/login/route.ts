import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    const normalized = String(email || "").toLowerCase().trim()
    if (!normalized) return NextResponse.json({ error: "Email is required" }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { data: worker, error } = await supabase.from("workers").select("*").eq("email", normalized).single()
    if (error) throw error
    const { data: streams } = await supabase
      .from("streams")
      .select("*")
      .eq("worker_id", worker.id)
      .order("created_at", { ascending: false })
    const { data: payments } = await supabase
      .from("payment_logs")
      .select("*")
      .in("stream_id", (streams || []).map((s) => s.id))
      .order("withdrawn_at", { ascending: false })
      .limit(10)

    return NextResponse.json({ worker, streams: streams || [], payments: payments || [] })
  } catch (error) {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 })
  }
}
