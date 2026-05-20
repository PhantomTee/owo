import { SECONDS_IN_30_DAYS, USDC_DECIMALS } from "@/lib/constants"

export function monthlyUsdToRate(monthlySalaryUSD: number) {
  return BigInt(Math.floor((monthlySalaryUSD * 10 ** USDC_DECIMALS) / SECONDS_IN_30_DAYS))
}

export function usdcToBaseUnits(amount: number | string) {
  const value = typeof amount === "string" ? Number(amount) : amount
  return BigInt(Math.round(value * 10 ** USDC_DECIMALS))
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
