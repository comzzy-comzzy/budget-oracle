const budgetOracle = require("../../scripts/index.js");

const NETWORKS = {
  mainnet: {
    name: "mainnet",
    displayName: "Pharos Pacific Ocean Mainnet",
    chainId: 1672,
    rpcUrl: "https://rpc.pharos.xyz",
    explorerUrl: "https://pharosscan.xyz",
    currency: "PROS"
  },
  testnet: {
    name: "testnet",
    displayName: "Pharos Atlantic Testnet",
    chainId: 688689,
    rpcUrl: "https://atlantic.dplabs-internal.com",
    explorerUrl: "https://atlantic.pharosscan.xyz",
    currency: "PROS"
  }
};

const NETWORK_ALIASES = {
  mainnet: "mainnet",
  pharos: "mainnet",
  testnet: "testnet",
  atlantic: "testnet",
  "atlantic-testnet": "testnet"
};

function cleanOptions(body) {
  return Object.fromEntries(
    Object.entries(body || {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function resolveNetworkStatus() {
  const rawNetwork = process.env.PHAROS_NETWORK || "mainnet";
  const key = NETWORK_ALIASES[String(rawNetwork).trim().toLowerCase()] || "mainnet";
  const network = NETWORKS[key];

  return {
    ...network,
    rpcUrl: process.env.PHAROS_RPC_URL || network.rpcUrl
  };
}

function statusPayload() {
  const network = resolveNetworkStatus();

  return {
    success: true,
    pharosNetwork: network.name,
    pharosChainName: network.displayName,
    chainId: network.chainId,
    rpcUrl: network.rpcUrl,
    explorerUrl: network.explorerUrl,
    currency: network.currency,
    hasPrivateKey: Boolean(process.env.PHAROS_PRIVATE_KEY),
    hasContract: Boolean(process.env.BUDGET_ORACLE_CONTRACT),
    contract: process.env.BUDGET_ORACLE_CONTRACT || null
  };
}

async function runPayload(body = {}) {
  const command = String(body.command || "");
  const options = cleanOptions(body.options);
  const tokens = options.subcommand ? [String(options.subcommand)] : [];
  delete options.subcommand;
  return budgetOracle.run(command, tokens, options);
}

module.exports = {
  statusPayload,
  runPayload
};
