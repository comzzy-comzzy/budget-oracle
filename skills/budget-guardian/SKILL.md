---
name: budget-guardian
description: Enforces budget limits and emits structured warnings when spending approaches or exceeds defined thresholds. Use when an agent needs to check whether a new expense is safe to add, audit current budget health, or route warning messages to a user or downstream alert system. Returns machine-readable warning codes that other skills can act on.
license: MIT
metadata:
  author: kane_120
  version: "1.0.0"
  part-of: budget-oracle
---

# Budget Guardian

Use this sub-skill to audit the local BudgetOracle state and produce machine-readable budget warnings.

## Commands

```bash
node skills/budget-guardian/scripts/guardian.js check --amount 280000
node skills/budget-guardian/scripts/guardian.js audit
node skills/budget-guardian/scripts/guardian.js reset
```

Warning codes: `OVER_BUDGET`, `APPROACHING_LIMIT`, `HIGH_SINGLE_EXPENSE`, `NO_INCOME_SET`, `NO_BUDGET_SET`, `NEGATIVE_SAVINGS`, `PERIOD_RESET_DUE`.

All success output is JSON on stdout. Errors are JSON on stderr.
