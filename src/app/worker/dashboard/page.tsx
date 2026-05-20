"use client"

import { useEffect, useMemo, useState } from "react"
import { ExternalLink, Wallet } from "lucide-react"
import { Brand } from "@/components/brand"
import { Button } from "@/components/button"
import { ARC_EXPLORER } from "@/lib/constants"
import { formatUsdc } from "@/lib/money"
import { getSupabaseBrowser } from "@/lib/supabase"
import { useLiveBalance } from "@/hooks/useLiveBalance"

type WorkerState = {
  worker: { email: string; name: string; wallet_address: string }
  streams: Array<{ id: number; monthly_salary_usd: string; start_time: string; rate_per_second: string }>
  payments: Array<{ id: string; stream_id: number; amount_usdc: string; tx_hash: string; withdrawn_at: string }>
}

export default function WorkerDashboard() {
  const [email, setEmail] = useState("")
  const [data, setData] = useState<WorkerState | null>(null)
  const [payments, setPayments] = useState<WorkerState["payments"]>([])
  const [workerToken, setWorkerToken] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [error, setError] = useState("")
  const activeStream = data?.streams?.[0]
  const liveBalance = useLiveBalance(activeStream?.id || null)
  const apyBps = Number(process.env.NEXT_PUBLIC_USYC_TESTNET_APY_BPS)

  async function login() {
    setLoading(true)
    setError("")
    setWorkerToken("")
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
    setMessage("")
    try {
      const result = await fetch(`/api/streams/${activeStream.id}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerToken })
      }).then((r) => r.json())
      if (result.error) throw new Error(result.error)

      // Circle challenge created — log the withdrawal intent.
      // The actual on-chain settlement happens after the Circle SDK executes the challenge.
      // If a tx hash is available from Circle's callback, call /api/streams/[id]/log-withdrawal.
      setMessage(
        `Withdrawal initiated. Challenge ID: ${result.challengeId ?? "—"}. ` +
        `Amount: $${formatUsdc(result.claimable ?? 0, 6)} USDC. ` +
        `Complete signing in your Circle wallet to settle on-chain.`
      )
    } catch (withdrawError) {
      setMessage(withdrawError instanceof Error ? withdrawError.message : "Withdrawal failed")
    } finally {
      setWithdrawing(false)
    }
  }

  useEffect(() => {
    if (!activeStream) return
    let channel: ReturnType<ReturnType<typeof getSupabaseBrowser>["channel"]> | null = null
    try {
      const supabase = getSupabaseBrowser()
      channel = supabase
        .channel(`payment_logs:${activeStream.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "payment_logs", filter: `stream_id=eq.${activeStream.id}` },
          (payload) => setPayments((current) => [payload.new as WorkerState["payments"][number], ...current].slice(0, 10))
        )
        .subscribe()
    } catch {
      return
    }
    return () => {
      if (channel) getSupabaseBrowser().removeChannel(channel)
    }
  }, [activeStream])

  const totalWithdrawn = useMemo(() => payments.reduce((sum, row) => sum + Number(row.amount_usdc || 0), 0), [payments])

  return (
    <main className="min-h-screen bg-cream px-5 py-6 text-charcoal">
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
            onChange={(event) => setEmail(event.target.value)}
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
        <section className="mx-auto mt-10 grid max-w-6xl gap-6 lg:grid-cols-[1fr_380px]">
          <div>
            <div className="rounded-lg bg-forest p-8 text-cream shadow-soft">
              <p className="text-sm opacity-75">Your Balance</p>
              <h1 className={`mt-3 font-heading text-6xl md:text-8xl ${liveBalance.recalibrating ? "recalibrate" : ""}`}>
                ${liveBalance.display}
              </h1>
              {liveBalance.loading && <p className="mt-2 text-sm text-gold">Syncing on-chain balance…</p>}
              {liveBalance.error && <p className="mt-2 text-sm text-gold">{liveBalance.error}</p>}
              <p className="mt-3 opacity-80">
                {activeStream?.start_time
                  ? `earned since ${new Date(activeStream.start_time).toLocaleDateString()}`
                  : "No active stream yet"}
              </p>
              {!workerToken && (
                <p className="mt-4 text-sm text-gold/80">Circle wallet token missing — withdrawals may fail. Try logging out and back in.</p>
              )}
              <div className="mt-7">
                <Button
                  onClick={withdraw}
                  className="bg-gold text-forest hover:bg-cream"
                  disabled={withdrawing || !workerToken || !activeStream}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  {withdrawing ? "Creating challenge…" : "Withdraw All"}
                </Button>
              </div>
              {message && <p className="mt-4 text-sm leading-6 text-gold">{message}</p>}
            </div>

            <div className="mt-6 rounded-lg bg-white/70 p-6 shadow-soft">
              <h2 className="font-heading text-3xl text-forest">Payment History</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="text-charcoal/60">
                    <tr>
                      <th className="py-3">Date</th>
                      <th>Amount</th>
                      <th>Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 && (
                      <tr>
                        <td className="border-t border-forest/10 py-6 text-charcoal/60" colSpan={3}>
                          No payments yet.
                        </td>
                      </tr>
                    )}
                    {payments.map((row) => (
                      <tr key={row.id} className="border-t border-forest/10">
                        <td className="py-3">{new Date(row.withdrawn_at).toLocaleString()}</td>
                        <td>${formatUsdc(row.amount_usdc, 6)}</td>
                        <td>
                          {ARC_EXPLORER && row.tx_hash ? (
                            <a
                              className="inline-flex items-center gap-1 text-forest"
                              href={`${ARC_EXPLORER}/tx/${row.tx_hash}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {row.tx_hash.slice(0, 12)}… <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-charcoal/50">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-lg bg-white/70 p-6 shadow-soft">
              <h2 className="font-heading text-3xl text-forest">Stream Info</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-charcoal/70">Name</dt>
                  <dd className="font-semibold">{data.worker.name}</dd>
                </div>
                <div>
                  <dt className="text-charcoal/70">Worker wallet</dt>
                  <dd className="break-all font-mono text-xs">{data.worker.wallet_address}</dd>
                </div>
                <div>
                  <dt className="text-charcoal/70">Rate</dt>
                  <dd className="font-semibold">
                    ${Number(activeStream?.monthly_salary_usd || 0).toLocaleString()}/month
                  </dd>
                </div>
                <div>
                  <dt className="text-charcoal/70">Total withdrawn</dt>
                  <dd className="font-semibold">${formatUsdc(totalWithdrawn)}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-lg bg-gold/20 p-6 shadow-soft">
              <h2 className="font-heading text-3xl text-forest">USYC Yield</h2>
              <p className="mt-3 text-sm leading-6">
                Idle stream funds above the contract threshold are invested into testnet USYC.
                Estimated APY: {(apyBps / 100).toFixed(2)}%.
              </p>
              <p className="mt-4 font-semibold">
                Est. monthly yield: ${(Number(liveBalance.display) * (apyBps / 10000) / 12).toFixed(4)}
              </p>
            </div>
            <div className="rounded-lg bg-white/70 p-6 shadow-soft">
              <button
                onClick={() => { setData(null); setEmail(""); setWorkerToken("") }}
                className="w-full rounded-md border border-forest/20 py-2 text-sm font-semibold text-forest hover:bg-forest/5"
              >
                Log out
              </button>
            </div>
          </aside>
        </section>
      )}
    </main>
  )
}
