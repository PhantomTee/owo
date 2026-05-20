import Link from "next/link"
import { Lock, Wallet, Waves } from "lucide-react"
import { Brand } from "@/components/brand"

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-cream text-charcoal">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Brand />
        <nav className="flex gap-3 text-sm font-semibold text-forest">
          <Link href="/employer/dashboard">Employer</Link>
          <Link href="/worker/dashboard">Worker</Link>
          <Link href="/agent">Agent</Link>
        </nav>
      </header>

      <section className="counter-bg mx-auto grid min-h-[72vh] max-w-6xl items-center gap-10 px-5 py-10 md:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.24em] text-gold">Arc Nanopayments Payroll</p>
          <h1 className="font-heading text-5xl font-semibold leading-[0.95] text-forest md:text-7xl">
            Your money, the moment you earn it.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-charcoal/80">
            Owo streams your salary every second in USDC. No waiting. No bank.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link className="rounded-md bg-forest px-6 py-3 font-semibold text-cream" href="/employer/dashboard">
              I&apos;m an Employer →
            </Link>
            <Link className="rounded-md border border-forest/25 px-6 py-3 font-semibold text-forest" href="/worker/dashboard">
              I&apos;m a Worker →
            </Link>
          </div>
        </div>
        <div className="relative flex min-h-[340px] items-center justify-center">
          <div className="absolute h-64 w-64 rounded-full border border-gold/40" />
          <div className="absolute h-80 w-80 rounded-full border border-forest/20" />
          <div className="font-heading text-6xl font-semibold text-forest drop-shadow-sm md:text-8xl">$0.000001</div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["Employer deposits USDC", Lock],
            ["Money flows every second", Waves],
            ["Worker withdraws anytime", Wallet]
          ].map(([label, Icon], index) => (
            <div key={String(label)} className="rounded-lg border border-forest/10 bg-white/55 p-7 shadow-soft">
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-gold/20 text-forest">
                <Icon size={24} />
              </div>
              <p className="text-sm font-bold text-gold">Step {index + 1}</p>
              <h2 className="mt-2 font-heading text-3xl text-forest">{String(label)}</h2>
            </div>
          ))}
        </div>
        <div className="mt-14 rounded-md bg-forest px-6 py-5 text-center font-semibold text-cream">
          Powered by Arc · Secured by Circle · AI-monitored
        </div>
      </section>
    </main>
  )
}
