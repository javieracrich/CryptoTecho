//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

enum ContractStatus {
    ACTIVE,
    NOTACTIVE
}

enum CommissionType {
    AMOUNT,
    PERCENTAGE
}

contract CryptoTecho is Ownable {
    using SafeMath for uint256;

    IERC20 public daiInstance;
    ContractStatus contractStatus;
    uint256 contractDaiAmount;
    address landlord;
    address tenant;
    string activationFailed = "contract activation failed";
    string alreadyActive = "contract is already active";
    uint256 activationTime;
    uint256 finalizationTime;
    uint8 contractMonthDuration;

    uint8 commissionPercentage;

    //    console.log("Deploying a Greeter with greeting:", _greeting);

    constructor(
        IERC20 _daiInstance,
        uint256 _contractDaiAmount,
        uint8 _contractMonthDuration,
        address _tenant,
        address _landlord,
        uint8 _commissionPercentage
    ) {
        daiInstance = _daiInstance;
        tenant = _tenant;
        landlord = _landlord;
        contractStatus = ContractStatus.NOTACTIVE;
        contractDaiAmount = _contractDaiAmount;
        contractMonthDuration = _contractMonthDuration;
        commissionPercentage = _commissionPercentage;
    }

    function activate(uint256 daiAmount) external payable _tenantOnly {
        require(daiAmount == contractDaiAmount, activationFailed);
        require(contractStatus == ContractStatus.NOTACTIVE, alreadyActive);

        bool success = daiInstance.transferFrom(
            msg.sender,
            address(this),
            daiAmount
        );
        require(success, activationFailed);
        contractStatus = ContractStatus.ACTIVE;
        activationTime = block.timestamp;
        uint256 secondsInAMonth = 2627942;

        finalizationTime =
            block.timestamp +
            (contractMonthDuration * secondsInAMonth);

        //   totalSupply = totalSupply.add(xxxAmount);
        // balances[msg.sender] = balances[msg.sender].add(xxxAmount);
    }

    function checkDaiBalance() public view returns (uint256) {
        return daiInstance.balanceOf(address(this));
    }

    function checkRemainingDuration() public view returns (uint256) {
        return finalizationTime - (activationTime + block.timestamp);
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
