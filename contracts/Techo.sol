//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Enums.sol";

struct Cycle {
    uint8 index;
    uint256 start;
    uint256 finish;
    bool paid;
}

contract Techo is Ownable {
    using Strings for uint256;

    IERC20 erc20;
    ContractStatus public contractStatus;
    address public landlord;
    address public tenant;
    uint256 public mockTime = 0;
    uint8 public currentCycle = 0;
    uint8 public cycleCount = 0;

    string activationFailed = "contract activation failed";
    string alreadyActive = "contract is already active";
    string minContractDuration = "Required minimum contract duration is 1 week";
    string contractDurationLargerThanFrequency =
        "Payment frequency should be less than the contract duration";
    string collectedRent = "you have already collected rent this current cycle";
    string contractNotActive = "contract is not active";
    string onlyTenant = "only tenant can call this function";
    string onlyLandlord = "only landlord can call this function";
    string notCurrentCycle =
        "Cannot collect from a cycle which is not the current one";

    uint256 public contractAmount;
    uint256 public activationTime;
    uint256 public finalizationTime;
    uint256 public contractDuration;
    uint256 public ownerFee;
    uint256 public frequency;
    uint256 public amountToPayByFrequency;
    mapping(uint8 => Cycle) public cycleMapping;
    Cycle[] cycleArray;

    event Activated(
        address indexed _tenant,
        address indexed _landlord,
        uint256 _amount
    );

    event RentCollected(uint256 amount);
    event Cancelled();

    constructor(
        address _erc20address,
        address _tenant,
        address _landlord,
        uint256 _contractDuration,
        uint256 _contractAmount,
        uint256 _frequency,
        uint8 _ownerFee
    ) {
        require(_contractDuration >= 604800, minContractDuration);

        require(
            _contractDuration > _frequency,
            contractDurationLargerThanFrequency
        );

        erc20 = IERC20(_erc20address);
        tenant = _tenant;
        landlord = _landlord;
        contractStatus = ContractStatus.NOTACTIVE;
        contractAmount = _contractAmount;
        contractDuration = _contractDuration;
        ownerFee = _ownerFee;
        frequency = _frequency;

        amountToPayByFrequency =
            (contractAmount) /
            (contractDuration / frequency);

        cycleCount = uint8(contractDuration / frequency);
        uint256 prevStart = block.timestamp;
        uint256 prevFinish = block.timestamp + frequency;

        console.log("cycleCount", cycleCount);

        for (uint8 i = 0; cycleCount > i; i++) {
            uint256 start = prevFinish;
            uint256 finish = start + frequency;
            cycleArray.push(Cycle(i, start, finish, false));
            cycleMapping[i] = Cycle(i, start, finish, false);
            prevStart = start;
            prevFinish = finish;
        }
    }

    function getCurrentTime() public view returns (uint256) {
        if (mockTime == 0) {
            return block.timestamp;
        } else {
            return mockTime;
        }
    }

    function getOwnerFeeAmount() public view returns (uint256) {
        return (contractAmount / 100) * ownerFee;
    }

    function approve(uint256 amount) public returns (bool) {
        return erc20.approve(address(this), amount);
    }

    function allowance() public view returns (uint256) {
        return erc20.allowance(tenant, address(this));
    }

    function activate(uint256 amount) external payable _tenantOnly {
        uint256 fee = getOwnerFeeAmount();
        require(amount == (contractAmount + fee), activationFailed);
        require(contractStatus == ContractStatus.NOTACTIVE, alreadyActive);

        bool success = erc20.transferFrom(msg.sender, address(this), amount);
        require(success, activationFailed);
        contractStatus = ContractStatus.ACTIVE;
        activationTime = getCurrentTime();
        finalizationTime = getCurrentTime() + contractDuration;
        erc20.transfer(owner(), fee);
        emit Activated(tenant, landlord, amount);
    }

    function checkerc20Balance() public view returns (uint256) {
        return erc20.balanceOf(address(this));
    }

    function checkRemainingDuration() public view returns (uint256) {
        return finalizationTime - (activationTime + getCurrentTime());
    }

    function collectRent() public _landlordOnly {
        require(contractStatus == ContractStatus.ACTIVE, contractNotActive);
        require(cycleMapping[currentCycle].paid == false, collectedRent);
        require(
            cycleMapping[currentCycle].start < block.timestamp &&
                cycleMapping[currentCycle].finish < block.timestamp,
            notCurrentCycle
        );

        cycleMapping[currentCycle].paid = true;
        currentCycle = currentCycle + 1;

        erc20.transfer(landlord, amountToPayByFrequency);
        emit RentCollected(amountToPayByFrequency);
    }

    function cancelContract() public onlyOwner {
        require(contractStatus == ContractStatus.ACTIVE, contractNotActive);
        contractStatus = ContractStatus.CANCELLED;
        uint256 balance = checkerc20Balance();
        erc20.transfer(tenant, balance);
        emit Cancelled();
    }

    function extract() public onlyOwner {
        uint256 balance = checkerc20Balance();
        erc20.transferFrom(address(this), owner(), balance);
    }

    modifier _tenantOnly() {
        require(msg.sender == tenant, onlyTenant);
        _;
    }

    modifier _landlordOnly() {
        require(msg.sender == landlord, onlyLandlord);
        _;
    }
}
