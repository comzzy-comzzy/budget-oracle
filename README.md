# 💰 BudgetOracle — Onchain Budget Tracking Multi-Skill

## Skill Name
budget-oracle

## Description
BudgetOracle is a composable agent skill for tracking expenses, enforcing budget rules, and logging financial events to Pharos Network. It works for personal finance, freelancers, small businesses, DAO treasuries, e-commerce operators, and nonprofits that need JSON-first budget automation with optional onchain audit trails.

## Sub-Skills
- expense-tracker - Adds, removes, edits, lists, and summarizes local expenses.
- budget-guardian - Checks planned expenses and emits structured warning codes.
- onchain-ledger  - Logs and verifies expense records on Pharos, or simulates safely without a wallet.

## GitHub
https://github.com/comzzy-comzzy/budget-oracle

## Demo
Run these commands from the package root:

```bash
node scripts/index.js init --period monthly --income 500000 --budget 300000 --currency NGN
node scripts/index.js add --name "Team lunch" --amount 15000 --category Food
node scripts/index.js add --name "Server costs" --amount 280000 --category Bills
node scripts/index.js summary
node scripts/index.js ledger log --name "Vendor payment" --amount 500000 --category Vendor
```

## How to Use
Install dependencies for live Pharos mode:

```bash
npm install
```

Initialize local state:

```bash
node scripts/index.js init --period monthly --income 500000 --budget 300000 --currency NGN
```

Add an expense with guardian warnings:

```bash
node scripts/index.js add --name "Team lunch" --amount 15000 --category Food
```

Check budget health:

```bash
node scripts/index.js summary
```

Log onchain or simulate without a wallet:

```bash
node scripts/index.js ledger log --name "Vendor payment" --amount 500000 --category Vendor
```

## Supported Frameworks
Claude Code, OpenAI Codex CLI, Cursor, VS Code Agent Mode, Pharos Agent Center

## Dependencies
Node.js 18+, ethers v6, dotenv

## Notes
- Runs in local mode without a wallet
- Set PHAROS_PRIVATE_KEY + BUDGET_ORACLE_CONTRACT for onchain mode
- Multi-skill: all three sub-skills can be used independently or chained
