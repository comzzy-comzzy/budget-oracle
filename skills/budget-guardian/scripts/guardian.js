#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const STATE_PATH = process.env.BUDGET_ORACLE_STATE_PATH || path.join(ROOT, "assets", "state.json");

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

function readState() {
  if (!fs.existsSync(STATE_PATH)) {
    fail("State file not found. Run tracker init first.");
  }

  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch (error) {
    fail("State file is not valid JSON.", { detail: error.message });
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

function requireNumber(options, key) {
  const value = Number(options[key]);
  if (!Number.isFinite(value) || value < 0) {
    fail(`--${key} must be a non-negative number.`);
  }
  return value;
}

function totalSpent(state) {
  return state.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
}

function isPreviousPeriod(state, now = new Date()) {
  if (!state.updatedAt) {
    return false;
  }

  const updated = new Date(state.updatedAt);
  if (Number.isNaN(updated.getTime())) {
    return false;
  }

  if (state.period === "weekly") {
    return weekKey(updated) !== weekKey(now);
  }

  return updated.getUTCFullYear() !== now.getUTCFullYear() || updated.getUTCMonth() !== now.getUTCMonth();
}

function weekKey(date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-${week}`;
}

function formatAmount(amount, currency) {
  if (currency === "NGN") {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2
    }).format(amount);
  }

  if (currency === "USD" || currency === "USDC") {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2
    }).format(amount);
    return currency === "USDC" ? `${formatted} USDC` : formatted;
  }

  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} ${currency}`;
}

function buildWarnings(state, newAmount = 0) {
  const currentTotal = totalSpent(state);
  const projectedTotal = currentTotal + newAmount;
  const remaining = state.budgetLimit - currentTotal;
  const warnings = [];

  if (state.budgetLimit > 0 && projectedTotal > state.budgetLimit) {
    const overBy = projectedTotal - state.budgetLimit;
    warnings.push({
      level: "ERROR",
      code: "OVER_BUDGET",
      message: `OVER BUDGET: this puts spending ${formatAmount(overBy, state.currency)} over the ${state.period} limit.`,
      overBy
    });
  }

  if (state.budgetLimit > 0 && projectedTotal > state.budgetLimit * 0.9) {
    warnings.push({
      level: "WARN",
      code: "APPROACHING_LIMIT",
      message: `Budget usage is above 90% of the ${state.period} limit.`,
      budgetUsed: Number(((projectedTotal / state.budgetLimit) * 100).toFixed(2))
    });
  }

  if (newAmount > 0 && remaining > 0 && newAmount > remaining * 0.5) {
    warnings.push({
      level: "WARN",
      code: "HIGH_SINGLE_EXPENSE",
      message: `This expense is more than 50% of the remaining ${state.period} budget.`,
      remainingBeforeExpense: remaining
    });
  }

  if (state.income === 0) {
    warnings.push({
      level: "INFO",
      code: "NO_INCOME_SET",
      message: "No income is set for this period."
    });
  }

  if (state.budgetLimit === 0) {
    warnings.push({
      level: "INFO",
      code: "NO_BUDGET_SET",
      message: "No budget limit is set for this period."
    });
  }

  if (state.income > 0 && projectedTotal > state.income) {
    warnings.push({
      level: "WARN",
      code: "NEGATIVE_SAVINGS",
      message: "Projected spending is higher than income.",
      deficit: projectedTotal - state.income
    });
  }

  if (isPreviousPeriod(state)) {
    warnings.push({
      level: "INFO",
      code: "PERIOD_RESET_DUE",
      message: `This ${state.period} period appears to be stale. Consider running reset.`
    });
  }

  return warnings;
}

function check(options) {
  const state = readState();
  const amount = requireNumber(options, "amount");
  const currentTotal = totalSpent(state);
  const projectedTotal = currentTotal + amount;
  const warnings = buildWarnings(state, amount);

  return {
    success: true,
    action: "CHECK",
    safe: !warnings.some((warning) => warning.level === "ERROR"),
    amountChecked: amount,
    currentTotal,
    projectedTotal,
    budgetLimit: state.budgetLimit,
    warnings
  };
}

function audit() {
  const state = readState();
  const currentTotal = totalSpent(state);
  const warnings = buildWarnings(state, 0);

  return {
    success: true,
    action: "AUDIT",
    healthy: !warnings.some((warning) => warning.level === "ERROR"),
    totalSpent: currentTotal,
    budgetLimit: state.budgetLimit,
    income: state.income,
    remaining: state.budgetLimit - currentTotal,
    expenseCount: state.expenses.length,
    warnings,
    generatedAt: new Date().toISOString()
  };
}

function reset() {
  const state = readState();
  const now = new Date().toISOString();
  const archivedCount = state.expenses.length;
  state.expenses = [];
  state.createdAt = now;
  state.updatedAt = now;
  saveState(state);

  return {
    success: true,
    action: "RESET",
    period: state.period,
    archivedExpenseCount: archivedCount,
    state
  };
}

function run(command, options = {}) {
  switch (command) {
    case "check":
      return check(options);
    case "audit":
      return audit();
    case "reset":
      return reset();
    default:
      fail("Unknown guardian command.", {
        command,
        supportedCommands: ["check", "audit", "reset"]
      });
  }
}

function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  writeJson(run(command, options));
}

if (require.main === module) {
  main();
}

module.exports = {
  run,
  parseArgs,
  readState,
  buildWarnings,
  totalSpent,
  STATE_PATH
};
