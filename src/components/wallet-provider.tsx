"use client"

import { createElement, useEffect, useState } from "react"
import { arcTestnet } from "@/lib/constants"

type LoadedWalletModules = {
  QueryClientProvider: React.ComponentType<{ client: unknown; children?: React.ReactNode }>
  WagmiProvider: React.ComponentType<{ config: unknown; children?: React.ReactNode }>
  ConnectKitProvider: React.ComponentType<{ theme: "soft"; children?: React.ReactNode }>
  ConnectKitButton: React.ComponentType
  queryClient: unknown
  config: unknown
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState<LoadedWalletModules | null>(null)
  const [error, setError] = useState("")
  const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  useEffect(() => {
    let cancelled = false
    async function loadWalletStack() {
      try {
        if (!walletConnectProjectId || !appUrl) {
          throw new Error("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID or NEXT_PUBLIC_APP_URL.")
        }
        const [reactQuery, wagmi, connectkit] = await Promise.all([
          import("@tanstack/react-query"),
          import("wagmi"),
          import("connectkit")
        ])
        const queryClient = new reactQuery.QueryClient()
        const config = wagmi.createConfig(
          connectkit.getDefaultConfig({
            chains: [arcTestnet],
            transports: {
              [arcTestnet.id]: wagmi.http()
            },
            walletConnectProjectId,
            appName: "Owo",
            appDescription: "Real-time salary streaming on Arc",
            appUrl
          })
        )
        if (!cancelled) {
          setLoaded({
            QueryClientProvider: reactQuery.QueryClientProvider as LoadedWalletModules["QueryClientProvider"],
            WagmiProvider: wagmi.WagmiProvider as LoadedWalletModules["WagmiProvider"],
            ConnectKitProvider: connectkit.ConnectKitProvider as LoadedWalletModules["ConnectKitProvider"],
            ConnectKitButton: connectkit.ConnectKitButton as LoadedWalletModules["ConnectKitButton"],
            queryClient,
            config
          })
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Failed to load wallet connector.")
      }
    }
    loadWalletStack()
    return () => {
      cancelled = true
    }
  }, [appUrl, walletConnectProjectId])

  if (error) {
    return <div className="min-h-screen bg-cream p-6 text-charcoal">{error} Employer wallet connection requires real public wallet configuration.</div>
  }

  if (!loaded) return <div className="min-h-screen bg-cream p-6 text-forest">Loading wallet connector...</div>

  return createElement(
    loaded.QueryClientProvider,
    { client: loaded.queryClient },
    createElement(
      loaded.WagmiProvider,
      { config: loaded.config },
      createElement(loaded.ConnectKitProvider, { theme: "soft" }, children)
    )
  )
}

export function RuntimeConnectKitButton() {
  const [ButtonComponent, setButtonComponent] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    let cancelled = false
    import("connectkit").then((connectkit) => {
      if (!cancelled) setButtonComponent(() => connectkit.ConnectKitButton)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!ButtonComponent) return <span className="text-sm font-semibold text-forest">Loading wallet...</span>
  return <ButtonComponent />
}
