#!/usr/bin/env node

const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");

const tempDir = mkdtempSync(path.join(tmpdir(), "budget-oracle-"));
process.env.BUDGET_ORACLE_STATE_PATH = path.join(tempDir, "state.json");

const tracker = require("../skills/expense-tracker/scripts/tracker.js");
const guardian = require("../skills/budget-guardian/scripts/guardian.js");
const ledger = require("../skills/onchain-ledger/scripts/ledger.js");
const cli = require("./index.js");

async function main() {
  const init = tracker.run("init", {
    period: "monthly",
    income: "500000",
    budget: "300000",
    currency: "NGN"
  });
  assert.equal(init.success, true);
  assert.equal(init.summary.expenseCount, 0);

  const lunch = await cli.run("add", [], {
    name: "Team lunch",
    amount: "15000",
    category: "Food"
  });
  assert.equal(lunch.success, true);
  assert.equal(lunch.safe, true);
  assert.equal(lunch.tracker.summary.totalSpent.raw, 15000);

  const server = await cli.run("add", [], {
    name: "Server costs",
    amount: "280000",
    category: "Bills"
  });
  assert.equal(server.success, true);
  assert.deepEqual(
    server.warnings.map((warning) => warning.code),
    ["APPROACHING_LIMIT", "HIGH_SINGLE_EXPENSE"]
  );

  const summary = await cli.run("summary", [], {});
  assert.equal(summary.summary.totalSpent.raw, 295000);
  assert.equal(summary.audit.warnings[0].code, "APPROACHING_LIMIT");

  const overBudget = guardian.run("check", { amount: "6000" });
  assert.equal(overBudget.safe, false);
  assert.equal(overBudget.warnings[0].code, "OVER_BUDGET");

  const simulatedLog = await ledger.run("log", {
    name: "Vendor payment",
    amount: "500000",
    category: "Vendor"
  });
  assert.equal(simulatedLog.success, true);
  assert.equal(simulatedLog.mode, "SIMULATED");
  assert.equal(simulatedLog.network, "mainnet");
  assert.equal(simulatedLog.chainId, 50002);
  assert.equal(simulatedLog.txHash, null);

  process.env.PHAROS_NETWORK = "testnet";
  const testnetLog = await ledger.run("log", {
    name: "Testnet vendor payment",
    amount: "1000",
    category: "Vendor"
  });
  assert.equal(testnetLog.success, true);
  assert.equal(testnetLog.mode, "SIMULATED");
  assert.equal(testnetLog.network, "testnet");
  assert.equal(testnetLog.chainId, 688689);

  process.stdout.write(
    `${JSON.stringify(
      {
        success: true,
        checks: [
          "tracker init",
          "guardian add checks",
          "summary audit",
          "over-budget warning",
          "mainnet ledger simulation",
          "testnet ledger simulation"
        ]
      },
      null,
      2
    )}\n`
  );
}

main()
  .catch((error) => {
    process.stderr.write(`${JSON.stringify({ success: false, error: error.message }, null, 2)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });
