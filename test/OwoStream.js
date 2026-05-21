const { expect } = require("chai")
const { ethers, network } = require("hardhat")

describe("OwoStream", function () {
  const deposit = 1_000_000n
  const rate = 10_000n

  async function deployFixture() {
    const [owner, employer, worker] = await ethers.getSigners()

    const MockERC20 = await ethers.getContractFactory("MockERC20")
    const usdc = await MockERC20.deploy("Mock USDC", "USDC", 6)
    const usyc = await MockERC20.deploy("Mock USYC", "USYC", 6)

    const OwoStream = await ethers.getContractFactory("OwoStream")
    const owo = await OwoStream.deploy(await usdc.getAddress(), await usyc.getAddress(), ethers.ZeroAddress)

    await usdc.mint(employer.address, deposit * 10n)
    await usdc.connect(employer).approve(await owo.getAddress(), deposit * 10n)

    return { owner, employer, worker, usdc, owo }
  }

  async function createStream(fixture) {
    const { employer, worker, owo } = fixture
    const tx = await owo.connect(employer).createStream(worker.address, rate, deposit, "Worker", "Engineer")
    const receipt = await tx.wait()
    const event = receipt.logs
      .map((log) => {
        try {
          return owo.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((log) => log?.name === "StreamCreated")
    return event.args.id
  }

  async function findEvent(tx, contract, eventName) {
    const receipt = await tx.wait()
    return receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog(log)
        } catch {
          return null
        }
      })
      .find((log) => log?.name === eventName)
  }

  async function increase(seconds) {
    await network.provider.send("evm_increaseTime", [seconds])
    await network.provider.send("evm_mine")
  }

  it("lets the worker withdraw earned funds", async function () {
    const fixture = await deployFixture()
    const { worker, usdc, owo } = fixture
    const streamId = await createStream(fixture)

    await increase(10)
    const event = await findEvent(await owo.connect(worker).withdrawEarned(streamId), owo, "Withdrawn")
    const paid = event.args.amount

    expect(event.args.worker).to.equal(worker.address)
    expect(paid).to.be.greaterThanOrEqual(rate * 10n)
    expect(await usdc.balanceOf(worker.address)).to.equal(paid)
    const stream = await owo.getStream(streamId)
    expect(stream.withdrawnAmount).to.equal(paid)
  })

  it("pays accrued earnings when the employer pauses a stream", async function () {
    const fixture = await deployFixture()
    const { employer, worker, usdc, owo } = fixture
    const streamId = await createStream(fixture)

    await increase(12)
    const event = await findEvent(await owo.connect(employer).pauseStream(streamId), owo, "Withdrawn")
    const paid = event.args.amount

    expect(event.args.worker).to.equal(worker.address)
    expect(paid).to.be.greaterThanOrEqual(rate * 12n)
    expect(await usdc.balanceOf(worker.address)).to.equal(paid)
    const stream = await owo.getStream(streamId)
    expect(stream.active).to.equal(false)
    expect(stream.withdrawnAmount).to.equal(paid)
    expect(await owo.earnedSoFar(streamId)).to.equal(0)
  })

  it("pays accrued earnings and refunds unearned buffer on termination", async function () {
    const fixture = await deployFixture()
    const { employer, worker, usdc, owo } = fixture
    const streamId = await createStream(fixture)
    const employerBalanceAfterDeposit = await usdc.balanceOf(employer.address)

    await increase(15)
    const event = await findEvent(await owo.connect(employer).terminateStream(streamId), owo, "StreamTerminated")
    const payout = event.args.workerPayout
    const refund = event.args.refund

    expect(payout).to.be.greaterThanOrEqual(rate * 15n)
    expect(refund).to.equal(deposit - payout)

    expect(await usdc.balanceOf(worker.address)).to.equal(payout)
    expect(await usdc.balanceOf(employer.address)).to.equal(employerBalanceAfterDeposit + refund)

    const stream = await owo.getStream(streamId)
    expect(stream.active).to.equal(false)
    expect(stream.withdrawnAmount).to.equal(payout)
    expect(stream.depositedAmount).to.equal(payout)
  })
})
