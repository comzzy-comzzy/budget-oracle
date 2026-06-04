#!/usr/bin/env node

const express = require("express");
const path = require("path");
const { runPayload, statusPayload } = require("./handler.js");

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

app.get("/api/status", (_request, response) => {
  response.json(statusPayload());
});

app.post(
  "/api/run",
  asyncRoute(async (request, response) => {
    response.json(await runPayload(request.body));
  })
);

app.listen(port, host, () => {
  process.stdout.write(`BudgetOracle demo site listening on http://${host}:${port}\n`);
});
