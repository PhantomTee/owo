import { defineChain } from "viem"

export const USDC_DECIMALS = 6
export const SECONDS_IN_30_DAYS = 30 * 24 * 60 * 60

export const ARC_TESTNET_RPC = process.env.NEXT_PUBLIC_ARC_RPC
export const ARC_TESTNET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID)
export const ARC_EXPLORER = process.env.NEXT_PUBLIC_ARC_EXPLORER
export const ARC_USDC = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}` | undefined
export const ARC_USYC = process.env.NEXT_PUBLIC_USYC_ADDRESS as `0x${string}` | undefined
export const OWO_CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}` | undefined

export function requirePublicEnv(name: string, value: string | number | undefined) {
  if (value === undefined || value === "" || Number.isNaN(value)) throw new Error(`Missing ${name}`)
  return value
}

export const arcTestnet = defineChain({
  id: Number(requirePublicEnv("NEXT_PUBLIC_ARC_CHAIN_ID", ARC_TESTNET_CHAIN_ID)),
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18
  },
  rpcUrls: {
    default: { http: [String(requirePublicEnv("NEXT_PUBLIC_ARC_RPC", ARC_TESTNET_RPC))] }
  },
  blockExplorers: {
    default: { name: "ArcScan", url: String(requirePublicEnv("NEXT_PUBLIC_ARC_EXPLORER", ARC_EXPLORER)) }
  },
  testnet: true
})
