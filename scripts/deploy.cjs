"use strict"
require("dotenv/config")
const hre = require("hardhat")

async function main() {
  const usdc = process.env.NEXT_PUBLIC_USDC_ADDRESS
  const usyc = process.env.NEXT_PUBLIC_USYC_ADDRESS
  const teller = process.env.USYC_TELLER_ADDRESS
  if (!usdc || !usyc || !teller) {
    throw new Error("Missing NEXT_PUBLIC_USDC_ADDRESS, NEXT_PUBLIC_USYC_ADDRESS, or USYC_TELLER_ADDRESS in .env")
  }

  const OwoStream = await hre.ethers.getContractFactory("OwoStream")
  console.log("Deploying OwoStream…")
  const owo = await OwoStream.deploy(usdc, usyc, teller)
  await owo.waitForDeployment()

  const address = await owo.getAddress()
  console.log(`OwoStream deployed to: ${address}`)
  console.log(`\nAdd this to your .env:\nNEXT_PUBLIC_CONTRACT_ADDRESS=${address}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
