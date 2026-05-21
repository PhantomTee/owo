import { NextResponse } from "next/server"
import { isAddress } from "ethers"
import { monthlyUsdToRate } from "@/lib/money"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const workerEmail = String(body.workerEmail || "").toLowerCase().trim()
    const workerName = String(body.workerName || "").trim()
    const jobTitle = String(body.jobTitle || "").trim()
    const employerWallet = String(body.employerWallet || "").toLowerCase()
    const monthlySalaryUSD = Number(body.monthlySalaryUSD)

    if (!workerEmail || !workerName || !jobTitle || !isAddress(employerWallet) || !Number.isFinite(monthlySalaryUSD) || monthlySalaryUSD <= 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Look up existing worker — they must have completed Circle wallet setup first
    const { data: existingWorker } = await supabase
      .from("workers")
      .select("*")
      .eq("email", workerEmail)
      .single()

    if (!existingWorker?.wallet_address) {
      return NextResponse.json({
        error: `This worker hasn't set up their Circle wallet yet. Ask ${workerEmail} to visit the worker dashboard and complete wallet setup first.`
      }, { status: 400 })
    }

    // Update worker record with latest employer and job info
    const { data: worker, error } = await supabase
      .from("workers")
      .update({ name: workerName, job_title: jobTitle, employer_wallet: employerWallet })
      .eq("email", workerEmail)
      .select()
      .single()
    if (error) throw error

    const ratePerSecond = monthlyUsdToRate(monthlySalaryUSD)
    return NextResponse.json({
      worker,
      ratePerSecond: ratePerSecond.toString(),
      workerWalletAddress: existingWorker.wallet_address,
      streamParams: {
        worker: existingWorker.wallet_address,
        ratePerSecond: ratePerSecond.toString(),
        workerName,
        jobTitle
      }
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
