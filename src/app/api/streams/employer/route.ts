import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const wallet = new URL(request.url).searchParams.get("wallet")?.toLowerCase()
    if (!wallet) return NextResponse.json({ error: "wallet is required" }, { status: 400 })
    const { data, error } = await getSupabaseAdmin()
      .from("streams")
      .select("*, workers(name,email,job_title,wallet_address)")
      .eq("employer_wallet", wallet)
      .order("created_at", { ascending: false })
    if (error) throw error
    return NextResponse.json({ streams: data || [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
