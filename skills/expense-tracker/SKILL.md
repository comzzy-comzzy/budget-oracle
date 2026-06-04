---
name: expense-tracker
description: Tracks individual income and expenses for a given weekly or monthly period. Adds, removes, edits, and lists expense entries with live running totals and category breakdowns. Use when a user or agent needs to record a purchase, log an income source, view spending history, or get a categorized breakdown of expenses. Works offline with no wallet required.
license: MIT
metadata:
  author: kane_120
  version: "1.0.0"
  part-of: budget-oracle
---

# Expense Tracker

Use this sub-skill to maintain local BudgetOracle expense state in `assets/state.json`.

## Commands

Run from this package:

```bash
node skills/expense-tracker/scripts/tracker.js init --period monthly --income 500000 --budget 300000 --currency NGN
node skills/expense-tracker/scripts/tracker.js add --name "Team lunch" --amount 15000 --category Food
node skills/expense-tracker/scripts/tracker.js remove --id <expense_id>
node skills/expense-tracker/scripts/tracker.js edit --id <expense_id> --amount 20000 --name "Updated name" --category Bills
node skills/expense-tracker/scripts/tracker.js list --category Food --limit 10
node skills/expense-tracker/scripts/tracker.js summary
```

Supported categories: Food, Transport, Bills, Shopping, Health, Entertainment, Rent, Payroll, Vendor, Marketing, Utilities, Other.

All success output is JSON on stdout. Errors are JSON on stderr.
