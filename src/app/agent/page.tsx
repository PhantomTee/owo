"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AgentPanelSkeleton } from "@/components/skeleton"

type AgentData = {
  logs: Array<{ id: string; ran_at: string; streams_checked: number; alerts_created: number }>
  alerts: Array<{ id: string; alert_type: string; stream_id: number; groq_reasoning: string | null; message: string | null }>
  streams: Array<{ id: number; active: boolean; rate_per_second: string }>
}

export default function AgentPage() {
  const [data, setData] = useState<AgentData>({ logs: [], alerts: [], streams: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const res = await fetch("/api/agent/runs", { cache: "no-store" })
        const next = await res.json()
        if (next.error) throw new Error(next.error)
        if (!cancelled) setData(next)
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Failed to load agent data")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <main className="min-h-screen bg-[#12140f] px-4 py-8 font-mono text-[#e8f2d8] sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-md border border-[#3a4d33] px-3 py-1.5 text-sm text-[#a8c090] transition-colors hover:border-gold hover:text-gold"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
            <h1 className="font-heading text-2xl text-gold sm:text-4xl">AI Agent Monitor</h1>
          </div>
          <span className="flex items-center gap-2 text-sm text-green-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-300" /> Watching 24/7
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
            &gt; Error: {error}
          </div>
        )}

        {/* Grid */}
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <Panel title="Last 20 Runs">
            {loading ? (
              <AgentPanelSkeleton />
            ) : data.logs.length === 0 ? (
              <Line>No runs yet. The agent fires every 10 minutes.</Line>
            ) : (
              data.logs.map((log) => (
                <Line key={log.id}>
                  {new Date(log.ran_at).toLocaleString()} · checked={log.streams_checked} · alerts={log.alerts_created}
                </Line>
              ))
            )}
          </Panel>

          <Panel title="Active Stream Health">
            {loading ? (
              <AgentPanelSkeleton />
            ) : data.streams.length === 0 ? (
              <Line>No active streams yet.</Line>
            ) : (
              data.streams.map((stream) => (
                <Line key={stream.id}>
                  stream #{stream.id} · active={String(stream.active)} · rate={stream.rate_per_second}/s
                </Line>
              ))
            )}
          </Panel>
        </div>

        <Panel title="AI Agent Analysis" className="mt-5">
          {loading ? (
            <AgentPanelSkeleton />
          ) : data.alerts.length === 0 ? (
            <Line>No alerts yet. All streams appear healthy.</Line>
          ) : (
            data.alerts.map((alert) => (
              <Line key={alert.id}>
                [{alert.alert_type}] stream #{alert.stream_id}: {alert.message || alert.groq_reasoning}
              </Line>
            ))
          )}
        </Panel>

      </section>
    </main>
  )
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-[#3a4d33] bg-black/30 p-5 ${className}`}>
      <h2 className="mb-4 text-xs uppercase tracking-[0.22em] text-gold">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Line({ children }: { children: React.ReactNode }) {
  return <p className="break-all text-sm leading-6 text-[#dce8ce]">&gt; {children}</p>
}
