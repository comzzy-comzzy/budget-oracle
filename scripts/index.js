#!/usr/bin/env node

const tracker = require("../skills/expense-tracker/scripts/tracker.js");
const guardian = require("../skills/budget-guardian/scripts/guardian.js");
const ledger = require("../skills/onchain-ledger/scripts/ledger.js");

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

  return { command, tokens, options };
}

function writeJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function fail(message, extra = {}) {
  process.stderr.write(`${JSON.stringify({ success: false, error: message, ...extra }, null, 2)}\n`);
  process.exit(1);
}

async function combinedAdd(options) {
  if (options.amount === undefined) {
    fail("Missing required option --amount.");
  }

  const guardianOutput = guardian.run("check", { amount: options.amount });
  const trackerOutput = tracker.run("add", options);

  return {
    success: true,
    action: "ADD_WITH_GUARDIAN",
    safe: guardianOutput.safe,
    warnings: guardianOutput.warnings,
    guardian: guardianOutput,
    tracker: trackerOutput
  };
}

function combinedSummary() {
  const trackerOutput = tracker.run("summary");
  const guardianOutput = guardian.run("audit");

  return {
    success: true,
    action: "SUMMARY_WITH_AUDIT",
    summary: trackerOutput.summary,
    audit: guardianOutput
  };
}

async function run(command, tokens, options) {
  switch (command) {
    case "tracker": {
      const sub = parseArgs(tokens);
      return tracker.run(sub.command, sub.options);
    }
    case "guardian": {
      const sub = parseArgs(tokens);
      return guardian.run(sub.command, sub.options);
    }
    case "ledger": {
      const sub = parseArgs(tokens);
      return ledger.run(sub.command, sub.options);
    }
    case "init":
      return tracker.run("init", options);
    case "add":
      return combinedAdd(options);
    case "remove":
      return tracker.run("remove", options);
    case "summary":
      return combinedSummary();
    case "log":
      return ledger.run("log", options);
    default:
      fail("Unknown budget-oracle command.", {
        command,
        supportedCommands: [
          "tracker <command>",
          "guardian <command>",
          "ledger <command>",
          "init",
          "add",
          "remove",
          "summary",
          "log"
        ]
      });
  }
}

async function main() {
  const { command, tokens, options } = parseArgs(process.argv.slice(2));

  try {
    writeJson(await run(command, tokens, options));
  } catch (error) {
    fail(error.message || "Command failed.");
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  run,
  parseArgs
};
