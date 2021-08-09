//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Enums.sol";

contract Techo is Ownable {
    IERC20 daiInstance;
    ContractStatus public contractStatus;
    address public landlord;
    address public tenant;

    string activationFailed = "contract activation failed";
    string alreadyActive = "contract is already active";

    uint256 public contractDaiAmount;
    uint256 public activationTime;
    uint256 public finalizationTime;
    uint256 public contractSecondsDuration;
    uint256 public commissionPercentage;
    uint256 public paySecondsFrequency;
    uint256 public lastPayTime;
    uint256 public amountToPayByFrequency;

    //    console.log("Deploying a Greeter with greeting:", _greeting);

    constructor(
        address _daiaddress,
        uint256 _contractSecondsDuration,
        uint256 _contractDaiAmount,
        uint256 _paySecondsFrequency
    ) {
        require(
            _contractSecondsDuration >= 604800,
            "Required minimum contract duration is 1 week"
        );

        daiInstance = IERC20(_daiaddress);
        tenant = 0x7E2406479657Bda15731CAd59d16242eED3D5082; //  _tenant;
        landlord = 0x2f9C819348F8C5cA2642f40a8C32a7d0b0158AA0; // cuenta 3 // _landlord;
        contractStatus = ContractStatus.NOTACTIVE;
        contractDaiAmount = _contractDaiAmount;
        contractSecondsDuration = _contractSecondsDuration; // 31556952; // _contractDuration; //31556952 seconds in a year
        commissionPercentage = 1; //1 percent  // _commissionPercentage;
        paySecondsFrequency =  _paySecondsFrequency;
        amountToPayByFrequency =
            contractDaiAmount /
            (contractSecondsDuration / paySecondsFrequency);
    }

    function getContractStatus() public view returns (uint256) {
        return uint256(contractStatus);
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

        finalizationTime = block.timestamp + contractSecondsDuration;

        //   totalSupply = totalSupply.add(xxxAmount);
        // balances[msg.sender] = balances[msg.sender].add(xxxAmount);
    }

    function checkDaiBalance() public view returns (uint256) {
        return daiInstance.balanceOf(address(this));
    }

    function checkRemainingDuration() public view returns (uint256) {
        return finalizationTime - (activationTime + block.timestamp);
    }

    function collectRent() public _landlordOnly {
        require(
            (lastPayTime + paySecondsFrequency) > (block.timestamp),
            "you have already collected rent"
        );

        lastPayTime = block.timestamp;
        daiInstance.transfer(address(this), amountToPayByFrequency);
    }

    function cancelContract() public onlyOwner {
        require(contractStatus == ContractStatus.ACTIVE);
        contractStatus = ContractStatus.CANCELLED;

        uint256 remaining = getCancellationCommission();

        daiInstance.transferFrom(address(this), tenant, remaining);
    }

    function getCancellationCommission() private view returns (uint256) {
        uint256 balance = checkDaiBalance();
        uint256 remaining = (balance * commissionPercentage) / 10000;
        return remaining;
    }

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
