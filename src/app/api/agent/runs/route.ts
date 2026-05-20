import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const [logs, alerts, streams] = await Promise.all([
      supabase.from("agent_logs").select("*").order("ran_at", { ascending: false }).limit(20),
      supabase.from("alerts").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("streams").select("id, active, rate_per_second").order("created_at", { ascending: false }).limit(50)
    ])
    if (logs.error) throw logs.error
    if (alerts.error) throw alerts.error
    if (streams.error) throw streams.error
    return NextResponse.json({ logs: logs.data || [], alerts: alerts.data || [], streams: streams.data || [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
