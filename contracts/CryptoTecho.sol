//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

enum ContractStatus {
    ACTIVE,
    NOTACTIVE
}

enum CommissionType {
    AMOUNT,
    PERCENTAGE
}

contract CryptoTecho is Ownable {
    IERC20 public daiInstance;
    ContractStatus contractStatus;
    uint256 contractDaiAmount;
    address landlord;
    address tenant;
    string activationFailed = "contract activation failed";
    uint256 activationTime;
    uint8 contractMonthDuration;

    //    console.log("Deploying a Greeter with greeting:", _greeting);

    constructor(
        IERC20 _daiInstance,
        uint256 _contractDaiAmount,
        uint8 _contractMonthDuration
    ) {
        daiInstance = _daiInstance;

        contractStatus = ContractStatus.NOTACTIVE;
        contractDaiAmount = _contractDaiAmount;
        contractMonthDuration = _contractMonthDuration;
    }

    function activate(uint256 daiAmount) external payable _tenantOnly {
        require(daiAmount == contractDaiAmount, activationFailed);
        bool success = daiInstance.transferFrom(
            msg.sender,
            address(this),
            daiAmount
        );
        require(success, activationFailed);
        contractStatus = ContractStatus.ACTIVE;
        activationTime = block.timestamp;

        //   totalSupply = totalSupply.add(xxxAmount);
        // balances[msg.sender] = balances[msg.sender].add(xxxAmount);
    }

    function checkDaiBalance() public view returns (uint256) {
        return daiInstance.balanceOf(address(this));
    }

    function collectRent() public _landlordOnly {}

    function cancelContract() public onlyOwner {}

    function extract() public onlyOwner {
        uint256 balance = checkDaiBalance();
        daiInstance.transferFrom(address(this), owner(), balance);
    }

    modifier _tenantOnly() {
        require(msg.sender == tenant);
        _;
    }

    modifier _landlordOnly() {
        require(msg.sender == landlord);
        _;
    }
}
