import "@nomicfoundation/hardhat-toolbox"
import "dotenv/config"
import type { HardhatUserConfig, NetworkUserConfig } from "hardhat/types"

const networks: Record<string, NetworkUserConfig> = {}
if (process.env.NEXT_PUBLIC_ARC_RPC && process.env.NEXT_PUBLIC_ARC_CHAIN_ID) {
  networks.arcTestnet = {
    url: process.env.NEXT_PUBLIC_ARC_RPC,
    chainId: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID),
    accounts: process.env.AGENT_PRIVATE_KEY ? [process.env.AGENT_PRIVATE_KEY] : []
  }
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks
}

export default config
