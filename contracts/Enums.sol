//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

enum ContractStatus {
    NOTACTIVE,
    ACTIVE,
    CANCELLED
}

enum CommissionType {
    AMOUNT,
    PERCENTAGE
}

struct Cycle {
    uint8 index;
    uint256 start;
    uint256 finish;
    bool paid;
}

