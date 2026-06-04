---
name: onchain-ledger
description: Logs expense and income records as immutable onchain events on Pharos Network (Chain ID 50002). Creates a verifiable audit trail for businesses, DAOs, freelancers, and AI agent treasuries. Use when a user or agent needs to record a financial event on Pharos, verify a past transaction, retrieve an onchain expense summary, or set an onchain budget configuration. Requires PHAROS_PRIVATE_KEY in environment for live mode; falls back to simulated mode if not set.
license: MIT
metadata:
  author: kane_120
  version: "1.0.0"
  part-of: budget-oracle
  pharos-chain-id: "50002"
  pharos-rpc: https://rpc.pharos.network
compatibility: Requires Node.js 18+ and ethers v6. Set PHAROS_PRIVATE_KEY and BUDGET_ORACLE_CONTRACT in .env for onchain mode. Runs in simulated mode without them.
---

# Onchain Ledger

Use this sub-skill to create a Pharos-verifiable audit trail for expense and income records.

## Commands

```bash
node skills/onchain-ledger/scripts/ledger.js log --name "Vendor payment" --amount 500000 --category Vendor --currency NGN
node skills/onchain-ledger/scripts/ledger.js reverse --hash <expenseHash> --reason "Duplicate entry"
node skills/onchain-ledger/scripts/ledger.js verify --hash <expenseHash>
node skills/onchain-ledger/scripts/ledger.js history --address <walletAddress>
```

Without `PHAROS_PRIVATE_KEY` and `BUDGET_ORACLE_CONTRACT`, commands return simulated JSON and never crash due to missing wallet configuration. Live mode uses Pharos RPC `https://rpc.pharos.network` and explorer `https://pharosscan.xyz`.
