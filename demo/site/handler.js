const budgetOracle = require("../../scripts/index.js");

function cleanOptions(body) {
  return Object.fromEntries(
    Object.entries(body || {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function statusPayload() {
  return {
    success: true,
    pharosNetwork: process.env.PHAROS_NETWORK || "mainnet",
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
