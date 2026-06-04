# BudgetOracle JSON Output Format

Every command writes one JSON object to stdout on success:

```json
{
  "success": true,
  "action": "ACTION_NAME"
}
```

Errors are written to stderr:

```json
{
  "success": false,
  "error": "Human-readable failure"
}
```

## Tracker

`init` returns `state` and `summary`.

`add` returns:

```json
{
  "success": true,
  "action": "ADD",
  "expense": {
    "id": "a1b2c3d4",
    "name": "Team lunch",
    "amount": 15000,
    "category": "Food",
    "note": "",
    "date": "2026-06-04T12:00:00.000Z",
    "onchain": false,
    "txHash": null
  },
  "summary": {}
}
```

`summary` includes `period`, `currency`, formatted `income`, formatted `budgetLimit`, formatted `totalSpent`, formatted `remaining`, `overBudget`, `budgetUsed`, `savingsRate`, `expenseCount`, `categoryBreakdown`, `recentExpenses`, and `generatedAt`.

## Guardian

`check` returns:

```json
{
  "success": true,
  "action": "CHECK",
  "safe": false,
  "amountChecked": 280000,
  "currentTotal": 40000,
  "projectedTotal": 320000,
  "budgetLimit": 300000,
  "warnings": []
}
```

Warning objects include `level`, `code`, `message`, and optional numeric context such as `overBy`, `budgetUsed`, `remainingBeforeExpense`, or `deficit`.

## Ledger

Simulated `log` output:

```json
{
  "success": true,
  "mode": "SIMULATED",
  "expenseHash": "0x...",
  "txHash": null,
  "blockNumber": null,
  "pharosExplorer": null,
  "expense": {},
  "message": "Wallet not configured, running in simulation."
}
```

Live `log` output uses `mode: "ONCHAIN"` and includes `txHash`, `blockNumber`, and `pharosExplorer`.

## Unified CLI

`node scripts/index.js add` returns a combined object:

```json
{
  "success": true,
  "action": "ADD_WITH_GUARDIAN",
  "safe": true,
  "warnings": [],
  "guardian": {},
  "tracker": {}
}
```

`node scripts/index.js summary` returns tracker summary plus guardian audit.
