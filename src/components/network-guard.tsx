"use client"

import { useEffect, useState } from "react"

const ARC_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID || 5042002)

const ARC_CHAIN_PARAMS = {
  chainId: `0x${ARC_CHAIN_ID.toString(16)}`,
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: [process.env.NEXT_PUBLIC_ARC_RPC || "https://rpc.testnet.arc.network"],
  blockExplorerUrls: [process.env.NEXT_PUBLIC_ARC_EXPLORER || "https://testnet.arcscan.app"]
}

export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const [chainId, setChainId] = useState<number | null>(null)
  const [switching, setSwitching] = useState(false)

  useEffect(() => {
    if (!window.ethereum) return
    const eth = window.ethereum as typeof window.ethereum & {
      on?: (e: string, cb: (v: unknown) => void) => void
      removeListener?: (e: string, cb: (v: unknown) => void) => void
    }

    const readChain = () =>
      eth.request({ method: "eth_chainId" }).then((id) => setChainId(parseInt(id as string, 16))).catch(() => {})

    readChain()
    const onChainChanged = (id: unknown) => setChainId(parseInt(id as string, 16))
    eth.on?.("chainChanged", onChainChanged)
    return () => eth.removeListener?.("chainChanged", onChainChanged)
  }, [])

  async function switchNetwork() {
    if (!window.ethereum) return
    setSwitching(true)
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ARC_CHAIN_PARAMS.chainId }]
      })
    } catch (e: unknown) {
      if ((e as { code?: number }).code === 4902) {
        await window.ethereum.request({ method: "wallet_addEthereumChain", params: [ARC_CHAIN_PARAMS] })
      }
    } finally {
      setSwitching(false)
    }
  }

  if (chainId !== null && chainId !== ARC_CHAIN_ID) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-cream px-5 text-center">
        <div className="relative flex h-12 w-12">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-40" />
          <span className="relative inline-flex h-12 w-12 rounded-full bg-gold" />
        </div>
        <h2 className="font-heading text-3xl text-forest">Wrong Network</h2>
        <p className="max-w-xs text-sm leading-6 text-charcoal/70">
          Owo runs on <strong>Arc Testnet</strong>. Your wallet is on chain {chainId}. Switch to continue.
        </p>
        <button
          onClick={switchNetwork}
          disabled={switching}
          className="rounded-md bg-forest px-6 py-3 font-semibold text-cream disabled:opacity-60"
        >
          {switching ? "Switching…" : "Switch to Arc Testnet"}
        </button>
      </div>
    )
  }

  return <>{children}</>
}
