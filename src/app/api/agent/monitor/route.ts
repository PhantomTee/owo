import { NextResponse } from "next/server"
import { requireInternalRequest } from "@/lib/api-auth"
import { getGroq } from "@/lib/groq"
import { getStreamOnChain } from "@/lib/contract"
import { getSupabaseAdmin } from "@/lib/supabase"

type MonitorResult = {
  alert: boolean
  alertType: "LOW_BUFFER" | "STREAM_PAUSED" | "HEALTHY"
  message: string
  urgencyHours: number
}

export async function POST(request: Request) {
  try {
    const unauthorized = requireInternalRequest(request)
    if (unauthorized) return unauthorized

    const supabase = getSupabaseAdmin()
    const groq = getGroq()
    if (!process.env.GROQ_MODEL) throw new Error("Missing GROQ_MODEL")
    const { data: streams, error } = await supabase.from("streams").select("id, employer_wallet, workers(name,email)")
    if (error) throw error

    let alertsCreated = 0
    let streamsChecked = 0
    for (const row of streams || []) {
      const stream = await getStreamOnChain(BigInt(row.id))
      await supabase.from("streams").update({ active: stream.active }).eq("id", row.id)
      if (!stream.active) continue
      streamsChecked += 1
      const earned = stream.active ? (BigInt(Math.floor(Date.now() / 1000)) - stream.lastWithdrawnAt) * stream.ratePerSecond : BigInt(0)
      const buffer = stream.depositedAmount - stream.withdrawnAmount - (earned > BigInt(0) ? earned : BigInt(0))
      const urgencyHours = stream.ratePerSecond > BigInt(0) ? Number(buffer / stream.ratePerSecond) / 3600 : 999999
      const rate = Number(stream.ratePerSecond) / 1e6

      const completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a payroll health monitoring AI. Analyze this salary stream and determine if any action is needed. Reply in JSON only: { \"alert\": boolean, \"alertType\": \"LOW_BUFFER\"|\"STREAM_PAUSED\"|\"HEALTHY\", \"message\": string, \"urgencyHours\": number }. No markdown."
          },
          {
            role: "user",
            content: `Stream ID ${row.id}. Worker: ${stream.workerName}. Rate: $${rate}/sec. Buffer remaining: ${Number(buffer) / 1e6} USDC. Time until empty: ${urgencyHours} hours. Stream active: ${stream.active}.`
          }
        ]
      })

      const content = completion.choices[0]?.message?.content || "{}"
      const result = JSON.parse(content) as MonitorResult
      if (result.alert && result.urgencyHours < 48) {
        await supabase.from("alerts").insert({
          stream_id: row.id,
          alert_type: result.alertType,
          message: result.message,
          groq_reasoning: content
        })
        alertsCreated += 1

        const alertTo = process.env.RESEND_ALERT_TO
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
        if (alertTo) {
          await fetch(`${baseUrl}/api/notify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(process.env.OWO_INTERNAL_API_KEY ? { "x-owo-api-key": process.env.OWO_INTERNAL_API_KEY } : {})
            },
            body: JSON.stringify({
              to: alertTo,
              name: stream.workerName,
              hours: Math.round(result.urgencyHours),
              dashboardUrl: `${baseUrl}/employer/dashboard`
            })
          })
        }
      }
    }

    await supabase.from("agent_logs").insert({
      streams_checked: streamsChecked,
      alerts_created: alertsCreated
    })

    return NextResponse.json({ streamsChecked, alertsCreated })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
