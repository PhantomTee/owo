"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/button"

/** Thin wrapper — no longer needs async loading, just renders children */
export function WalletProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/** Pulsing preloader shown while wallet state is being detected */
export function WalletPreloader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <span className="relative flex h-10 w-10">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest opacity-30" />
        <span className="relative inline-flex h-10 w-10 rounded-full bg-forest" />
      </span>
    </div>
  )
}

/** Connect / display wallet button — injected only (MetaMask / Rabby / Frame) */
export function ConnectWalletButton() {
  const [address, setAddress] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (!window.ethereum) { setReady(true); return }
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const list = accounts as string[]
        setAddress(list[0] || null)
      })
      .catch(() => {})
      .finally(() => setReady(true))

    const onChanged = (accounts: unknown) => {
      const list = accounts as string[]
      setAddress(list[0] || null)
    }
    window.ethereum.on?.("accountsChanged", onChanged)
    return () => { window.ethereum?.removeListener?.("accountsChanged", onChanged) }
  }, [])

  async function connect() {
    if (!window.ethereum) return alert("No injected wallet found. Install MetaMask or Rabby.")
    setConnecting(true)
    try {
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[]
      setAddress(accounts[0] || null)
    } catch {
      // user rejected
    } finally {
      setConnecting(false)
    }
  }

  if (!ready) return (
    <span className="relative flex h-5 w-5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-forest opacity-30" />
      <span className="relative inline-flex h-5 w-5 rounded-full bg-forest" />
    </span>
  )

  if (address) return (
    <span className="rounded-full border border-forest/20 bg-white/70 px-4 py-1.5 font-mono text-xs text-forest shadow-soft">
      {address.slice(0, 6)}…{address.slice(-4)}
    </span>
  )

  return (
    <Button onClick={connect} disabled={connecting}>
      {connecting ? "Connecting…" : "Connect Wallet"}
    </Button>
  )
}

/** @deprecated kept for backward compat — use ConnectWalletButton */
export function RuntimeConnectKitButton() {
  return <ConnectWalletButton />
}
