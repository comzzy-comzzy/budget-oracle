#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "../../..");
const ENV_PATH = path.join(ROOT, ".env");
const NETWORKS = {
  mainnet: {
    name: "mainnet",
    chainId: 50002,
    rpcUrl: "https://rpc.pharos.network",
    explorerUrl: "https://pharosscan.xyz"
  },
  testnet: {
    name: "testnet",
    chainId: 688689,
    rpcUrl: "https://atlantic.dplabs-internal.com",
    explorerUrl: "https://atlantic.pharosscan.xyz"
  }
};

const NETWORK_ALIASES = {
  mainnet: "mainnet",
  pharos: "mainnet",
  testnet: "testnet",
  atlantic: "testnet",
  "atlantic-testnet": "testnet"
};
const LOGGER_ABI = [
  "function logExpense(bytes32 expenseHash, uint256 amount, string category) external",
  "function reverseExpense(bytes32 expenseHash, string reason) external",
  "function expenseRecords(bytes32 expenseHash) external view returns (bytes32 expenseHashOut, address logger, uint256 amount, string category, uint256 timestamp, bool reversed)",
  "function getSummary(address owner) external view returns (uint256 totalSpent, uint256 budgetLimit, uint256 income, string period, bool overBudget)",
  "function getUserExpenses(address owner) external view returns (bytes32[] memory)",
  "function isOverBudget(address owner) external view returns (bool, uint256 overBy)"
];

loadDotEnv();

function loadDotEnv() {
  if (!fs.existsSync(ENV_PATH)) {
    return;
  }

  for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    value = value.replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const [command, ...tokens] = argv;
  const options = {};

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = tokens[i + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = next;
      i += 1;
    }
  }

  return { command, options };
}

function writeJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function fail(message, extra = {}) {
  process.stderr.write(`${JSON.stringify({ success: false, error: message, ...extra }, null, 2)}\n`);
  process.exit(1);
}

function requireString(options, key) {
  const value = options[key];
  if (typeof value !== "string" || value.trim() === "") {
    fail(`Missing required option --${key}.`);
  }
  return value.trim();
}

function requireNumber(options, key) {
  const value = Number(options[key]);
  if (!Number.isFinite(value) || value < 0) {
    fail(`--${key} must be a non-negative number.`);
  }
  return value;
}

function normalizeHash(hash) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    fail("--hash must be a 32-byte hex string.");
  }
  return hash.toLowerCase();
}

function isLiveConfigured() {
  return Boolean(process.env.PHAROS_PRIVATE_KEY && process.env.BUDGET_ORACLE_CONTRACT);
}

function simulationMessage() {
  return "Wallet not configured, running in simulation.";
}

function expenseHash(expense) {
  return `0x${crypto.createHash("sha256").update(JSON.stringify(expense)).digest("hex")}`;
}

function resolveNetwork(name = process.env.PHAROS_NETWORK || "mainnet") {
  const key = NETWORK_ALIASES[String(name).trim().toLowerCase()];
  if (!key) {
    fail("Unsupported PHAROS_NETWORK.", {
      network: name,
      supportedNetworks: Object.keys(NETWORK_ALIASES)
    });
  }
  return NETWORKS[key];
}

function buildProviderConfig() {
  const network = resolveNetwork();
  return {
    network: network.name,
    rpcUrl: process.env.PHAROS_RPC_URL || network.rpcUrl,
    contract: process.env.BUDGET_ORACLE_CONTRACT,
    chainId: network.chainId,
    explorerUrl: network.explorerUrl
  };
}

