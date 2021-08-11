//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Enums.sol";

contract Techo is Ownable {
    using Strings for uint256;

    IERC20 daiInstance;
    ContractStatus public contractStatus;
    address public landlord;
    address public tenant;

    string activationFailed = "contract activation failed";
    string alreadyActive = "contract is already active";
    string minContractDuration = "Required minimum contract duration is 1 week";
    string contractDurationLargerThanFrequency =
        "Payment frequency should be less than the contract duration";
    string collectedRent = "you have already collected rent this current cycle";

    uint256 public contractDaiAmount;
    uint256 public activationTime;
    uint256 public finalizationTime;
    uint256 public contractSecondsDuration;
    uint256 public commissionPercentage;
    uint256 public paySecondsFrequency;
    uint256 public lastPayTime;
    uint256 public amountToPayByFrequency;

    constructor(
        address _daiaddress,
        address _tenant,
        address _landlord,
        uint256 _contractSecondsDuration,
        uint256 _contractDaiAmount,
        uint256 _paySecondsFrequency,
        uint8 _commissionPercentage
    ) {
        require(_contractSecondsDuration >= 604800, minContractDuration);

        require(
            _contractSecondsDuration > _paySecondsFrequency,
            contractDurationLargerThanFrequency
        );

        daiInstance = IERC20(_daiaddress);
        tenant = _tenant;
        landlord = _landlord;
        contractStatus = ContractStatus.NOTACTIVE;
        contractDaiAmount = _contractDaiAmount;
        contractSecondsDuration = _contractSecondsDuration;
        commissionPercentage = _commissionPercentage;
        paySecondsFrequency = _paySecondsFrequency;
        amountToPayByFrequency =
            contractDaiAmount /
            (contractSecondsDuration / paySecondsFrequency);
    }

    function calculateCommission() public view returns (uint256) {
        return (contractDaiAmount / 100) * commissionPercentage;
    }

    function assignDaiContract(IERC20 dai) public {
        daiInstance = dai;
    }

    function approve(uint256 amount) public returns (bool) {
        return daiInstance.approve(address(this), amount);
    }

    function allowance() public view returns (uint256) {
        return daiInstance.allowance(tenant, address(this));
    }

    function activate(uint256 amount) external payable _tenantOnly {
        require(amount == contractDaiAmount, activationFailed);
        require(contractStatus == ContractStatus.NOTACTIVE, alreadyActive);

        bool success = daiInstance.transferFrom(
            msg.sender,
            address(this),
            amount
        );
        require(success, activationFailed);
        contractStatus = ContractStatus.ACTIVE;
        activationTime = block.timestamp;
        finalizationTime = block.timestamp + contractSecondsDuration;
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
            collectedRent
        );

        lastPayTime = block.timestamp;
        daiInstance.transfer(address(this), amountToPayByFrequency);
    }

    function cancelContract() public onlyOwner {
        require(contractStatus == ContractStatus.ACTIVE);
        contractStatus = ContractStatus.CANCELLED;
        uint256 balance = checkDaiBalance();
        daiInstance.transferFrom(address(this), tenant, balance);
    }

    // function getCancellationCommission() private view returns (uint256) {
    //     uint256 balance = checkDaiBalance();
    //     uint256 commission = (balance * commissionPercentage) / 10000;
    //     return commission;
    // }

    function extract() public onlyOwner {
        uint256 balance = checkDaiBalance();
        daiInstance.transferFrom(address(this), owner(), balance);
    }

    modifier _tenantOnly() {
        require(msg.sender == tenant, "only tenant can call this function");
        _;
    }

    modifier _landlordOnly() {
        require(msg.sender == landlord, "only landlord can call this function");
        _;
    }
}
