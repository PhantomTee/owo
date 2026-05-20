type CircleWalletResult = {
  circleUserId: string
  walletAddress: string
  walletId?: string
  sessionToken?: string
}

async function circleFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiKey = process.env.CIRCLE_API_KEY
  const baseUrl = process.env.CIRCLE_W3S_BASE_URL
  if (!apiKey) throw new Error("Missing CIRCLE_API_KEY")
  if (!baseUrl) throw new Error("Missing CIRCLE_W3S_BASE_URL")
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers || {})
    }
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.message || `Circle API failed: ${res.status}`)
  return json as T
}

export async function createOrLoadWorkerWallet(email: string): Promise<CircleWalletResult> {
  const userId = email.toLowerCase().trim()
  const blockchain = process.env.CIRCLE_ARC_BLOCKCHAIN
  if (!blockchain) throw new Error("Missing CIRCLE_ARC_BLOCKCHAIN")

  await circleFetch("/users", {
    method: "POST",
    body: JSON.stringify({ userId })
  }).catch((error) => {
    if (!String(error.message).toLowerCase().includes("already")) throw error
  })

  const tokenResponse = await circleFetch<{ data?: { userToken?: string; encryptionKey?: string } }>("/users/token", {
    method: "POST",
    body: JSON.stringify({ userId })
  })

  const walletResponse = await circleFetch<{
    data?: { wallets?: Array<{ id: string; address: string }> }
  }>("/user/wallets", {
    method: "POST",
    body: JSON.stringify({
      userToken: tokenResponse.data?.userToken,
      blockchains: [blockchain],
      accountType: "SCA"
    })
  }).catch(async () => {
    return circleFetch<{ data?: { wallets?: Array<{ id: string; address: string }> } }>(
      `/wallets?userId=${encodeURIComponent(userId)}`
    )
  })

  const wallet = walletResponse.data?.wallets?.[0]
  if (!wallet?.address) throw new Error("Circle did not return a worker wallet address")

  return {
    circleUserId: userId,
    walletAddress: wallet.address,
    walletId: wallet.id,
    sessionToken: tokenResponse.data?.userToken
  }
}

export async function createCircleWithdrawChallenge(input: {
  userToken: string
  walletId: string
  contractAddress: string
  streamId: bigint
}) {
  const apiKey = process.env.CIRCLE_API_KEY
  const baseUrl = process.env.CIRCLE_W3S_BASE_URL
  if (!apiKey) throw new Error("Missing CIRCLE_API_KEY")
  if (!baseUrl) throw new Error("Missing CIRCLE_W3S_BASE_URL")
  const res = await fetch(`${baseUrl}/user/transactions/contractExecution`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-User-Token": input.userToken
    },
    body: JSON.stringify({
      idempotencyKey: crypto.randomUUID(),
      contractAddress: input.contractAddress,
      walletId: input.walletId,
      abiFunctionSignature: "withdrawEarned(uint256)",
      abiParameters: [input.streamId.toString()],
      feeLevel: "MEDIUM",
      refId: `owo-withdraw-${input.streamId.toString()}`
    })
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.message || `Circle withdrawal challenge failed: ${res.status}`)
  return json as { data?: { challengeId?: string } }
}