async function getContract() {
  let ethers;
  try {
    ({ ethers } = require("ethers"));
  } catch (error) {
    fail("ethers is required for live Pharos mode. Run npm install or leave wallet settings blank for simulated mode.", {
      detail: error.message
    });
  }

  const config = buildProviderConfig();
  const provider = new ethers.JsonRpcProvider(config.rpcUrl, config.chainId);
  const wallet = new ethers.Wallet(process.env.PHAROS_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(process.env.BUDGET_ORACLE_CONTRACT, LOGGER_ABI, wallet);
  return { ethers, provider, wallet, contract };
}

async function logExpense(options) {
  const timestamp = new Date().toISOString();
  const expense = {
    name: requireString(options, "name"),
    amount: requireNumber(options, "amount"),
    category: requireString(options, "category"),
    currency: options.currency ? String(options.currency).trim().toUpperCase() : "NGN",
    timestamp
  };
  const hash = expenseHash(expense);

  if (!isLiveConfigured()) {
    const config = buildProviderConfig();
    return {
      success: true,
      mode: "SIMULATED",
      network: config.network,
      chainId: config.chainId,
      expenseHash: hash,
      txHash: null,
      blockNumber: null,
      pharosExplorer: null,
      expense,
      message: simulationMessage()
    };
  }

  const config = buildProviderConfig();
  const { contract } = await getContract();
  const tx = await contract.logExpense(hash, BigInt(Math.trunc(expense.amount)), expense.category);
  const receipt = await tx.wait();

  return {
    success: true,
    mode: "ONCHAIN",
    network: config.network,
    chainId: config.chainId,
    expenseHash: hash,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    pharosExplorer: `${config.explorerUrl}/tx/${receipt.hash}`,
    expense,
    message: "Expense logged onchain on Pharos."
  };
}

async function reverse(options) {
  const hash = normalizeHash(requireString(options, "hash"));
  const reason = requireString(options, "reason");

  if (!isLiveConfigured()) {
    const config = buildProviderConfig();
    return {
      success: true,
      mode: "SIMULATED",
      network: config.network,
      chainId: config.chainId,
      expenseHash: hash,
      txHash: null,
      blockNumber: null,
      pharosExplorer: null,
      reversal: {
        reason,
        timestamp: new Date().toISOString()
      },
      message: simulationMessage()
    };
  }

  const config = buildProviderConfig();
  const { contract } = await getContract();
  const tx = await contract.reverseExpense(hash, reason);
  const receipt = await tx.wait();

  return {
    success: true,
    mode: "ONCHAIN",
    network: config.network,
    chainId: config.chainId,
    expenseHash: hash,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    pharosExplorer: `${config.explorerUrl}/tx/${receipt.hash}`,
    message: "Expense reversed onchain on Pharos."
  };
}

async function verify(options) {
  const hash = normalizeHash(requireString(options, "hash"));

  if (!isLiveConfigured()) {
    const config = buildProviderConfig();
    return {
      success: true,
      mode: "SIMULATED",
      network: config.network,
      chainId: config.chainId,
      expenseHash: hash,
      verified: false,
      txHash: null,
      pharosExplorer: null,
      message: simulationMessage()
    };
  }

  const config = buildProviderConfig();
  const { contract } = await getContract();
  const record = await contract.expenseRecords(hash);

  return {
    success: true,
    mode: "ONCHAIN",
    network: config.network,
    chainId: config.chainId,
    expenseHash: hash,
    verified: record.timestamp > 0n,
    record: {
      expenseHash: record.expenseHash,
      logger: record.logger,
      amount: Number(record.amount),
      category: record.category,
      timestamp: Number(record.timestamp),
      reversed: record.reversed
    },
    pharosExplorer: `${config.explorerUrl}/address/${config.contract}`
  };
}

async function history(options) {
  const address = requireString(options, "address");

  if (!isLiveConfigured()) {
    const config = buildProviderConfig();
    return {
      success: true,
      mode: "SIMULATED",
      network: config.network,
      chainId: config.chainId,
      address,
      expenseHashes: [],
      count: 0,
      pharosExplorer: null,
      message: simulationMessage()
    };
  }

  const config = buildProviderConfig();
  const { contract } = await getContract();
  const expenseHashes = await contract.getUserExpenses(address);

  return {
    success: true,
    mode: "ONCHAIN",
    network: config.network,
    chainId: config.chainId,
    address,
    expenseHashes,
    count: expenseHashes.length,
    pharosExplorer: `${config.explorerUrl}/address/${address}`
  };
}

async function run(command, options = {}) {
  try {
    switch (command) {
      case "log":
        return await logExpense(options);
      case "reverse":
        return await reverse(options);
      case "verify":
        return await verify(options);
      case "history":
        return await history(options);
      default:
        fail("Unknown ledger command.", {
          command,
          supportedCommands: ["log", "reverse", "verify", "history"]
        });
    }
  } catch (error) {
    fail(error.message || "Ledger command failed.");
  }
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  writeJson(await run(command, options));
}

if (require.main === module) {
  main();
}

module.exports = {
  run,
  parseArgs,
  expenseHash,
  isLiveConfigured,
  buildProviderConfig,
  resolveNetwork,
  NETWORKS
};
