const fs = require("fs")
const path = require("path")
const solc = require("solc")

const root = process.cwd()
const contractPath = path.join(root, "contracts", "OwoStream.sol")

function findImports(importPath) {
  const candidates = [
    path.join(root, importPath),
    path.join(root, "node_modules", importPath)
  ]
  const resolved = candidates.find((candidate) => fs.existsSync(candidate))
  if (!resolved) {
    return { error: `Import not found: ${importPath}` }
  }
  return { contents: fs.readFileSync(resolved, "utf8") }
}

const source = fs.readFileSync(contractPath, "utf8")
const input = {
  language: "Solidity",
  sources: {
    "contracts/OwoStream.sol": {
      content: source
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "metadata"]
      }
    }
  }
}

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }))
const errors = output.errors || []
const fatal = errors.filter((error) => error.severity === "error")

for (const error of errors) {
  const stream = error.severity === "error" ? process.stderr : process.stdout
  stream.write(`${error.formattedMessage}\n`)
}

if (fatal.length > 0) {
  process.exit(1)
}

const contracts = output.contracts["contracts/OwoStream.sol"]
const outDir = path.join(root, "artifacts", "contracts", "OwoStream.sol")
fs.mkdirSync(outDir, { recursive: true })

for (const [name, artifact] of Object.entries(contracts)) {
  fs.writeFileSync(
    path.join(outDir, `${name}.json`),
    JSON.stringify(
      {
        _format: "hh-sol-artifact-1",
        contractName: name,
        sourceName: "contracts/OwoStream.sol",
        abi: artifact.abi,
        bytecode: `0x${artifact.evm.bytecode.object}`,
        deployedBytecode: `0x${artifact.evm.deployedBytecode.object}`,
        linkReferences: {},
        deployedLinkReferences: {},
        metadata: artifact.metadata
      },
      null,
      2
    )
  )
}

console.log(`Compiled ${Object.keys(contracts).join(", ")}`)
