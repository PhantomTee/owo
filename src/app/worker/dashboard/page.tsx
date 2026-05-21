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

const APP_ID = process.env.NEXT_PUBLIC_CIRCLE_APP_ID as string

type WorkerState = {
  worker: { email: string; name: string; wallet_address: string }
  streams: Array<{ id: number; monthly_salary_usd: string; start_time: string; rate_per_second: string }>
  payments: Array<{ id: string; stream_id: number; amount_usdc: string; tx_hash: string; withdrawn_at: string }>
}

type Step = "email" | "setup" | "dashboard"

export default function WorkerDashboardPage() {
  return <ErrorBoundary><WorkerDashboard /></ErrorBoundary>
}

function WorkerDashboard() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [data, setData] = useState<WorkerState | null>(null)
  const [payments, setPayments] = useState<WorkerState["payments"]>([])
  const [workerToken, setWorkerToken] = useState("")
  const [encryptionKey, setEncryptionKey] = useState("")
  const [message, setMessage] = useState("")
  const [setupMessage, setSetupMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  const activeStream = data?.streams?.[0]
  const liveBalance = useLiveBalance(activeStream?.id || null)
  const apyBps = Number(process.env.NEXT_PUBLIC_USYC_TESTNET_APY_BPS)

  // ── Step 1: email login ─────────────────────────────────────────────────────
  async function login() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/worker/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      }).then((r) => r.json())

      if (res.error) throw new Error(res.error)

      if (res.needsWalletSetup) {
        if (res.name) { setName(res.name); setJobTitle(res.jobTitle || "") }
        setStep("setup")
        return
      }

      // Fetch Circle token alongside login data
      const tokenRes = await fetch("/api/worker/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      }).then((r) => r.json())

      setData(res)
      setPayments(res.payments)
      if (tokenRes.userToken) setWorkerToken(tokenRes.userToken)
      if (tokenRes.encryptionKey) setEncryptionKey(tokenRes.encryptionKey)
      setStep("dashboard")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Circle PIN wallet setup ────────────────────────────────────────
  async function startWalletSetup() {
    if (!name.trim()) { setError("Please enter your name"); return }
    setLoading(true)
    setError("")
    setSetupMessage("Creating your Circle account…")
    try {
      const res = await fetch("/api/worker/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, jobTitle })
      }).then((r) => r.json())
      if (res.error) throw new Error(res.error)

      const { challengeId, userToken: token, encryptionKey: encKey, alreadyInitialized } = res
      setWorkerToken(token)
      setEncryptionKey(encKey)

      if (alreadyInitialized) {
        // Already initialized but no wallet address saved — just fetch wallet
        setSetupMessage("Fetching your existing wallet…")
        await saveWallet(email, token)
        return
      }

      setSetupMessage("Opening Circle wallet setup — set your PIN when prompted…")
      const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk")
      // Reset singleton so receivedResponseFromService flag is cleared on each attempt
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(W3SSdk as any).instance = null
      const sdk = new W3SSdk({ appSettings: { appId: APP_ID } })
      sdk.setAuthentication({ userToken: token, encryptionKey: encKey })
      await Promise.race([
        new Promise<void>((resolve, reject) => {
          sdk.execute(challengeId, async (err) => {
            if (err) { reject(new Error(err.message ?? "PIN setup failed")); return }
            resolve()
          })
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("PIN dialog did not appear. Your domain must be added as an allowed origin in the Circle developer console (console.circle.com → Programmable Wallets → your app).")),
            15000
          )
        )
      ])

      // Small delay for Circle to index the wallet
      setSetupMessage("Saving your wallet address…")
      await new Promise((r) => setTimeout(r, 2000))
      await saveWallet(email, token)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wallet setup failed")
      setSetupMessage("")
    } finally {
      setLoading(false)
    }
  }

  async function saveWallet(workerEmail: string, token: string) {
    const res = await fetch("/api/worker/save-wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: workerEmail, userToken: token })
    }).then((r) => r.json())
    if (res.error) throw new Error(res.error)

    // Now load full dashboard
    const loginRes = await fetch("/api/worker/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: workerEmail })
    }).then((r) => r.json())
    if (loginRes.error) throw new Error(loginRes.error)
    setData(loginRes)
    setPayments(loginRes.payments || [])
    setSetupMessage("")
    setStep("dashboard")
  }

  // ── Step 3: withdraw ────────────────────────────────────────────────────────
  async function withdraw() {
    if (!activeStream || !workerToken) { setMessage("Session expired — please log out and back in."); return }
    setWithdrawing(true)
    setMessage("Requesting withdrawal challenge…")
    try {
      const result = await fetch(`/api/streams/${activeStream.id}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerToken })
      }).then((r) => r.json())
      if (result.error) throw new Error(result.error)

      const { challengeId, claimable } = result
      if (!challengeId) throw new Error("No challenge ID returned")

      setMessage("Opening Circle wallet — enter your PIN to confirm withdrawal…")
      const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(W3SSdk as any).instance = null
      const sdk = new W3SSdk({ appSettings: { appId: APP_ID } })
      sdk.setAuthentication({ userToken: workerToken, encryptionKey })

      await Promise.race([
        new Promise<void>((resolve, reject) => {
          sdk.execute(challengeId, async (err, res) => {
            if (err) { reject(new Error(err.message ?? "Circle challenge failed")); return }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const txHash: string = (res as any)?.data?.txHash ?? (res as any)?.data?.signature ?? ""
            await fetch(`/api/streams/${activeStream.id}/log-withdrawal`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ txHash, amountUsdc: Number(claimable) / 1e6 })
            })
            resolve()
          })
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("PIN dialog did not appear. Your domain must be added as an allowed origin in the Circle developer console.")),
            15000
          )
        )
      ])
      setMessage(`Withdrawal complete! $${formatUsdc(claimable, 6)} USDC sent to your wallet.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Withdrawal failed")
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
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "payment_logs", filter: `stream_id=eq.${activeStream.id}` },
          (payload) => setPayments((cur) => [payload.new as WorkerState["payments"][number], ...cur].slice(0, 10))
        )
        .subscribe()
    } catch { return }
    return () => { if (channel) getSupabaseBrowser().removeChannel(channel) }
  }, [activeStream])

  const totalWithdrawn = useMemo(() => payments.reduce((sum, row) => sum + Number(row.amount_usdc || 0), 0), [payments])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-cream px-4 py-6 text-charcoal sm:px-6">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Brand />
        <a href="/employer/dashboard" className="text-sm font-semibold text-forest">Employer view</a>
      </header>

      {/* ── Email entry ── */}
      {step === "email" && (
        <section className="mx-auto mt-16 max-w-md rounded-lg bg-white/70 p-6 shadow-soft">
          <h1 className="font-heading text-4xl text-forest">Worker login</h1>
          <p className="mt-2 text-sm text-charcoal/60">Enter your work email to access your earnings.</p>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && email && login()}
            type="email"
            placeholder="you@company.com"
            className="mt-6 min-h-12 w-full rounded-md border border-forest/20 px-4 outline-none focus:border-gold"
          />
          <Button onClick={login} className="mt-4 w-full" disabled={loading || !email}>{loading ? "Checking…" : "Continue"}</Button>
          {error && <p className="mt-3 text-sm text-clay">{error}</p>}
        </section>
      )}

      {/* ── Circle wallet setup ── */}
      {step === "setup" && (
        <section className="mx-auto mt-16 max-w-md rounded-lg bg-white/70 p-6 shadow-soft">
          <h1 className="font-heading text-4xl text-forest">Set up your wallet</h1>
          <p className="mt-2 text-sm leading-6 text-charcoal/60">
            Your employer has invited you to Owo. First, create your Circle wallet by setting a PIN. This is a one-time step.
          </p>
          <div className="mt-6 space-y-3">
            {!name && (
              <>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="min-h-12 w-full rounded-md border border-forest/20 px-4 outline-none focus:border-gold"
                />
                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Your job title"
                  className="min-h-12 w-full rounded-md border border-forest/20 px-4 outline-none focus:border-gold"
                />
              </>
            )}
          </div>
          <Button onClick={startWalletSetup} className="mt-5 w-full bg-gold text-forest" disabled={loading}>
            <Wallet className="mr-2 h-4 w-4" />
            {loading ? "Setting up…" : "Create wallet & set PIN"}
          </Button>
          {setupMessage && (
            <div className="mt-4 flex items-center gap-2 text-sm text-forest">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-forest" />
              </span>
              {setupMessage}
            </div>
          )}
          {error && <p className="mt-3 text-sm text-clay">{error}</p>}
          <button onClick={() => { setStep("email"); setError("") }} className="mt-4 text-xs text-charcoal/40 hover:text-charcoal/70">← Back</button>
        </section>
      )}

      {/* ── Dashboard ── */}
      {step === "dashboard" && data && (
        <section className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {loading ? <WorkerBalanceSkeleton /> : (
              <div className="rounded-lg bg-forest p-6 text-cream shadow-soft sm:p-8">
                <p className="text-sm opacity-75">Your earned balance</p>
                <h1 className={`mt-2 font-heading text-5xl sm:text-7xl md:text-8xl ${liveBalance.recalibrating ? "recalibrate" : ""}`}>
                  ${liveBalance.display}
                </h1>
                {liveBalance.error && <p className="mt-2 text-sm text-gold">{liveBalance.error}</p>}
                <p className="mt-3 text-sm opacity-80">
                  {activeStream?.start_time ? `streaming since ${new Date(activeStream.start_time).toLocaleDateString()}` : "No active stream yet"}
                </p>
                {/* Wallet address */}
                <div className="mt-4 flex items-center gap-2 rounded-md bg-cream/10 px-3 py-2">
                  <span className="break-all font-mono text-xs opacity-80">{data.worker.wallet_address}</span>
                  <button onClick={copyAddress} className="shrink-0 opacity-70 transition-opacity hover:opacity-100">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {copied && <span className="text-xs text-gold">Copied!</span>}
                </div>
                <div className="mt-6">
                  <Button onClick={withdraw} className="bg-gold text-forest hover:bg-cream" disabled={withdrawing || !workerToken || !activeStream}>
                    <Wallet className="mr-2 h-4 w-4" />
                    {withdrawing ? "Processing…" : "Withdraw All"}
                  </Button>
                </div>
                {message && <p className="mt-4 break-words text-sm leading-6 text-gold">{message}</p>}
              </div>
            )}

            <div className="rounded-lg bg-white/70 p-5 shadow-soft sm:p-6">
              <h2 className="font-heading text-2xl text-forest sm:text-3xl">Payment History</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-charcoal/60"><tr><th className="py-3">Date</th><th>Amount</th><th>Transaction</th></tr></thead>
                  <tbody>
                    {loading && Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="border-t border-forest/10">
                        <td className="py-3"><Skeleton className="h-4 w-32" /></td>
                        <td><Skeleton className="h-4 w-16" /></td>
                        <td><Skeleton className="h-4 w-28" /></td>
                      </tr>
                    ))}
                    {!loading && payments.length === 0 && (
                      <tr><td className="border-t border-forest/10 py-6 text-charcoal/60" colSpan={3}>No payments yet.</td></tr>
                    )}
                    {payments.map((row) => (
                      <tr key={row.id} className="border-t border-forest/10">
                        <td className="py-3">{new Date(row.withdrawn_at).toLocaleString()}</td>
                        <td className="font-semibold">${formatUsdc(row.amount_usdc, 6)}</td>
                        <td>
                          {ARC_EXPLORER && row.tx_hash
                            ? <a className="inline-flex items-center gap-1 text-forest" href={`${ARC_EXPLORER}/tx/${row.tx_hash}`} target="_blank" rel="noreferrer">{row.tx_hash.slice(0, 10)}… <ExternalLink className="h-3 w-3" /></a>
                            : <span className="text-charcoal/40">Pending</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-lg bg-white/70 p-5 shadow-soft sm:p-6">
              <h2 className="font-heading text-2xl text-forest sm:text-3xl">Stream Info</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div><dt className="text-charcoal/70">Name</dt><dd className="font-semibold">{data.worker.name}</dd></div>
                <div><dt className="text-charcoal/70">Rate</dt><dd className="font-semibold">${Number(activeStream?.monthly_salary_usd || 0).toLocaleString()}/month</dd></div>
                <div><dt className="text-charcoal/70">Total withdrawn</dt><dd className="font-semibold">${formatUsdc(totalWithdrawn)}</dd></div>
              </dl>
            </div>
            <div className="rounded-lg bg-gold/20 p-5 shadow-soft sm:p-6">
              <h2 className="font-heading text-2xl text-forest sm:text-3xl">USYC Yield</h2>
              <p className="mt-3 text-sm leading-6">Idle buffer earns yield via testnet USYC. Est. APY: {(apyBps / 100).toFixed(2)}%.</p>
              <p className="mt-3 font-semibold">Est. monthly: ${(Number(liveBalance.display) * (apyBps / 10000) / 12).toFixed(4)}</p>
            </div>
            <button onClick={() => { setStep("email"); setData(null); setEmail(""); setWorkerToken(""); setEncryptionKey("") }}
              className="w-full rounded-md border border-forest/20 bg-white/70 py-2 text-sm font-semibold text-forest shadow-soft hover:bg-forest/5">
              Log out
            </button>
          </aside>
        </section>
      )}
    </main>
  )
}
