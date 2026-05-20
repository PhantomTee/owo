import { NextResponse } from "next/server"
import { createOrLoadWorkerWallet } from "@/lib/circle"
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

    if (!workerEmail || !workerName || !jobTitle || !employerWallet || !monthlySalaryUSD) {
      return NextResponse.json({ error: "Missing required worker or salary fields" }, { status: 400 })
    }

    const wallet = await createOrLoadWorkerWallet(workerEmail)
    const supabase = getSupabaseAdmin()
    const { data: worker, error } = await supabase
      .from("workers")
      .upsert(
        {
          email: workerEmail,
          name: workerName,
          job_title: jobTitle,
          circle_user_id: wallet.circleUserId,
          circle_wallet_id: wallet.walletId,
          wallet_address: wallet.walletAddress,
          employer_wallet: employerWallet
        },
        { onConflict: "email" }
      )
      .select()
      .single()

    if (error) throw error

    const ratePerSecond = monthlyUsdToRate(monthlySalaryUSD)
    return NextResponse.json({
      worker,
      ratePerSecond: ratePerSecond.toString(),
      workerWalletAddress: wallet.walletAddress,
      streamParams: {
        worker: wallet.walletAddress,
        ratePerSecond: ratePerSecond.toString(),
        workerName,
        jobTitle
      }
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
