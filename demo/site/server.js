#!/usr/bin/env node

const express = require("express");
const path = require("path");
const budgetOracle = require("../../scripts/index.js");

const app = express();
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const publicDir = path.join(__dirname, "public");

app.use(express.json({ limit: "64kb" }));
app.use(express.static(publicDir));

function asyncRoute(handler) {
  return (request, response) => {
    Promise.resolve(handler(request, response)).catch((error) => {
      response.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    });
  };
}

function cleanOptions(body) {
  return Object.fromEntries(
    Object.entries(body || {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

app.get("/api/status", (_request, response) => {
  response.json({
    success: true,
    pharosNetwork: process.env.PHAROS_NETWORK || "mainnet",
    hasPrivateKey: Boolean(process.env.PHAROS_PRIVATE_KEY),
    hasContract: Boolean(process.env.BUDGET_ORACLE_CONTRACT),
    contract: process.env.BUDGET_ORACLE_CONTRACT || null
  });
});

app.post(
  "/api/run",
  asyncRoute(async (request, response) => {
    const command = String(request.body.command || "");
    const options = cleanOptions(request.body.options);
    const tokens = options.subcommand ? [String(options.subcommand)] : [];
    delete options.subcommand;
    const result = await budgetOracle.run(command, tokens, options);
    response.json(result);
  })
);

app.listen(port, host, () => {
  process.stdout.write(`BudgetOracle demo site listening on http://${host}:${port}\n`);
});
