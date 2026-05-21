import { Contract, Interface, JsonRpcProvider, Wallet } from "ethers"
import { owoStreamEthersAbi } from "@/lib/abi"
import { ARC_TESTNET_RPC, OWO_CONTRACT } from "@/lib/constants"

export type OwoStream = {
  id: bigint
  employer: string
  worker: string
  ratePerSecond: bigint
  startTime: bigint
  lastWithdrawnAt: bigint
  depositedAmount: bigint
  withdrawnAmount: bigint
  active: boolean
  workerName: string
  jobTitle: string
}

let provider: JsonRpcProvider | null = null
const owoInterface = new Interface(owoStreamEthersAbi)

export function getRpcProvider() {
  if (provider) return provider
  if (!ARC_TESTNET_RPC) throw new Error("Missing NEXT_PUBLIC_ARC_RPC")
  provider = new JsonRpcProvider(ARC_TESTNET_RPC)
  return provider
}

export function getAgentSigner() {
  const privateKey = process.env.AGENT_PRIVATE_KEY
  if (!privateKey) throw new Error("Missing AGENT_PRIVATE_KEY")
  return new Wallet(privateKey, getRpcProvider())
}

export function requireContractAddress() {
  if (!OWO_CONTRACT) throw new Error("Missing NEXT_PUBLIC_CONTRACT_ADDRESS")
  return OWO_CONTRACT
}

export function getOwoContract(signerOrProvider = getRpcProvider()) {
  return new Contract(requireContractAddress(), owoStreamEthersAbi, signerOrProvider)
}

export async function getStreamOnChain(streamId: bigint): Promise<OwoStream> {
  const stream = await getOwoContract().getStream(streamId)
  return {
    id: BigInt(stream.id),
    employer: stream.employer,
    worker: stream.worker,
    ratePerSecond: BigInt(stream.ratePerSecond),
    startTime: BigInt(stream.startTime),
    lastWithdrawnAt: BigInt(stream.lastWithdrawnAt),
    depositedAmount: BigInt(stream.depositedAmount),
    withdrawnAmount: BigInt(stream.withdrawnAmount),
    active: Boolean(stream.active),
    workerName: stream.workerName,
    jobTitle: stream.jobTitle
  }
}

export async function getEarnedSoFar(streamId: bigint) {
  return BigInt(await getOwoContract().earnedSoFar(streamId))
}

export async function getVerifiedWithdrawal(txHash: string, streamId: bigint) {
  const receipt = await getRpcProvider().getTransactionReceipt(txHash)
  if (!receipt) throw Object.assign(new Error("Withdrawal transaction is still pending"), { status: 409 })
  if (receipt.status !== 1) throw new Error("Withdrawal transaction failed on-chain")

  const contractAddress = requireContractAddress().toLowerCase()
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contractAddress) continue
    try {
      const parsed = owoInterface.parseLog(log)
      if (parsed?.name === "Withdrawn" && BigInt(parsed.args.streamId) === streamId) {
        return {
          txHash: receipt.hash,
          worker: String(parsed.args.worker),
          amount: BigInt(parsed.args.amount)
        }
      }
    } catch {
      continue
    }
  }

  throw new Error("Withdrawal event was not found in transaction receipt")
}
