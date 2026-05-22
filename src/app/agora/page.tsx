"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  ArrowLeft,
  BadgeDollarSign,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Copy,
  FileCheck2,
  Globe2,
  Landmark,
  Route,
  ShieldCheck,
  WalletCards
} from "lucide-react"
import { Brand } from "@/components/brand"
import { Button } from "@/components/button"
import { ARC_EXPLORER, ARC_USDC, ARC_USYC, OWO_CONTRACT } from "@/lib/constants"

const CHAINS = [
  { name: "Arc", balance: 820, fee: 0.01, eta: "<1s", tool: "Native USDC" },
  { name: "Base", balance: 460, fee: 0.18, eta: "<500ms", tool: "Gateway" },
  { name: "Ethereum", balance: 1250, fee: 3.8, eta: "8-20m", tool: "CCTP" },
  { name: "Arbitrum", balance: 380, fee: 0.12, eta: "<500ms", tool: "Gateway" }
]

function usd(value: number, digits = 2) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function AgoraPage() {
  const [monthlyPayroll, setMonthlyPayroll] = useState(12000)
  const [arcBalance, setArcBalance] = useState(4200)
  const [targetRunwayDays, setTargetRunwayDays] = useState(14)
  const [usycApy, setUsycApy] = useState(4.85)
  const [advanceRequest, setAdvanceRequest] = useState(80)
  const [workerMonthlyIncome, setWorkerMonthlyIncome] = useState(1800)
  const [streamAgeDays, setStreamAgeDays] = useState(42)
  const [employerReliability, setEmployerReliability] = useState(92)
  const [taskBudget, setTaskBudget] = useState(450)
  const [taskDays, setTaskDays] = useState(6)
  const [agentCount, setAgentCount] = useState(3)
  const [targetCurrency, setTargetCurrency] = useState<"USDC" | "EURC">("USDC")
  const [fxRate, setFxRate] = useState(0.92)
  const [receiptWorker, setReceiptWorker] = useState("maya@studio.test")
  const [receiptMilestone, setReceiptMilestone] = useState("Design QA sprint completed")
  const [receiptAmount, setReceiptAmount] = useState(125)
  const [receiptHash, setReceiptHash] = useState("")
  const [copied, setCopied] = useState(false)

  const treasury = useMemo(() => {
    const dailyPayroll = monthlyPayroll / 30
    const targetLiquid = dailyPayroll * targetRunwayDays
    const deficit = Math.max(0, targetLiquid - arcBalance)
    const idle = Math.max(0, arcBalance - targetLiquid)
    const monthlyYield = (idle * (usycApy / 100)) / 12
    return { dailyPayroll, targetLiquid, deficit, idle, monthlyYield }
  }, [monthlyPayroll, arcBalance, targetRunwayDays, usycApy])

  const rebalancer = useMemo(() => {
    let remaining = treasury.deficit
    const sources = CHAINS.filter((chain) => chain.name !== "Arc")
      .sort((a, b) => a.fee - b.fee)
      .map((chain) => {
        const amount = Math.min(chain.balance, remaining)
        remaining -= amount
        return { ...chain, amount: Math.max(0, amount) }
      })
      .filter((chain) => chain.amount > 0)
    return { sources, covered: treasury.deficit - Math.max(0, remaining), remaining: Math.max(0, remaining) }
  }, [treasury.deficit])

  const advance = useMemo(() => {
    const incomeLimit = workerMonthlyIncome * 0.12
    const reputation = clamp(streamAgeDays * 1.1 + employerReliability * 0.65, 0, 100)
    const safeLimit = incomeLimit * (0.45 + reputation / 180)
    const approved = advanceRequest <= safeLimit
    const fee = approved ? Math.max(0.15, advanceRequest * (1.8 - reputation / 100) * 0.01) : 0
    const repaymentDays = approved ? Math.ceil((advanceRequest / workerMonthlyIncome) * 30) : 0
    return { reputation, safeLimit, approved, fee, repaymentDays }
  }, [advanceRequest, workerMonthlyIncome, streamAgeDays, employerReliability])

  const agentPayment = useMemo(() => {
    const perAgentBudget = taskBudget / Math.max(1, agentCount)
    const ratePerDay = perAgentBudget / Math.max(1, taskDays)
    const streamDeposit = taskBudget * 1.05
    return { perAgentBudget, ratePerDay, streamDeposit }
  }, [taskBudget, taskDays, agentCount])

  const liquidityRoute = useMemo(() => {
    if (treasury.deficit === 0) {
      return "Keep payroll liquid on Arc and route idle capital into USYC until the buffer drops below target."
    }
    const fastest = rebalancer.sources.find((source) => source.tool === "Gateway")
    if (fastest) return `Use ${fastest.tool} from ${fastest.name} first for ${usd(fastest.amount)} before slower CCTP moves.`
    return "Use CCTP from Ethereum, then pause new stream creation until the target runway is funded."
  }, [rebalancer.sources, treasury.deficit])

  const contractor = useMemo(() => {
    const gross = 1000
    const workerReceives = targetCurrency === "EURC" ? gross * fxRate : gross
    return { gross, workerReceives, currency: targetCurrency }
  }, [fxRate, targetCurrency])

  async function generateReceiptHash() {
    const payload = JSON.stringify({
      app: "Owo",
      worker: receiptWorker.trim().toLowerCase(),
      milestone: receiptMilestone.trim(),
      amount: receiptAmount,
      currency: targetCurrency,
      contract: OWO_CONTRACT || "unconfigured",
      createdAt: new Date().toISOString()
    })
    const encoded = new TextEncoder().encode(payload)
    const digest = await crypto.subtle.digest("SHA-256", encoded)
    const hash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("")
    setReceiptHash(`0x${hash}`)
  }

  async function copyHash() {
    if (!receiptHash) return
    await navigator.clipboard.writeText(receiptHash)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-6 text-charcoal sm:px-6">
      <header className="mx-auto flex max-w-7xl items-center justify-between">
        <Brand />
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-forest">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
      </header>

      <section className="mx-auto mt-8 max-w-7xl">
        <div className="rounded-lg bg-forest p-6 text-cream shadow-soft sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-gold">Agora agent cockpit</p>
          <h1 className="mt-3 max-w-4xl font-heading text-4xl leading-tight sm:text-6xl">
            Autonomous payroll treasury for global stablecoin work.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-cream/75 sm:text-base">
            Explore Arc, USDC, Circle Wallets, Gateway/CCTP planning, USYC treasury allocation, contractor payouts,
            worker advances, and verifiable work receipts from one judge-friendly surface.
          </p>
          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <Status label="Contract" value={OWO_CONTRACT || "Not configured"} />
            <Status label="USDC" value={ARC_USDC || "Not configured"} />
            <Status label="USYC" value={ARC_USYC || "Simulation mode"} />
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Panel icon={BrainCircuit} title="AI Payroll Treasury Agent">
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Monthly payroll" value={monthlyPayroll} onChange={setMonthlyPayroll} />
              <NumberField label="Arc USDC balance" value={arcBalance} onChange={setArcBalance} />
              <NumberField label="Target runway days" value={targetRunwayDays} onChange={setTargetRunwayDays} />
              <NumberField label="USYC APY %" value={usycApy} onChange={setUsycApy} step="0.01" />
            </div>
            <MetricGrid
              items={[
                ["Liquid target", usd(treasury.targetLiquid)],
                ["Move to USYC", usd(treasury.idle)],
                ["Fund deficit", usd(treasury.deficit)],
                ["Est. monthly yield", usd(treasury.monthlyYield)]
              ]}
            />
            <Decision>
              {treasury.deficit > 0
                ? `Agent action: source ${usd(treasury.deficit)} into Arc before creating more streams.`
                : `Agent action: keep ${usd(treasury.targetLiquid)} liquid and allocate ${usd(treasury.idle)} to USYC.`}
            </Decision>
          </Panel>

          <Panel icon={Route} title="Cross-Chain Payroll Rebalancer">
            <div className="space-y-3">
              {CHAINS.map((chain) => (
                <div key={chain.name} className="flex items-center justify-between rounded-md border border-forest/10 bg-white/65 p-3 text-sm">
                  <div>
                    <p className="font-semibold text-forest">{chain.name}</p>
                    <p className="text-charcoal/60">{chain.tool} - ETA {chain.eta}</p>
                  </div>
                  <p className="font-heading text-xl text-forest">{usd(chain.balance, 0)}</p>
                </div>
              ))}
            </div>
            <Decision>
              {rebalancer.sources.length === 0
                ? "No cross-chain move needed. Arc payroll runway is already funded."
                : `Plan: ${rebalancer.sources.map((source) => `${usd(source.amount)} from ${source.name} via ${source.tool}`).join(", ")}.`}
            </Decision>
          </Panel>

          <Panel icon={BadgeDollarSign} title="Micro-Advance Market">
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Advance request" value={advanceRequest} onChange={setAdvanceRequest} />
              <NumberField label="Monthly income" value={workerMonthlyIncome} onChange={setWorkerMonthlyIncome} />
              <NumberField label="Stream age days" value={streamAgeDays} onChange={setStreamAgeDays} />
              <NumberField label="Employer reliability" value={employerReliability} onChange={setEmployerReliability} />
            </div>
            <MetricGrid
              items={[
                ["Reputation", `${advance.reputation.toFixed(0)}/100`],
                ["Safe advance", usd(advance.safeLimit)],
                ["Fee", usd(advance.fee)],
                ["Repayment", advance.approved ? `${advance.repaymentDays} days` : "Rejected"]
              ]}
            />
            <Decision>
              {advance.approved
                ? `Agent action: approve ${usd(advanceRequest)} with ${usd(advance.fee)} fee, repaid from future stream accrual.`
                : `Agent action: reject or reduce request below ${usd(advance.safeLimit)}.`}
            </Decision>
          </Panel>

          <Panel icon={Bot} title="Agent-to-Agent Labor Payments">
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField label="Task budget" value={taskBudget} onChange={setTaskBudget} />
              <NumberField label="Task days" value={taskDays} onChange={setTaskDays} />
              <NumberField label="Agents" value={agentCount} onChange={setAgentCount} />
            </div>
            <MetricGrid
              items={[
                ["Per agent", usd(agentPayment.perAgentBudget)],
                ["Daily stream", usd(agentPayment.ratePerDay)],
                ["Escrow deposit", usd(agentPayment.streamDeposit)],
                ["Milestones", `${agentCount} streams`]
              ]}
            />
            <Decision>
              Agent action: open milestone streams for human or software agents, then release funds continuously as work is validated.
            </Decision>
          </Panel>

          <Panel icon={Landmark} title="Payroll Liquidity Router">
            <div className="rounded-md bg-forest p-4 text-cream">
              <p className="text-sm opacity-75">Best next source</p>
              <p className="mt-2 font-heading text-3xl">{treasury.deficit > 0 ? "Gateway first" : "USYC sweep"}</p>
            </div>
            <MetricGrid
              items={[
                ["Arc runway", `${(arcBalance / Math.max(1, treasury.dailyPayroll)).toFixed(1)} days`],
                ["Target runway", `${targetRunwayDays} days`],
                ["Uncovered deficit", usd(rebalancer.remaining)],
                ["Route policy", treasury.deficit > 0 ? "Fund payroll" : "Earn yield"]
              ]}
            />
            <Decision>{liquidityRoute}</Decision>
          </Panel>

          <Panel icon={ShieldCheck} title="Reputation-Backed Worker Credit">
            <MetricGrid
              items={[
                ["Worker score", `${advance.reputation.toFixed(0)}/100`],
                ["Income signal", usd(workerMonthlyIncome)],
                ["Max credit", usd(advance.safeLimit * 1.6)],
                ["Risk tier", advance.reputation > 80 ? "Prime" : advance.reputation > 55 ? "Standard" : "Watch"]
              ]}
            />
            <Decision>
              Agent action: convert verified wage-stream history into a portable credit limit without exposing private payroll details.
            </Decision>
          </Panel>

          <Panel icon={Globe2} title="EURC / USDC Global Contractor Mode">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-forest">
                Settlement currency
                <select
                  value={targetCurrency}
                  onChange={(event) => setTargetCurrency(event.target.value as "USDC" | "EURC")}
                  className="mt-2 min-h-11 w-full rounded-md border border-forest/20 bg-white px-3 outline-none focus:border-gold"
                >
                  <option value="USDC">USDC</option>
                  <option value="EURC">EURC</option>
                </select>
              </label>
              <NumberField label="EURC per USDC" value={fxRate} onChange={setFxRate} step="0.01" />
            </div>
            <MetricGrid
              items={[
                ["Invoice", usd(contractor.gross)],
                ["Worker receives", `${contractor.workerReceives.toFixed(2)} ${contractor.currency}`],
                ["FX route", targetCurrency === "EURC" ? "USDC to EURC" : "None"],
                ["Settlement", "Arc"]
              ]}
            />
            <Decision>
              Agent action: let contractors choose local stablecoin settlement while keeping employer accounting in USDC.
            </Decision>
          </Panel>

          <Panel icon={FileCheck2} title="Onchain Proof-of-Work Receipts">
            <div className="grid gap-3">
              <TextField label="Worker" value={receiptWorker} onChange={setReceiptWorker} />
              <TextField label="Milestone" value={receiptMilestone} onChange={setReceiptMilestone} />
              <NumberField label="Amount" value={receiptAmount} onChange={setReceiptAmount} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={generateReceiptHash}>
                <FileCheck2 className="mr-2 h-4 w-4" /> Hash receipt
              </Button>
              <Button onClick={copyHash} disabled={!receiptHash} className="bg-gold text-forest">
                <Copy className="mr-2 h-4 w-4" /> {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            {receiptHash && (
              <div className="mt-4 rounded-md border border-forest/10 bg-white/70 p-3">
                <p className="break-all font-mono text-xs text-forest">{receiptHash}</p>
                <p className="mt-2 text-xs text-charcoal/60">
                  {ARC_EXPLORER ? "Ready to pin as an Arc transaction memo or event reference." : "Configure explorer URL to link pinned receipts."}
                </p>
              </div>
            )}
          </Panel>
        </div>

        <div className="mt-6 rounded-lg border border-forest/10 bg-white/70 p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-forest" />
            <p className="text-sm leading-7 text-charcoal/75">
              Paymaster and payroll compliance watcher are intentionally excluded here. Everything else from the Agora expansion list is represented as an interactive product surface that can be demoed without external funds.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

function Panel({
  icon: Icon,
  title,
  children
}: {
  icon: typeof WalletCards
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-forest/10 bg-white/70 p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold/20 text-forest">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="font-heading text-2xl text-forest">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Status({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-cream/10 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-gold">{label}</p>
      <p className="mt-2 break-all font-mono text-xs text-cream/85">{value}</p>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  step = "1"
}: {
  label: string
  value: number
  onChange: (value: number) => void
  step?: string
}) {
  return (
    <label className="text-sm font-semibold text-forest">
      {label}
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 min-h-11 w-full rounded-md border border-forest/20 bg-white px-3 outline-none focus:border-gold"
      />
    </label>
  )
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="text-sm font-semibold text-forest">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-md border border-forest/20 bg-white px-3 outline-none focus:border-gold"
      />
    </label>
  )
}

function MetricGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md bg-cream p-3">
          <p className="text-xs text-charcoal/55">{label}</p>
          <p className="mt-1 font-heading text-xl text-forest">{value}</p>
        </div>
      ))}
    </div>
  )
}

function Decision({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-md border border-gold/30 bg-gold/10 p-3 text-sm font-medium leading-6 text-forest">
      {children}
    </div>
  )
}
