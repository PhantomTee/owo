export const owoStreamAbi = [
  {
    type: "function",
    name: "createStream",
    stateMutability: "nonpayable",
    inputs: [
      { name: "worker", type: "address" },
      { name: "ratePerSecond", type: "uint256" },
      { name: "initialDeposit", type: "uint256" },
      { name: "workerName", type: "string" },
      { name: "jobTitle", type: "string" }
    ],
    outputs: [{ name: "streamId", type: "uint256" }]
  },
  {
    type: "function",
    name: "depositMore",
    stateMutability: "nonpayable",
    inputs: [
      { name: "streamId", type: "uint256" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "withdrawEarned",
    stateMutability: "nonpayable",
    inputs: [{ name: "streamId", type: "uint256" }],
    outputs: [{ name: "amount", type: "uint256" }]
  },
  {
    type: "function",
    name: "pauseStream",
    stateMutability: "nonpayable",
    inputs: [{ name: "streamId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "resumeStream",
    stateMutability: "nonpayable",
    inputs: [{ name: "streamId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "terminateStream",
    stateMutability: "nonpayable",
    inputs: [{ name: "streamId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "earnedSoFar",
    stateMutability: "view",
    inputs: [{ name: "streamId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getStream",
    stateMutability: "view",
    inputs: [{ name: "streamId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "employer", type: "address" },
          { name: "worker", type: "address" },
          { name: "ratePerSecond", type: "uint256" },
          { name: "startTime", type: "uint256" },
          { name: "lastWithdrawnAt", type: "uint256" },
          { name: "depositedAmount", type: "uint256" },
          { name: "withdrawnAmount", type: "uint256" },
          { name: "active", type: "bool" },
          { name: "workerName", type: "string" },
          { name: "jobTitle", type: "string" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "getEmployerStreams",
    stateMutability: "view",
    inputs: [{ name: "employer", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }]
  },
  {
    type: "function",
    name: "getWorkerStreams",
    stateMutability: "view",
    inputs: [{ name: "worker", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }]
  },
  {
    type: "event",
    name: "StreamCreated",
    inputs: [
      { indexed: true, name: "id", type: "uint256" },
      { indexed: true, name: "employer", type: "address" },
      { indexed: true, name: "worker", type: "address" },
      { indexed: false, name: "ratePerSecond", type: "uint256" },
      { indexed: false, name: "deposit", type: "uint256" }
    ]
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { indexed: true, name: "streamId", type: "uint256" },
      { indexed: true, name: "worker", type: "address" },
      { indexed: false, name: "amount", type: "uint256" }
    ]
  },
  {
    type: "event",
    name: "StreamTerminated",
    inputs: [
      { indexed: true, name: "streamId", type: "uint256" },
      { indexed: false, name: "workerPayout", type: "uint256" },
      { indexed: false, name: "refund", type: "uint256" }
    ]
  }
] as const

export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const

export const owoStreamEthersAbi = [
  "function createStream(address worker,uint256 ratePerSecond,uint256 initialDeposit,string workerName,string jobTitle) returns (uint256)",
  "function depositMore(uint256 streamId,uint256 amount)",
  "function withdrawEarned(uint256 streamId) returns (uint256)",
  "function pauseStream(uint256 streamId)",
  "function resumeStream(uint256 streamId)",
  "function terminateStream(uint256 streamId)",
  "function earnedSoFar(uint256 streamId) view returns (uint256)",
  "function getEmployerStreams(address employer) view returns (uint256[])",
  "function getWorkerStreams(address worker) view returns (uint256[])",
  "function getStream(uint256 streamId) view returns (tuple(uint256 id,address employer,address worker,uint256 ratePerSecond,uint256 startTime,uint256 lastWithdrawnAt,uint256 depositedAmount,uint256 withdrawnAmount,bool active,string workerName,string jobTitle))",
  "event StreamCreated(uint256 indexed id,address indexed employer,address indexed worker,uint256 ratePerSecond,uint256 deposit)",
  "event Withdrawn(uint256 indexed streamId,address indexed worker,uint256 amount)",
  "event StreamTerminated(uint256 indexed streamId,uint256 workerPayout,uint256 refund)"
]

export const erc20EthersAbi = [
  "function approve(address spender,uint256 amount) returns (bool)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
]
