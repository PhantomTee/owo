import Groq from "groq-sdk"

let client: Groq | null = null

export function getGroq() {
  if (client) return client
  if (!process.env.GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY")
  client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return client
}
