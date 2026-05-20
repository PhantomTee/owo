import { NextResponse } from "next/server"
import { getEarnedSoFar, getStreamOnChain } from "@/lib/contract"

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const streamId = BigInt(params.id)
    const [earnedSoFar, stream] = await Promise.all([getEarnedSoFar(streamId), getStreamOnChain(streamId)])
    const remainingBuffer = stream.depositedAmount - stream.withdrawnAmount - earnedSoFar
    return NextResponse.json({
      earnedSoFar: earnedSoFar.toString(),
      remainingBuffer: remainingBuffer > BigInt(0) ? remainingBuffer.toString() : "0",
      ratePerSecond: stream.ratePerSecond.toString(),
      workerAddress: stream.worker,
      active: stream.active,
      startTime: stream.startTime.toString(),
      withdrawnAmount: stream.withdrawnAmount.toString()
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
