#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "../../..");
const STATE_PATH = process.env.BUDGET_ORACLE_STATE_PATH || path.join(ROOT, "assets", "state.json");

const CATEGORIES = new Set([
  "Food",
  "Transport",
  "Bills",
  "Shopping",
  "Health",
  "Entertainment",
  "Rent",
  "Payroll",
  "Vendor",
  "Marketing",
  "Utilities",
  "Other"
]);

const PERIODS = new Set(["weekly", "monthly"]);
const CURRENCIES = new Set(["NGN", "USD", "PROS", "USDC"]);

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

function ensureAssetsDir() {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
}

function readState() {
  if (!fs.existsSync(STATE_PATH)) {
    fail("State file not found. Run init first.");
  }

  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch (error) {
    fail("State file is not valid JSON.", { detail: error.message });
  }
}

function saveState(state) {
  ensureAssetsDir();
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

function requireString(options, key) {
  const value = options[key];
  if (typeof value !== "string" || value.trim() === "") {
    fail(`Missing required option --${key}.`);
  }
  return value.trim();
}

function optionalString(options, key, fallback = "") {
  const value = options[key];
  return typeof value === "string" ? value.trim() : fallback;
}

function requireNumber(options, key) {
  const value = Number(options[key]);
  if (!Number.isFinite(value) || value < 0) {
    fail(`--${key} must be a non-negative number.`);
  }
  return value;
}

function requirePositiveNumber(options, key) {
  const value = requireNumber(options, key);
  if (value <= 0) {
    fail(`--${key} must be greater than zero.`);
  }
  return value;
}

function normalizeCategory(category) {
  const trimmed = category.trim();
  const match = [...CATEGORIES].find((item) => item.toLowerCase() === trimmed.toLowerCase());
  if (!match) {
    fail(`Unsupported category "${category}".`, { supportedCategories: [...CATEGORIES] });
  }
  return match;
}

function formatMoney(amount, currency) {
  const numericAmount = Number(amount) || 0;
  if (currency === "NGN") {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 2
    }).format(numericAmount);
  }

  if (currency === "USD" || currency === "USDC") {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2
    }).format(numericAmount);
    return currency === "USDC" ? `${formatted} USDC` : formatted;
  }

  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(numericAmount)} ${currency}`;
}

function percent(numerator, denominator) {
  if (!denominator) {
    return "0.00%";
  }
  return `${((numerator / denominator) * 100).toFixed(2)}%`;
}

function totalSpent(state) {
  return state.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
}

function categoryBreakdown(state) {
  const totals = new Map();
  for (const expense of state.expenses) {
    const current = totals.get(expense.category) || { category: expense.category, total: 0, count: 0 };
    current.total += Number(expense.amount || 0);
    current.count += 1;
    totals.set(expense.category, current);
  }

  return [...totals.values()]
    .sort((a, b) => b.total - a.total)
    .map((item) => ({
      ...item,
      formattedTotal: formatMoney(item.total, state.currency)
    }));
}

function buildSummary(state) {
  const spent = totalSpent(state);
  const remaining = state.budgetLimit - spent;

  return {
    period: state.period,
    currency: state.currency,
    income: {
      raw: state.income,
      formatted: formatMoney(state.income, state.currency)
    },
    budgetLimit: {
      raw: state.budgetLimit,
      formatted: formatMoney(state.budgetLimit, state.currency)
    },
    totalSpent: {
      raw: spent,
      formatted: formatMoney(spent, state.currency)
    },
    remaining: {
      raw: remaining,
      formatted: formatMoney(remaining, state.currency)
    },
    overBudget: state.budgetLimit > 0 && spent > state.budgetLimit,
    budgetUsed: percent(spent, state.budgetLimit),
    savingsRate: percent(state.income - spent, state.income),
    expenseCount: state.expenses.length,
    categoryBreakdown: categoryBreakdown(state),
    recentExpenses: state.expenses.slice(-5).reverse(),
    generatedAt: new Date().toISOString()
  };
}

function newExpenseId() {
  return crypto.randomBytes(4).toString("hex");
}

function init(options) {
  const period = requireString(options, "period").toLowerCase();
  if (!PERIODS.has(period)) {
    fail("--period must be weekly or monthly.");
  }

  const currency = requireString(options, "currency").toUpperCase();
  if (!CURRENCIES.has(currency)) {
    fail("--currency must be one of NGN, USD, PROS, or USDC.");
  }

  const now = new Date().toISOString();
  const state = {
    period,
    income: requireNumber(options, "income"),
    budgetLimit: requireNumber({ budget: options.budget }, "budget"),
    currency,
    expenses: [],
    createdAt: now,
    updatedAt: now
  };

  saveState(state);
  return {
    success: true,
    action: "INIT",
    statePath: STATE_PATH,
    state,
    summary: buildSummary(state)
  };
}

function add(options) {
  const state = readState();
  const now = new Date().toISOString();
  const expense = {
    id: newExpenseId(),
    name: requireString(options, "name"),
    amount: requirePositiveNumber(options, "amount"),
    category: normalizeCategory(requireString(options, "category")),
    note: optionalString(options, "note"),
    date: now,
    onchain: false,
    txHash: null
  };

  state.expenses.push(expense);
  state.updatedAt = now;
  saveState(state);

  return {
    success: true,
    action: "ADD",
    expense,
    summary: buildSummary(state)
  };
}

function remove(options) {
  const state = readState();
  const id = requireString(options, "id");
  const index = state.expenses.findIndex((expense) => expense.id === id);
  if (index === -1) {
    fail(`Expense "${id}" not found.`);
  }

  const [removed] = state.expenses.splice(index, 1);
  state.updatedAt = new Date().toISOString();
  saveState(state);

  return {
    success: true,
    action: "REMOVE",
    removed,
    summary: buildSummary(state)
  };
}

function edit(options) {
  const state = readState();
  const id = requireString(options, "id");
  const expense = state.expenses.find((item) => item.id === id);
  if (!expense) {
    fail(`Expense "${id}" not found.`);
  }

  if (options.amount !== undefined) {
    expense.amount = requirePositiveNumber(options, "amount");
  }
  if (options.name !== undefined) {
    expense.name = requireString(options, "name");
  }
  if (options.category !== undefined) {
    expense.category = normalizeCategory(requireString(options, "category"));
  }
  if (options.note !== undefined) {
    expense.note = optionalString(options, "note");
  }

  state.updatedAt = new Date().toISOString();
  saveState(state);

  return {
    success: true,
    action: "EDIT",
    expense,
    summary: buildSummary(state)
  };
}

function list(options) {
  const state = readState();
  let expenses = [...state.expenses].reverse();

  if (options.category !== undefined) {
    const category = normalizeCategory(requireString(options, "category"));
    expenses = expenses.filter((expense) => expense.category === category);
  }

  if (options.limit !== undefined) {
    const limit = Math.trunc(requirePositiveNumber(options, "limit"));
    expenses = expenses.slice(0, limit);
  }

  return {
    success: true,
    action: "LIST",
    count: expenses.length,
    expenses
  };
}

function summary() {
  const state = readState();
  return {
    success: true,
    action: "SUMMARY",
    summary: buildSummary(state)
  };
}

function run(command, options = {}) {
  switch (command) {
    case "init":
      return init(options);
    case "add":
      return add(options);
    case "remove":
      return remove(options);
    case "edit":
      return edit(options);
    case "list":
      return list(options);
    case "summary":
      return summary(options);
    default:
      fail("Unknown tracker command.", {
        command,
        supportedCommands: ["init", "add", "remove", "edit", "list", "summary"]
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
  saveState,
  buildSummary,
  totalSpent,
  STATE_PATH,
  CATEGORIES: [...CATEGORIES]
};
