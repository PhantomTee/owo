"use client"

import { BrowserProvider, Contract, Interface } from "ethers"
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Pause, Plus, Square, Wallet } from "lucide-react"
import type { FormEvent, InputHTMLAttributes } from "react"
import { useEffect, useMemo, useState } from "react"
import { erc20EthersAbi, owoStreamEthersAbi } from "@/lib/abi"
import { ARC_USDC, OWO_CONTRACT } from "@/lib/constants"
import { dryRunLabel, formatUsdc, rateToHourly, rateToMonthly, usdcToBaseUnits } from "@/lib/money"
import { Brand } from "@/components/brand"
import { Button } from "@/components/button"
import { ErrorBoundary } from "@/components/error-boundary"
import { NetworkGuard } from "@/components/network-guard"
import { StreamCardSkeleton } from "@/components/skeleton"
import { ConnectWalletButton, WalletPreloader, WalletProvider } from "@/components/wallet-provider"

type StreamRow = {
  id: number
  rate_per_second: string
  monthly_salary_usd: string
  active: boolean
  workers: { name: string; job_title: string; wallet_address: string } | null
}

type AlertRow = {
  id: string
  message: string
  alert_type: string
  created_at: string
  stream_id: number
}

export default function EmployerDashboardClient() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <NetworkGuard>
          <EmployerDashboardContent />
        </NetworkGuard>
      </WalletProvider>
    </ErrorBoundary>
  )
}

