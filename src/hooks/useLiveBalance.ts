"use client"

import { useEffect, useRef, useState } from "react"

export function useLiveBalance(streamId: number | null) {
  const [display, setDisplay] = useState("0.000000")
  const [recalibrating, setRecalibrating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const baseRef = useRef(0)
  const rateRef = useRef(0)
  const pollTimeRef = useRef(0)

  useEffect(() => {
    if (!streamId) return
    let cancelled = false
    const poll = async () => {
      setLoading(true)
      setError("")
      try {
        const data = await fetch(`/api/streams/${streamId}/balance`, { cache: "no-store" }).then((r) => r.json())
        if (data.error) throw new Error(data.error)
        if (cancelled) return
        baseRef.current = Number(data.earnedSoFar)
        rateRef.current = Number(data.ratePerSecond)
        pollTimeRef.current = Date.now() / 1000
        setRecalibrating(true)
        window.setTimeout(() => setRecalibrating(false), 900)
      } catch (pollError) {
        if (!cancelled) setError(pollError instanceof Error ? pollError.message : "Failed to load live balance")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    poll()
    const interval = window.setInterval(poll, 30000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [streamId])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const elapsed = Date.now() / 1000 - pollTimeRef.current
      const live = baseRef.current + Math.max(0, elapsed) * rateRef.current
      setDisplay((live / 1e6).toFixed(6))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return { display, recalibrating, loading, error }
}
