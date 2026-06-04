# BudgetOracle

BudgetOracle is a Pharos Agent Center skill for budget tracking, spending guardrails, and optional onchain expense logs. It keeps a local JSON budget, returns machine-readable warnings after each spend, and can anchor expense hashes on Pharos when a wallet and registry contract are configured.

It is organized as one package with three composable sub-skills:

- `expense-tracker`: initialize a period, add/edit/remove/list expenses, and summarize spending.
- `budget-guardian`: check planned spend and audit the current budget with warning codes.
- `onchain-ledger`: log, reverse, verify, and list expense hashes on Pharos, with safe simulation when no wallet is set.

## What BudgetOracle Builds

BudgetOracle turns a simple budget into an agent-readable workflow:

1. A user or agent initializes a weekly or monthly budget.
2. Expenses are stored locally in `assets/state.json`.
3. Each new expense can be checked against the current budget before it is recorded.
4. Guardian warnings are returned as structured JSON codes.
5. Summaries include totals, remaining budget, savings rate, category breakdown, and recent expenses.
6. Optional ledger commands anchor expense hashes to Pharos for audit trails.

## Requirements

- Node.js 18 or newer.
- npm.
- A Pharos-compatible EVM wallet only for live onchain write commands.
- `PHAROS_PRIVATE_KEY` and `BUDGET_ORACLE_CONTRACT` only for live onchain mode.
- `PHAROS_NETWORK=mainnet` or `PHAROS_NETWORK=testnet` for live network selection.

Local tracking, budget checks, summaries, and simulated ledger output do not require a wallet.

## Install

```bash
git clone https://github.com/comzzy-comzzy/budget-oracle.git
cd budget-oracle
npm install
cp .env.example .env
npm run check
```

## Demo Site

Run the local demo site:

```bash
npm run demo
```

Open:

```text
http://127.0.0.1:4173
```

The demo is backed by the real BudgetOracle modules through `demo/site/server.js`. It can initialize a budget, add expenses with guardian warnings, show summary JSON, log an expense hash through the ledger, and verify a hash. Keep wallet variables in the server environment only; never put `PHAROS_PRIVATE_KEY` in browser code.

## Deploy Demo To Vercel

The Vercel demo uses static files from `public/` and serverless functions in `api/`.

Install the Vercel CLI and deploy:

```bash
npm install
pnpm dlx vercel
```

For simulation mode, no secrets are required. For live Pharos mode, add these environment variables in the Vercel project settings:

```env
PHAROS_NETWORK=mainnet
PHAROS_RPC_URL=https://rpc.pharos.xyz
BUDGET_ORACLE_CONTRACT=0xYourBudgetOracleLoggerAddress
PHAROS_PRIVATE_KEY=0xYourServerSidePrivateKey
```

Use `PHAROS_NETWORK=testnet` and the Atlantic testnet contract address if you want the public demo to spend testnet gas instead of mainnet PROS. Keep `PHAROS_PRIVATE_KEY` server-side in Vercel environment variables only.

## Set Up Your `.env` File

The `.env` file is only needed for live Pharos writes. Start with the example file:

```bash
cp .env.example .env
```

For local and simulated mode, leave these values blank:

```env
PHAROS_PRIVATE_KEY=
BUDGET_ORACLE_CONTRACT=
PHAROS_NETWORK=mainnet
PHAROS_RPC_URL=
```

For live mainnet mode, set:

```env
PHAROS_PRIVATE_KEY=0xyour_private_key_here
BUDGET_ORACLE_CONTRACT=0xYourBudgetOracleLoggerAddress
PHAROS_NETWORK=mainnet
PHAROS_RPC_URL=https://rpc.pharos.xyz
```

For Atlantic testnet mode, deploy the contract on testnet and set:

```env
PHAROS_PRIVATE_KEY=0xyour_private_key_here
BUDGET_ORACLE_CONTRACT=0xYourTestnetBudgetOracleLoggerAddress
PHAROS_NETWORK=testnet
PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
```

Never commit `.env`. It is ignored by git.

## Quickstart

### 1. Run the check

```bash
npm run check
```

This runs a smoke test against a temporary state file. It verifies tracker init, guarded adds, summary audit, over-budget warnings, and ledger simulation.

### 2. Initialize a budget

```bash
npm run dev -- init \
  --period monthly \
  --income 500000 \
  --budget 300000 \
  --currency NGN
```

### 3. Add expenses with guardrails

