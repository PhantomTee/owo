"use client"

import { useEffect, useState } from "react"

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
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#12140f] px-5 py-8 font-mono text-[#e8f2d8]">
      <section className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-4xl text-gold">Owo Agent Monitor</h1>
          <span className="flex items-center gap-2 text-sm text-green-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-300" /> Agent is watching 24/7
          </span>
        </div>
        {loading && <Panel title="Loading"><Line>Loading agent runs from Supabase...</Line></Panel>}
        {error && <Panel title="Error"><Line>{error}</Line></Panel>}
        {!loading && !error && (
          <>
            <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_1fr]">
              <Panel title="Last 20 Runs">
                {data.logs.length === 0 && <Line>No agent runs yet.</Line>}
                {data.logs.map((log) => (
                  <Line key={log.id}>{new Date(log.ran_at).toISOString()} checked={log.streams_checked} alerts={log.alerts_created}</Line>
                ))}
              </Panel>
              <Panel title="Active Stream Health">
                {data.streams.length === 0 && <Line>No active streams yet.</Line>}
                {data.streams.map((stream) => (
                  <Line key={stream.id}>stream #{stream.id} active={String(stream.active)} rate={stream.rate_per_second}</Line>
                ))}
              </Panel>
            </div>
            <Panel title="Recent Groq Reasoning" className="mt-5">
              {data.alerts.length === 0 && <Line>No alerts yet.</Line>}
              {data.alerts.map((alert) => (
                <Line key={alert.id}>[{alert.alert_type}] stream #{alert.stream_id}: {alert.groq_reasoning || alert.message}</Line>
              ))}
            </Panel>
          </>
        )}
      </section>
    </main>
  )
}

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`mt-8 rounded-lg border border-[#3a4d33] bg-black/30 p-5 ${className}`}>
      <h2 className="mb-4 text-sm uppercase tracking-[0.22em] text-gold">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Line({ children }: { children: React.ReactNode }) {
  return <p className="break-words text-sm leading-6 text-[#dce8ce]">&gt; {children}</p>
}