function EmployerDashboardContent() {
  const [address, setAddress] = useState<string | null>(null)
  const [walletReady, setWalletReady] = useState(false)
  const [streams, setStreams] = useState<StreamRow[]>([])
  const [balances, setBalances] = useState<Record<number, { earned: string; remaining: string }>>({})
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [open, setOpen] = useState(false)
  const [depositOpen, setDepositOpen] = useState<number | null>(null)
  const [depositAmount, setDepositAmount] = useState("")
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    async function syncAccounts() {
      if (window.ethereum) {
        const accounts = (await window.ethereum.request({ method: "eth_accounts" })) as string[]
        if (!cancelled) setAddress(accounts[0] || null)
      }
      if (!cancelled) setWalletReady(true)
    }
    syncAccounts()
    const provider = window.ethereum as
      | (typeof window.ethereum & {
          on?: (event: "accountsChanged", listener: (accounts: unknown) => void) => void
          removeListener?: (event: "accountsChanged", listener: (accounts: unknown) => void) => void
        })
      | undefined
    const onAccountsChanged = (accounts: unknown) => {
      setAddress(Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : null)
    }
    provider?.on?.("accountsChanged", onAccountsChanged)
    return () => {
      cancelled = true
      provider?.removeListener?.("accountsChanged", onAccountsChanged)
    }
  }, [])

  const load = async () => {
    if (!address) return
    setLoading(true)
    setError("")
    try {
      const data = await fetch(`/api/streams/employer?wallet=${address}`, { cache: "no-store" }).then((r) => r.json())
      if (data.error) throw new Error(data.error)
      setStreams(data.streams || [])
      const nextBalances: Record<number, { earned: string; remaining: string }> = {}
      await Promise.all(
        (data.streams || []).map(async (stream: StreamRow) => {
          const balance = await fetch(`/api/streams/${stream.id}/balance`, { cache: "no-store" }).then((r) => r.json())
          if (balance.error) throw new Error(balance.error)
          nextBalances[stream.id] = { earned: balance.earnedSoFar, remaining: balance.remainingBuffer }
        })
      )
      setBalances(nextBalances)
      const alertData = await fetch("/api/alerts", { cache: "no-store" }).then((r) => r.json())
      if (alertData.error) throw new Error(alertData.error)
      setAlerts(alertData.alerts || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load employer streams")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = window.setInterval(load, 60000)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  const totals = useMemo(() => {
    return streams.reduce(
      (acc, stream) => {
        const balance = balances[stream.id]
        acc.paid += Number(balance?.earned || 0)
        acc.buffer += Number(balance?.remaining || 0)
        return acc
      },
      { paid: 0, buffer: 0 }
    )
  }, [streams, balances])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      if (!address || !OWO_CONTRACT || !ARC_USDC) throw new Error("Missing connected wallet, contract address, or USDC address.")
      if (!window.ethereum) throw new Error("No injected wallet provider found.")
      const form = new FormData(event.currentTarget)
      const workerEmail = String(form.get("workerEmail"))
      const workerName = String(form.get("workerName"))
      const jobTitle = String(form.get("jobTitle"))
      const monthlySalaryUSD = Number(form.get("monthlySalaryUSD"))
      const initialDeposit = usdcToBaseUnits(String(form.get("initialDeposit")))

      setStatus("Creating Circle wallet for worker…")
      const prepared = await fetch("/api/streams/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerEmail, workerName, jobTitle, monthlySalaryUSD, employerWallet: address })
      }).then((r) => r.json())
      if (prepared.error) throw new Error(prepared.error)

      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const usdc = new Contract(ARC_USDC, erc20EthersAbi, signer)
      const owo = new Contract(OWO_CONTRACT, owoStreamEthersAbi, signer)

      setStatus("Approving USDC spend…")
      const approvalTx = await usdc.approve(OWO_CONTRACT, initialDeposit)
      await approvalTx.wait()

      setStatus("Creating on-chain salary stream…")
      const tx = await owo.createStream(prepared.workerWalletAddress, BigInt(prepared.ratePerSecond), initialDeposit, workerName, jobTitle)
      const receipt = await tx.wait()
      const iface = new Interface(owoStreamEthersAbi)
      const created = receipt.logs
        .map((log: { topics: string[]; data: string }) => {
          try { return iface.parseLog(log) } catch { return null }
        })
        .find((log: ReturnType<Interface["parseLog"]> | null) => log?.name === "StreamCreated")
      const streamId = created?.args.id as bigint | undefined
      if (!streamId) throw new Error("StreamCreated event was not found in receipt")

      setStatus("Registering stream in database…")
      const registered = await fetch("/api/streams/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId: streamId.toString(), workerId: prepared.worker.id, monthlySalaryUSD })
      }).then((r) => r.json())
      if (registered.error) throw new Error(registered.error)

      setStatus(`Stream #${streamId.toString()} created for ${prepared.workerWalletAddress}`)
      setOpen(false)
      await load()
    } catch (submitError) {
      setStatus(submitError instanceof Error ? submitError.message : "Stream creation failed")
    }
  }

  async function depositMore(streamId: number) {
    try {
      if (!OWO_CONTRACT || !ARC_USDC || !window.ethereum) throw new Error("Missing contract address or wallet provider.")
      const amount = usdcToBaseUnits(depositAmount)
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const usdc = new Contract(ARC_USDC, erc20EthersAbi, signer)
      const owo = new Contract(OWO_CONTRACT, owoStreamEthersAbi, signer)
      setStatus("Approving USDC…")
      const approveTx = await usdc.approve(OWO_CONTRACT, amount)
      await approveTx.wait()
      setStatus("Depositing…")
      const tx = await owo.depositMore(BigInt(streamId), amount)
      await tx.wait()
      await fetch(`/api/streams/${streamId}/sync`, { method: "POST" })
      setDepositOpen(null)
      setDepositAmount("")
      setStatus("")
      await load()
    } catch (depositError) {
      setStatus(depositError instanceof Error ? depositError.message : "Deposit failed")
    }
  }

  async function callStream(functionName: "pauseStream" | "resumeStream" | "terminateStream", id: number) {
    try {
      if (!OWO_CONTRACT || !window.ethereum) throw new Error("Missing contract address or wallet provider.")
      const provider = new BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const owo = new Contract(OWO_CONTRACT, owoStreamEthersAbi, signer)
      const tx = await owo[functionName](BigInt(id))
      await tx.wait()
      await fetch(`/api/streams/${id}/sync`, { method: "POST" })
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Stream action failed")
    }
  }

  async function resolveAlert(alertId: string) {
    try {
      await fetch("/api/alerts/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alertId })
      })
      setAlerts((current) => current.filter((a) => a.id !== alertId))
    } catch {
      // silent — UI already removed it optimistically
    }
  }

  if (!walletReady) return <WalletPreloader />

  return (
    <main className="min-h-screen bg-cream px-5 py-6 text-charcoal">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <Brand />
        <ConnectWalletButton />
      </header>

      <section className="mx-auto mt-8 grid max-w-7xl gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="rounded-lg bg-forest p-6 text-cream">
            <p className="text-sm opacity-75">Employer wallet</p>
            <h1 className="mt-2 break-all font-heading text-3xl">{address || "Connect to Arc Testnet"}</h1>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Metric label="Total stream buffer" value={`$${formatUsdc(totals.buffer)}`} />
              <Metric label="Currently claimable" value={`$${formatUsdc(totals.paid)}`} />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h2 className="font-heading text-3xl text-forest">Active Streams</h2>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Worker
            </Button>
          </div>

          {status && (
            <div className="mt-3 flex items-center gap-3 rounded-md bg-gold/20 px-4 py-3 text-sm font-medium text-forest">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest opacity-50" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-forest" />
              </span>
              {status}
            </div>
          )}

          <div className="mt-4 grid gap-4">
            {loading && <><StreamCardSkeleton /><StreamCardSkeleton /></>}
            {!loading && error && <div className="rounded-lg border border-clay/30 bg-white/70 p-6 text-clay shadow-soft">{error}</div>}
            {!loading && !error && streams.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-forest/20 bg-white/50 p-10 text-center shadow-soft">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold/20 text-forest">
                  <Wallet className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-2xl text-forest">No streams yet</h3>
                <p className="mt-2 text-sm text-charcoal/60 max-w-xs mx-auto leading-6">
                  Add your first worker to create an on-chain salary stream. Money flows every second — no waiting, no bank.
                </p>
                <Button className="mt-6" onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add your first worker
                </Button>
              </div>
            )}
            {streams.map((stream) => {
              const balance = balances[stream.id]
              const remaining = Number(balance?.remaining || 0)
              const rate = Number(stream.rate_per_second || 1)
              const drySeconds = rate > 0 ? remaining / rate : Infinity
              // Buffer bar: fraction of a 30-day window remaining (capped at 100%)
              const pct = Math.max(4, Math.min(100, (drySeconds / (30 * 86400)) * 100))
              const isDepositOpen = depositOpen === stream.id

              return (
                <article key={stream.id} className="rounded-lg border border-forest/10 bg-white/70 p-5 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="font-heading text-2xl text-forest">{stream.workers?.name || `Stream ${stream.id}`}</h3>
                      <p className="text-sm text-charcoal/70">{stream.workers?.job_title}</p>
                    </div>
                    <span className="rounded-full bg-gold/20 px-3 py-1 text-sm font-bold text-forest">
                      {stream.active ? "streaming" : "paused"}
                    </span>
                  </div>
                  <p className="mt-4 font-semibold">
                    ${rateToMonthly(stream.rate_per_second).toLocaleString("en-US", { maximumFractionDigits: 0 })}/month
                    {" · "}${rateToHourly(stream.rate_per_second).toFixed(2)}/hr
                  </p>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-forest/10">
                    <div className="h-full bg-gold transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <span>Buffer remaining: ${formatUsdc(remaining)}</span>
                    <span className={drySeconds < 7 * 86400 ? "font-bold text-clay" : "text-charcoal/70"}>
                      runs dry in {dryRunLabel(drySeconds)}
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                      onClick={() => callStream(stream.active ? "pauseStream" : "resumeStream", stream.id)}
                      className="bg-charcoal"
                    >
                      <Pause className="mr-2 h-4 w-4" /> {stream.active ? "Pause" : "Resume"}
                    </Button>
                    <Button onClick={() => callStream("terminateStream", stream.id)} className="bg-clay">
                      <Square className="mr-2 h-4 w-4" /> Terminate
                    </Button>
                    <Button
                      onClick={() => setDepositOpen(isDepositOpen ? null : stream.id)}
                      className="bg-gold text-forest"
                    >
                      {isDepositOpen ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                      Top Up
                    </Button>
                  </div>
                  {isDepositOpen && (
                    <div className="mt-4 flex gap-3">
                      <input
                        type="number"
                        min="1"
                        step="0.000001"
                        placeholder="USDC amount"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="min-h-10 flex-1 rounded-md border border-forest/20 bg-white px-4 text-sm outline-none focus:border-gold"
                      />
                      <Button onClick={() => depositMore(stream.id)} className="bg-gold text-forest" disabled={!depositAmount}>
                        Deposit
                      </Button>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </div>

        <aside className="rounded-lg border border-forest/10 bg-white/70 p-5 shadow-soft">
          <h2 className="font-heading text-2xl text-forest">AI Alerts</h2>
          <div className="mt-4 space-y-3">
            {alerts.length === 0 && <p className="text-sm text-charcoal/60">No active alerts.</p>}
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-md border border-gold/30 bg-gold/10 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-2 font-semibold text-forest">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {alert.alert_type}
                  </div>
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="shrink-0 text-forest/60 hover:text-forest"
                    title="Resolve alert"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-sm">{alert.message}</p>
                <p className="mt-1 text-xs text-charcoal/50">Stream #{alert.stream_id}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-forest/40 p-5">
          <form onSubmit={submit} className="w-full max-w-lg rounded-lg bg-cream p-6 shadow-soft">
            <h2 className="font-heading text-3xl text-forest">Add Worker</h2>
            <div className="mt-5 grid gap-3">
              <Input name="workerEmail" required placeholder="worker@email.com" type="email" />
              <Input name="workerName" required placeholder="Worker name" />
              <Input name="jobTitle" required placeholder="Job title" />
              <Input name="monthlySalaryUSD" required placeholder="Monthly salary (USD)" type="number" min="1" />
              <Input name="initialDeposit" required placeholder="Initial deposit (USDC)" type="number" min="1" step="0.000001" />
            </div>
            <div className="mt-5 flex gap-3">
              <Button type="submit">
                <Wallet className="mr-2 h-4 w-4" /> Create Stream
              </Button>
              <Button type="button" onClick={() => { setOpen(false); setStatus("") }} className="bg-charcoal">
                Cancel
              </Button>
            </div>
            {status && <p className="mt-4 text-sm text-forest">{status}</p>}
          </form>
        </div>
      )}
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-cream/10 p-4">
      <p className="text-sm opacity-75">{label}</p>
      <p className="mt-1 font-heading text-3xl">{value}</p>
    </div>
  )
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="min-h-12 rounded-md border border-forest/20 bg-white px-4 outline-none focus:border-gold" />
}
