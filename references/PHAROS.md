# Pharos Integration

BudgetOracle targets Pharos Network, an EVM-compatible chain. Use `PHAROS_NETWORK` to select where live ledger writes go.

| Network | `PHAROS_NETWORK` | Chain ID | RPC | Explorer |
| --- | --- | --- | --- | --- |
| Pharos Pacific Ocean Mainnet | `mainnet` | `1672` | `https://rpc.pharos.xyz` | `https://pharosscan.xyz` |
| Pharos Atlantic testnet | `testnet` | `688689` | `https://atlantic.dplabs-internal.com` | `https://atlantic.pharosscan.xyz` |

Accepted testnet aliases: `testnet`, `atlantic`, `atlantic-testnet`.

## Modes

Local and simulated mode require no wallet. Leave `PHAROS_PRIVATE_KEY` and `BUDGET_ORACLE_CONTRACT` empty.

Live onchain mode requires:

```bash
PHAROS_PRIVATE_KEY=0x...
BUDGET_ORACLE_CONTRACT=0x...
PHAROS_NETWORK=mainnet
PHAROS_RPC_URL=https://rpc.pharos.xyz
```

For testnet, deploy `BudgetOracleLogger.sol` on Atlantic testnet and use:

```bash
PHAROS_PRIVATE_KEY=0x...
BUDGET_ORACLE_CONTRACT=0x...
PHAROS_NETWORK=testnet
PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
```

## Contract

The Solidity source is `skills/onchain-ledger/scripts/BudgetOracleLogger.sol`.

Deploy it with any EVM deployment framework that supports Solidity `^0.8.20`, then set `BUDGET_ORACLE_CONTRACT` to the deployed address for the selected network.

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
