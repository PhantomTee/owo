"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, ExternalLink, Wallet } from "lucide-react"
import { Brand } from "@/components/brand"
import { Button } from "@/components/button"
import { ErrorBoundary } from "@/components/error-boundary"
import { Skeleton, WorkerBalanceSkeleton } from "@/components/skeleton"
import { ARC_EXPLORER } from "@/lib/constants"
import { formatUsdc } from "@/lib/money"
import { getSupabaseBrowser } from "@/lib/supabase"
import { useLiveBalance } from "@/hooks/useLiveBalance"

type WorkerState = {
  worker: { email: string; name: string; wallet_address: string }
  streams: Array<{ id: number; monthly_salary_usd: string; start_time: string; rate_per_second: string }>
  payments: Array<{ id: string; stream_id: number; amount_usdc: string; tx_hash: string; withdrawn_at: string }>
}

export default function WorkerDashboardPage() {
  return (
    <ErrorBoundary>
      <WorkerDashboard />
    </ErrorBoundary>
  )
}

function WorkerDashboard() {
  const [email, setEmail] = useState("")
  const [data, setData] = useState<WorkerState | null>(null)
  const [payments, setPayments] = useState<WorkerState["payments"]>([])
  const [workerToken, setWorkerToken] = useState("")
  const [encryptionKey, setEncryptionKey] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const activeStream = data?.streams?.[0]
  const liveBalance = useLiveBalance(activeStream?.id || null)
  const apyBps = Number(process.env.NEXT_PUBLIC_USYC_TESTNET_APY_BPS)
  const appId = process.env.NEXT_PUBLIC_CIRCLE_APP_ID

  async function login() {
    setLoading(true)
    setError("")
    setWorkerToken("")
    setEncryptionKey("")
    try {
      const [loginRes, tokenRes] = await Promise.all([
        fetch("/api/worker/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        }).then((r) => r.json()),
        fetch("/api/worker/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        }).then((r) => r.json())
      ])
      if (loginRes.error) throw new Error(loginRes.error)
      setData(loginRes)
      setPayments(loginRes.payments)
      if (tokenRes.userToken) setWorkerToken(tokenRes.userToken)
      if (tokenRes.encryptionKey) setEncryptionKey(tokenRes.encryptionKey)
      setMessage("")
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Worker login failed")
    } finally {
      setLoading(false)
    }
  }

  async function withdraw() {
    if (!activeStream || !workerToken) {
      setMessage("Circle token is missing — try logging in again.")
      return
    }
    setWithdrawing(true)
    setMessage("Requesting withdrawal challenge…")
    try {
      const result = await fetch(`/api/streams/${activeStream.id}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerToken })
      }).then((r) => r.json())
      if (result.error) throw new Error(result.error)

      const challengeId: string = result.challengeId
      const claimable: string = result.claimable ?? "0"

      if (!challengeId) throw new Error("No challenge ID returned from server")

      if (!appId) {
        setMessage(
          `Challenge created (ID: ${challengeId}). ` +
          `Add NEXT_PUBLIC_CIRCLE_APP_ID to env to enable in-browser signing.`
        )
        return
      }

      setMessage("Opening Circle wallet — please complete signing…")

      // Execute Circle challenge in the browser using their SDK
      const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk")
      const sdk = new W3SSdk()
      sdk.setAppSettings({ appId })
      sdk.setAuthentication({ userToken: workerToken, encryptionKey })

      await new Promise<void>((resolve, reject) => {
        sdk.execute(challengeId, async (err, res) => {
          if (err) { reject(new Error(err.message ?? "Circle challenge failed")); return }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = res as any
          const txHash: string = result?.data?.txHash ?? result?.data?.signature ?? ""
          await fetch(`/api/streams/${activeStream.id}/log-withdrawal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ txHash, amountUsdc: Number(claimable) / 1e6 })
          })
          resolve()
        })
      })

      setMessage(`Withdrawal complete! $${formatUsdc(claimable, 6)} USDC sent to your wallet.`)
    } catch (withdrawError) {
      setMessage(withdrawError instanceof Error ? withdrawError.message : "Withdrawal failed")
    } finally {
      setWithdrawing(false)
    }
  }

  function copyAddress() {
    if (!data?.worker.wallet_address) return
    navigator.clipboard.writeText(data.worker.wallet_address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (!activeStream) return
    let channel: ReturnType<ReturnType<typeof getSupabaseBrowser>["channel"]> | null = null
    try {
      const supabase = getSupabaseBrowser()
      channel = supabase
        .channel(`payment_logs:${activeStream.id}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "payment_logs",
          filter: `stream_id=eq.${activeStream.id}`
        }, (payload) =>
          setPayments((cur) => [payload.new as WorkerState["payments"][number], ...cur].slice(0, 10))
        )
        .subscribe()
    } catch { return }
    return () => { if (channel) getSupabaseBrowser().removeChannel(channel) }
  }, [activeStream])

  const totalWithdrawn = useMemo(
    () => payments.reduce((sum, row) => sum + Number(row.amount_usdc || 0), 0),
    [payments]
  )

  return (
    <main className="min-h-screen bg-cream px-4 py-6 text-charcoal sm:px-6">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Brand />
        <a href="/employer/dashboard" className="text-sm font-semibold text-forest">Employer view</a>
      </header>

      {!data ? (
        <section className="mx-auto mt-16 max-w-md rounded-lg bg-white/70 p-6 shadow-soft">
          <h1 className="font-heading text-4xl text-forest">Worker login</h1>
          <p className="mt-2 text-sm text-charcoal/60">Enter the email your employer registered you with.</p>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && login()}
            type="email"
            placeholder="you@company.com"
            className="mt-6 min-h-12 w-full rounded-md border border-forest/20 px-4 outline-none focus:border-gold"
          />
          <Button onClick={login} className="mt-4 w-full" disabled={loading || !email}>
            {loading ? "Loading…" : "Continue"}
          </Button>
          {error && <p className="mt-3 text-sm text-clay">{error}</p>}
        </section>
      ) : (
        <section className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Balance card */}
            {loading ? <WorkerBalanceSkeleton /> : (
              <div className="rounded-lg bg-forest p-6 text-cream shadow-soft sm:p-8">
                <p className="text-sm opacity-75">Your earned balance</p>
                <h1 className={`mt-2 font-heading text-5xl sm:text-7xl md:text-8xl ${liveBalance.recalibrating ? "recalibrate" : ""}`}>
                  ${liveBalance.display}
                </h1>
                {liveBalance.error && <p className="mt-2 text-sm text-gold">{liveBalance.error}</p>}
                <p className="mt-3 opacity-80 text-sm">
                  {activeStream?.start_time
                    ? `streaming since ${new Date(activeStream.start_time).toLocaleDateString()}`
                    : "No active stream"}
                </p>
                {/* Wallet address */}
                <div className="mt-4 flex items-center gap-2 rounded-md bg-cream/10 px-3 py-2">
                  <span className="font-mono text-xs opacity-80 break-all">{data.worker.wallet_address}</span>
                  <button onClick={copyAddress} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {copied && <span className="text-xs text-gold">Copied!</span>}
                </div>
                {!workerToken && (
                  <p className="mt-3 text-xs text-gold/80">Circle session expired — log out and back in to withdraw.</p>
                )}
                <div className="mt-6">
                  <Button
                    onClick={withdraw}
                    className="bg-gold text-forest hover:bg-cream"
                    disabled={withdrawing || !workerToken || !activeStream}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    {withdrawing ? "Processing…" : "Withdraw All"}
                  </Button>
                </div>
                {message && <p className="mt-4 text-sm leading-6 text-gold break-words">{message}</p>}
              </div>
            )}

            {/* Payment history */}
            <div className="rounded-lg bg-white/70 p-5 shadow-soft sm:p-6">
              <h2 className="font-heading text-2xl text-forest sm:text-3xl">Payment History</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-charcoal/60">
                    <tr>
                      <th className="py-3">Date</th>
                      <th>Amount</th>
                      <th>Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-t border-forest/10">
                        <td className="py-3"><Skeleton className="h-4 w-32" /></td>
                        <td><Skeleton className="h-4 w-16" /></td>
                        <td><Skeleton className="h-4 w-28" /></td>
                      </tr>
                    ))}
                    {!loading && payments.length === 0 && (
                      <tr>
                        <td className="border-t border-forest/10 py-6 text-charcoal/60" colSpan={3}>
                          No payments yet. Click Withdraw All to claim your earnings.
                        </td>
                      </tr>
                    )}
                    {payments.map((row) => (
                      <tr key={row.id} className="border-t border-forest/10">
                        <td className="py-3">{new Date(row.withdrawn_at).toLocaleString()}</td>
                        <td className="font-semibold">${formatUsdc(row.amount_usdc, 6)}</td>
                        <td>
                          {ARC_EXPLORER && row.tx_hash ? (
                            <a className="inline-flex items-center gap-1 text-forest"
                              href={`${ARC_EXPLORER}/tx/${row.tx_hash}`}
                              target="_blank" rel="noreferrer">
                              {row.tx_hash.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-charcoal/40">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            <div className="rounded-lg bg-white/70 p-5 shadow-soft sm:p-6">
              <h2 className="font-heading text-2xl text-forest sm:text-3xl">Stream Info</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div><dt className="text-charcoal/70">Name</dt><dd className="font-semibold">{data.worker.name}</dd></div>
                <div><dt className="text-charcoal/70">Rate</dt>
                  <dd className="font-semibold">${Number(activeStream?.monthly_salary_usd || 0).toLocaleString()}/month</dd>
                </div>
                <div><dt className="text-charcoal/70">Total withdrawn</dt>
                  <dd className="font-semibold">${formatUsdc(totalWithdrawn)}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg bg-gold/20 p-5 shadow-soft sm:p-6">
              <h2 className="font-heading text-2xl text-forest sm:text-3xl">USYC Yield</h2>
              <p className="mt-3 text-sm leading-6">
                Idle buffer earns yield via testnet USYC. Est. APY: {(apyBps / 100).toFixed(2)}%.
              </p>
              <p className="mt-3 font-semibold">
                Est. monthly: ${(Number(liveBalance.display) * (apyBps / 10000) / 12).toFixed(4)}
              </p>
            </div>

            <button
              onClick={() => { setData(null); setEmail(""); setWorkerToken(""); setEncryptionKey("") }}
              className="w-full rounded-md border border-forest/20 bg-white/70 py-2 text-sm font-semibold text-forest shadow-soft hover:bg-forest/5"
            >
              Log out
            </button>
          </aside>
        </section>
      )}
    </main>
  )
}
