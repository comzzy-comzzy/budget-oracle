// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BudgetOracleLogger {
    struct ExpenseRecord {
        bytes32 expenseHash;
        address logger;
        uint256 amount;
        string category;
        uint256 timestamp;
        bool reversed;
    }

    struct BudgetConfig {
        uint256 limit;
        uint256 income;
        string period;
        uint256 timestamp;
    }

    mapping(bytes32 => ExpenseRecord) public expenseRecords;
    mapping(address => bytes32[]) private userExpenses;
    mapping(address => BudgetConfig) public budgetConfigs;

    event ExpenseLogged(
        bytes32 indexed expenseHash,
        address indexed logger,
        uint256 amount,
        string category,
        uint256 timestamp
    );

    event ExpenseReversed(
        bytes32 indexed expenseHash,
        address indexed reversedBy,
        string reason,
        uint256 timestamp
    );

    event BudgetConfigured(
        address indexed owner,
        uint256 limit,
        uint256 income,
        string period,
        uint256 timestamp
    );

    function logExpense(bytes32 expenseHash, uint256 amount, string calldata category) external {
        require(expenseHash != bytes32(0), "invalid hash");
        require(expenseRecords[expenseHash].timestamp == 0, "expense exists");

        expenseRecords[expenseHash] = ExpenseRecord({
            expenseHash: expenseHash,
            logger: msg.sender,
            amount: amount,
            category: category,
            timestamp: block.timestamp,
            reversed: false
        });

        userExpenses[msg.sender].push(expenseHash);
        emit ExpenseLogged(expenseHash, msg.sender, amount, category, block.timestamp);
    }

    function reverseExpense(bytes32 expenseHash, string calldata reason) external {
        ExpenseRecord storage record = expenseRecords[expenseHash];
        require(record.timestamp != 0, "expense missing");
        require(record.logger == msg.sender, "only original logger");
        require(!record.reversed, "already reversed");

        record.reversed = true;
        emit ExpenseReversed(expenseHash, msg.sender, reason, block.timestamp);
    }

    function setBudgetConfig(uint256 limit, uint256 income, string calldata period) external {
        budgetConfigs[msg.sender] = BudgetConfig({
            limit: limit,
            income: income,
            period: period,
            timestamp: block.timestamp
        });

        emit BudgetConfigured(msg.sender, limit, income, period, block.timestamp);
    }

    function getSummary(address owner)
        external
        view
        returns (uint256 totalSpent, uint256 budgetLimit, uint256 income, string memory period, bool overBudget)
    {
        bytes32[] storage hashes = userExpenses[owner];

        for (uint256 i = 0; i < hashes.length; i++) {
            ExpenseRecord storage record = expenseRecords[hashes[i]];
            if (!record.reversed) {
                totalSpent += record.amount;
            }
        }

        BudgetConfig storage config = budgetConfigs[owner];
        budgetLimit = config.limit;
        income = config.income;
        period = config.period;
        overBudget = budgetLimit > 0 && totalSpent > budgetLimit;
    }

    function getUserExpenses(address owner) external view returns (bytes32[] memory) {
        return userExpenses[owner];
    }

    function isOverBudget(address owner) external view returns (bool, uint256 overBy) {
        uint256 totalSpent;
        bytes32[] storage hashes = userExpenses[owner];

        for (uint256 i = 0; i < hashes.length; i++) {
            ExpenseRecord storage record = expenseRecords[hashes[i]];
            if (!record.reversed) {
                totalSpent += record.amount;
            }
        }

        uint256 limit = budgetConfigs[owner].limit;
        if (limit > 0 && totalSpent > limit) {
            return (true, totalSpent - limit);
        }

        return (false, 0);
    }
}
