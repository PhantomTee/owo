import { NextResponse } from "next/server"

export function requireInternalRequest(request: Request) {
  const expected = process.env.OWO_INTERNAL_API_KEY
  if (!expected) return null

  const token = request.headers.get("x-owo-api-key") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (token === expected) return null

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
