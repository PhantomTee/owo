import { ethers } from "hardhat"

async function main() {
  const usdc = process.env.NEXT_PUBLIC_USDC_ADDRESS
  const usyc = process.env.NEXT_PUBLIC_USYC_ADDRESS
  const teller = process.env.USYC_TELLER_ADDRESS
  if (!usdc || !usyc || !teller) throw new Error("Missing NEXT_PUBLIC_USDC_ADDRESS, NEXT_PUBLIC_USYC_ADDRESS, or USYC_TELLER_ADDRESS")

  const OwoStream = await ethers.getContractFactory("OwoStream")
  const owo = await OwoStream.deploy(usdc, usyc, teller)
  await owo.waitForDeployment()

  console.log(`OwoStream deployed to ${await owo.getAddress()}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
