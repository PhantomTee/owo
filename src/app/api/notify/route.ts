import { NextResponse } from "next/server"
import { requireInternalRequest } from "@/lib/api-auth"
import { getResend } from "@/lib/resend"

export async function POST(request: Request) {
  try {
    const unauthorized = requireInternalRequest(request)
    if (unauthorized) return unauthorized

    const { to, name, hours, dashboardUrl } = await request.json()
    if (!to) return NextResponse.json({ error: "Missing recipient" }, { status: 400 })
    const resend = getResend()
    const sent = await resend.emails.send({
      from: process.env.RESEND_FROM || "Owo <alerts@example.com>",
      to,
      subject: "Owo salary stream buffer is low",
      text: `Your employee ${name}'s salary stream will run dry in ${hours} hours. Please deposit more USDC to continue payments. ${dashboardUrl || ""}`
    })
    return NextResponse.json(sent)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