```bash
npm run dev -- add --name "Team lunch" --amount 15000 --category Food
npm run dev -- add --name "Server costs" --amount 280000 --category Bills
```

The unified `add` command runs `budget-guardian check` first, then records the expense with `expense-tracker`. If a warning applies, it is returned with the expense JSON.

### 4. View summary and audit

```bash
npm run dev -- summary
```

The summary includes total spent, remaining budget, budget-used percentage, savings rate, category breakdown, recent expenses, and guardian warnings.

### 5. Log to Pharos or simulate locally

```bash
npm run dev -- ledger log \
  --name "Vendor payment" \
  --amount 500000 \
  --category Vendor
```

Without `PHAROS_PRIVATE_KEY` and `BUDGET_ORACLE_CONTRACT`, this returns simulated JSON with a deterministic expense hash and no transaction hash.

## Commands

Unified CLI:

```bash
npm run dev -- init --period monthly --income 500000 --budget 300000 --currency NGN
npm run dev -- add --name "Team lunch" --amount 15000 --category Food
npm run dev -- remove --id <expense_id>
npm run dev -- summary
npm run dev -- log --name "Vendor payment" --amount 500000 --category Vendor
```

Sub-skill routes:

```bash
npm run dev -- tracker list --category Food --limit 10
npm run dev -- tracker edit --id <expense_id> --amount 20000 --category Bills
npm run dev -- guardian check --amount 75000
npm run dev -- guardian audit
npm run dev -- guardian reset
npm run dev -- ledger verify --hash 0x...
npm run dev -- ledger history --address 0x...
```

## Warning Codes

| Code | Level | Meaning |
| --- | --- | --- |
| `OVER_BUDGET` | ERROR | Total or projected spend is above the budget limit. |
| `APPROACHING_LIMIT` | WARN | Total or projected spend is above 90% of the budget limit. |
| `HIGH_SINGLE_EXPENSE` | WARN | New expense is more than 50% of the remaining budget. |
| `NO_INCOME_SET` | INFO | Period income is zero. |
| `NO_BUDGET_SET` | INFO | Budget limit is zero. |
| `NEGATIVE_SAVINGS` | WARN | Total or projected spend is above income. |
| `PERIOD_RESET_DUE` | INFO | The current state is from a previous week or month. |

## Using Pharos

The ledger supports:

| Network | `PHAROS_NETWORK` | Chain ID | Default RPC | Explorer |
| --- | --- | --- | --- | --- |
| Pharos Pacific Ocean Mainnet | `mainnet` | `1672` | `https://rpc.pharos.xyz` | `https://pharosscan.xyz` |
| Pharos Atlantic testnet | `testnet` | `688689` | `https://atlantic.dplabs-internal.com` | `https://atlantic.pharosscan.xyz` |

Deploy `skills/onchain-ledger/scripts/BudgetOracleLogger.sol` on the selected network, then set `BUDGET_ORACLE_CONTRACT` in `.env`.

Live mode calls:

```text
logExpense(bytes32 expenseHash, uint256 amount, string category)
reverseExpense(bytes32 expenseHash, string reason)
```

Read `references/PHAROS.md` for the contract details and deploy notes.

## Project Structure

```text
SKILL.md                                      Root multi-skill descriptor
scripts/index.js                             Unified CLI entrypoint
scripts/smoke-test.js                        Clone-time smoke test
skills/expense-tracker/scripts/tracker.js    Local budget state commands
skills/budget-guardian/scripts/guardian.js   Budget warning engine
skills/onchain-ledger/scripts/ledger.js      Pharos ledger client
skills/onchain-ledger/scripts/BudgetOracleLogger.sol
assets/state-schema.json                     State schema
references/                                  Output, Pharos, and use-case docs
```

## Output Contract

Every successful command writes one JSON object to stdout. Errors write JSON to stderr:

```json
{
  "success": false,
  "error": "Human-readable failure"
}
```

Read `references/OUTPUT_FORMAT.md` for command-specific shapes.

## Submission Notes

Skill name: `budget-oracle`

GitHub: https://github.com/comzzy-comzzy/budget-oracle

Supported frameworks: Claude Code, OpenAI Codex CLI, Cursor, VS Code Agent Mode, Pharos Agent Center.

Dependencies: Node.js, npm, ethers v6, dotenv.

## Safety

- Keep private keys out of git.
- Test locally before using live Pharos mode.
- Use simulated ledger mode until the contract address and wallet are configured.
- Treat `assets/state.json` as runtime state; it is ignored by git.
