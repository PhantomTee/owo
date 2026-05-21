import { SECONDS_IN_30_DAYS, USDC_DECIMALS } from "@/lib/constants"

export function monthlyUsdToRate(monthlySalaryUSD: number) {
  return BigInt(Math.floor((monthlySalaryUSD * 10 ** USDC_DECIMALS) / SECONDS_IN_30_DAYS))
}

export function usdcToBaseUnits(amount: number | string) {
  const raw = String(amount).trim()
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error("Invalid USDC amount")

  const [whole, fraction = ""] = raw.split(".")
  const paddedFraction = fraction.padEnd(USDC_DECIMALS, "0").slice(0, USDC_DECIMALS)
  return BigInt(whole) * 10n ** BigInt(USDC_DECIMALS) + BigInt(paddedFraction || "0")
}

export function formatUsdc(baseUnits: bigint | number | string, decimals = 2) {
  const numeric = typeof baseUnits === "bigint" ? Number(baseUnits) : Number(baseUnits)
  return (numeric / 10 ** USDC_DECIMALS).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

export function rateToMonthly(ratePerSecond: bigint | number | string) {
  return (Number(ratePerSecond) * SECONDS_IN_30_DAYS) / 10 ** USDC_DECIMALS
}

export function rateToHourly(ratePerSecond: bigint | number | string) {
  return (Number(ratePerSecond) * 3600) / 10 ** USDC_DECIMALS
}

export function dryRunLabel(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "unknown"
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))} min`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr`
  return `${Math.floor(seconds / 86400)} days`
}
