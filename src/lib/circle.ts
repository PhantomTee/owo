async function circleFetch<T>(path: string, init: RequestInit = {}, userToken?: string): Promise<T> {
  const apiKey = process.env.CIRCLE_API_KEY
  const baseUrl = process.env.CIRCLE_W3S_BASE_URL
  if (!apiKey) throw new Error("Missing CIRCLE_API_KEY")
  if (!baseUrl) throw new Error("Missing CIRCLE_W3S_BASE_URL")
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(userToken ? { "X-User-Token": userToken } : {}),
      ...(init.headers || {})
    }
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(json?.message || `Circle API error: ${res.status}`), { code: json?.code })
  return json as T
}

/** Step 1 — Idempotently create a Circle user for this worker email */
export async function ensureCircleUser(email: string): Promise<void> {
  const userId = email.toLowerCase().trim()
  await circleFetch("/users", {
    method: "POST",
    body: JSON.stringify({ userId })
  }).catch((err) => {
    if (!String(err.message).toLowerCase().includes("already")) throw err
  })
}

/** Step 2 — Get a short-lived userToken + encryptionKey for this worker */
export async function getCircleUserToken(email: string): Promise<{ userToken: string; encryptionKey: string }> {
  const userId = email.toLowerCase().trim()
  const res = await circleFetch<{ data?: { userToken?: string; encryptionKey?: string } }>("/users/token", {
    method: "POST",
    body: JSON.stringify({ userId })
  })
  const userToken = res.data?.userToken
  const encryptionKey = res.data?.encryptionKey
  if (!userToken || !encryptionKey) throw new Error("Circle did not return a user token")
  return { userToken, encryptionKey }
}

/** Step 3 — Initialize user on Circle, returns challengeId for PIN setup.
 *  Throws with code 155106 if user is already initialized. */
export async function initializeCircleUser(userToken: string): Promise<string> {
  const blockchain = process.env.CIRCLE_ARC_BLOCKCHAIN
  if (!blockchain) throw new Error("Missing CIRCLE_ARC_BLOCKCHAIN")
  const res = await circleFetch<{ data?: { challengeId?: string } }>(
    "/user/initialize",
    { method: "POST", body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), accountType: "SCA", blockchains: [blockchain] }) },
    userToken
  )
  const challengeId = res.data?.challengeId
  if (!challengeId) throw new Error("Circle did not return an initialization challengeId")
  return challengeId
}

/** After PIN challenge is executed, list the worker's wallets and return the primary address */
export async function getCircleWalletAddress(userToken: string): Promise<{ address: string; walletId: string }> {
  const res = await circleFetch<{ data?: { wallets?: Array<{ id: string; address: string }> } }>(
    "/wallets",
    { method: "GET" },
    userToken
  )
  const wallet = res.data?.wallets?.[0]
  if (!wallet?.address) throw new Error("No Circle wallet found for this user")
  return { address: wallet.address, walletId: wallet.id }
}

/** Used by the withdrawal flow — create a contract execution challenge for withdrawEarned */
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
