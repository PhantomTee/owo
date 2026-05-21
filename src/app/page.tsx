"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Lock, Wallet, Waves } from "lucide-react"
import { Brand } from "@/components/brand"

function TickingCounter() {
  const [value, setValue] = useState(0.000001)
  useEffect(() => {
    const rate = 0.00000578703 // ~$0.50/day in micro increments
    const id = setInterval(() => setValue((v) => +(v + rate).toFixed(9)), 100)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="font-heading text-5xl font-semibold text-forest drop-shadow-sm sm:text-6xl md:text-7xl lg:text-8xl tabular-nums">
      ${value.toFixed(6)}
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-cream text-charcoal">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 sm:py-6">
        <Brand />
        <nav className="flex gap-4 text-sm font-semibold text-forest sm:gap-6">
          <Link href="/employer/dashboard">Employer</Link>
          <Link href="/worker/dashboard">Worker</Link>
          <Link href="/agent">Agent</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="counter-bg mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 md:min-h-[72vh] md:grid-cols-[1.05fr_0.95fr] md:gap-10">
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-gold sm:text-sm">
            Arc Nanopayments Payroll
          </p>
          <h1 className="font-heading text-4xl font-semibold leading-[0.95] text-forest sm:text-5xl md:text-6xl lg:text-7xl">
            Your money, the moment you earn it.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-charcoal/80 sm:mt-6 sm:text-lg">
            Owo streams your salary every second in USDC. No waiting. No bank.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 sm:mt-9 sm:gap-4">
            <Link
              className="rounded-md bg-forest px-5 py-3 text-sm font-semibold text-cream sm:px-6"
              href="/employer/dashboard"
            >
              I&apos;m an Employer →
            </Link>
            <Link
              className="rounded-md border border-forest/25 px-5 py-3 text-sm font-semibold text-forest sm:px-6"
              href="/worker/dashboard"
            >
              I&apos;m a Worker →
            </Link>
          </div>
        </div>

        <div className="relative flex min-h-[260px] items-center justify-center md:min-h-[340px]">
          <div className="absolute h-52 w-52 rounded-full border border-gold/40 sm:h-64 sm:w-64" />
          <div className="absolute h-64 w-64 rounded-full border border-forest/20 sm:h-80 sm:w-80" />
          <TickingCounter />
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {(
            [
              ["Employer deposits USDC", Lock],
              ["Money flows every second", Waves],
              ["Worker withdraws anytime", Wallet],
            ] as const
          ).map(([label, Icon], index) => (
            <div key={label} className="rounded-lg border border-forest/10 bg-white/55 p-6 shadow-soft sm:p-7">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-gold/20 text-forest sm:mb-8">
                <Icon size={24} />
              </div>
              <p className="text-sm font-bold text-gold">Step {index + 1}</p>
              <h2 className="mt-2 font-heading text-2xl text-forest sm:text-3xl">{label}</h2>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-md bg-forest px-6 py-5 text-center text-sm font-semibold text-cream sm:mt-14">
          Powered by Arc · Secured by Circle · AI-monitored
        </div>
      </section>
    </main>
  )
}
