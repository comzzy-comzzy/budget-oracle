---
name: budget-oracle
description: Multi-skill budget system for expense tracking, budget guardrails, and Pharos onchain financial logs. Use when a user or agent needs to record personal or business expenses, enforce spending limits, summarize weekly or monthly budgets, issue machine-readable warnings, or create a verifiable audit trail on Pharos Network. Includes expense-tracker, budget-guardian, and onchain-ledger sub-skills that can run independently or be chained.
license: MIT
metadata:
  author: kane_120
  version: "1.0.0"
  pharos-chain-id: "50002"
  pharos-rpc: https://rpc.pharos.network
---

# BudgetOracle

BudgetOracle is a composable multi-skill for local expense tracking, budget enforcement, and optional Pharos onchain logging.

## Setup

Run from the package root:

```bash
npm install
npm run check
```

Use the unified CLI for normal workflows:

```bash
npm run dev -- init --period monthly --income 500000 --budget 300000 --currency NGN
npm run dev -- add --name "Team lunch" --amount 15000 --category Food
npm run dev -- summary
npm run dev -- ledger log --name "Vendor payment" --amount 500000 --category Vendor
```

## Sub-Skills

- `skills/expense-tracker/SKILL.md`: add, remove, edit, list, and summarize local expenses.
- `skills/budget-guardian/SKILL.md`: check new spending and audit budget health with warning codes.
- `skills/onchain-ledger/SKILL.md`: log, reverse, verify, and list expense hashes on Pharos, with simulated mode when wallet settings are missing.

## Prompt Patterns

Use BudgetOracle when users ask to:

- Initialize a weekly or monthly budget with income, limit, and currency.
- Add, remove, edit, or list an expense.
- Check whether a planned purchase is safe.
- Summarize spending, savings rate, or category breakdowns.
- Warn before payroll, vendor, marketing, utilities, or DAO treasury spend.
- Log a financial record on Pharos or verify a previous expense hash.
- Produce JSON that another agent or workflow can consume.

## Local And Onchain Modes

Local mode works with no wallet and stores state in `assets/state.json`.

Onchain mode uses Pharos Network:

- Chain ID: `50002`
- RPC: `https://rpc.pharos.network`
- Explorer: `https://pharosscan.xyz`

Set `PHAROS_PRIVATE_KEY` and `BUDGET_ORACLE_CONTRACT` for live mode. If either is missing, onchain-ledger returns simulated JSON instead of crashing.

## Chaining Flow

For `npm run dev -- add`:

1. `budget-guardian check --amount <num>` evaluates the planned expense.
2. The expense is still recorded if `OVER_BUDGET` appears.
3. `expense-tracker add` writes the expense to local state.
4. The unified CLI returns guardian warnings and tracker output together.

For `npm run dev -- summary`:

1. `expense-tracker summary` builds totals and category breakdowns.
2. `budget-guardian audit` adds budget health warnings.
3. The unified CLI returns both in one JSON object.

## Warning Codes

| Code | Level | Trigger |
| --- | --- | --- |
| `OVER_BUDGET` | ERROR | Total or projected spend is greater than budget limit |
| `APPROACHING_LIMIT` | WARN | Total or projected spend is above 90% of budget limit |
| `HIGH_SINGLE_EXPENSE` | WARN | New amount is more than 50% of remaining budget |
| `NO_INCOME_SET` | INFO | Income is zero |
| `NO_BUDGET_SET` | INFO | Budget limit is zero |
| `NEGATIVE_SAVINGS` | WARN | Total or projected spend is greater than income |
| `PERIOD_RESET_DUE` | INFO | State was last updated in a previous week or month |

## Business Use Cases

| User | BudgetOracle Use |
| --- | --- |
| Individual | Daily expense tracking, savings rate, weekly or monthly reviews |
| Freelancer | Client project budgets, invoice expense logs, proof of work records |
| Small Business | Payroll, vendor payments, utilities, marketing, monthly P&L snapshot |
| DAO Treasury | Agent treasury guardrails and onchain-verifiable spend history |
| E-commerce Store | Inventory, campaign spend, revenue-aware operating budget |
| NGO/Nonprofit | Donor allocation tracking and transparent expenditure reporting |

For detailed examples, read `references/BUSINESS_USECASES.md`. For JSON output contracts, read `references/OUTPUT_FORMAT.md`. For Pharos setup, read `references/PHAROS.md`.
