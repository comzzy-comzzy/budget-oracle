# Pharos Integration

BudgetOracle targets Pharos Network, an EVM-compatible chain.

| Field | Value |
| --- | --- |
| Chain ID | `50002` |
| RPC | `https://rpc.pharos.network` |
| Explorer | `https://pharosscan.xyz` |

## Modes

Local and simulated mode require no wallet. Leave `PHAROS_PRIVATE_KEY` and `BUDGET_ORACLE_CONTRACT` empty.

Live onchain mode requires:

```bash
PHAROS_PRIVATE_KEY=0x...
BUDGET_ORACLE_CONTRACT=0x...
PHAROS_RPC_URL=https://rpc.pharos.network
```

## Contract

The Solidity source is `skills/onchain-ledger/scripts/BudgetOracleLogger.sol`.

Deploy it with any EVM deployment framework that supports Solidity `^0.8.20`, then set `BUDGET_ORACLE_CONTRACT` to the deployed address.

## Live Logging Flow

1. Build a SHA-256 hash from expense name, amount, category, currency, and timestamp.
2. Call `logExpense(bytes32 expenseHash, uint256 amount, string category)`.
3. Wait for the receipt.
4. Return the transaction hash, block number, and Pharos explorer URL as JSON.

## Verification

Use:

```bash
node scripts/index.js ledger verify --hash <expenseHash>
node scripts/index.js ledger history --address <walletAddress>
```

`reverse` calls `reverseExpense(bytes32,string)` and can only succeed from the original logger wallet.
