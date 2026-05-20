import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    const normalized = String(email || "").toLowerCase().trim()
    if (!normalized) return NextResponse.json({ error: "Email required" }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { data: worker, error } = await supabase
      .from("workers")
      .select("circle_user_id")
      .eq("email", normalized)
      .single()
    if (error || !worker?.circle_user_id) return NextResponse.json({ error: "Worker not found" }, { status: 404 })

    const apiKey = process.env.CIRCLE_API_KEY
    const baseUrl = process.env.CIRCLE_W3S_BASE_URL
    if (!apiKey || !baseUrl) throw new Error("Missing CIRCLE_API_KEY or CIRCLE_W3S_BASE_URL")

    const res = await fetch(`${baseUrl}/users/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ userId: worker.circle_user_id })
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.message || `Circle token request failed: ${res.status}`)

    return NextResponse.json({ userToken: json.data?.userToken })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
