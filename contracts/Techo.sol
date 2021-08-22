//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./Enums.sol";

contract Techo is Ownable, Pausable {
    using Strings for uint256;

    IERC20 erc20;
    ContractStatus public contractStatus;
    address public immutable landlord;
    address public immutable tenant;

    uint8 public currentCycle = 0;
    uint8 public cycleCount = 0;

    string constant activationFailed = "contract activation failed";
    string constant alreadyActive = "contract is already active";
    string constant minContractDuration =
        "Required minimum contract duration is 1 week";
    string constant contractDurationLargerThanFrequency =
        "Payment frequency should be less than the contract duration";
    string constant collectedRent =
        "you have already collected rent this current cycle";
    string constant contractNotActive = "contract is not active";
    string constant onlyTenant = "only tenant can call this function";
    string constant onlyLandlord = "only landlord can call this function";
    string constant notCurrentCycle =
        "Cannot collect from a cycle which is not the current one";
    string constant startTimeGreater =
        "current cycle start time is greater than current time";
    string constant finishTimeLower =
        "current cycle finish time is lower than current time";
    string constant transferFailed = "transfer failed";
    string constant EOAOnly = "addres cannot be a contract";
    string constant invalidAddress = "invalid address";

    uint256 public time = 0;
    uint256 public contractAmount;
    uint256 public activationTime;
    uint256 public finalizationTime;
    uint256 public contractDuration;
    uint256 public frequency;
    uint256 public immutable ownerFee;
    uint256 public immutable amountToPayByFrequency;
    mapping(uint8 => Cycle) public cycleMapping;

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

        checkValidAddress(_tenant);

        checkValidAddress(_landlord);

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
        uint256 prevStart = getCurrentTime();
        uint256 prevFinish = getCurrentTime() + frequency;

        console.log("cycleCount", cycleCount);

        cycleMapping[0] = Cycle(0, prevStart, prevFinish, false);

        for (uint8 i = 1; cycleCount > i; i++) {
            uint256 start = prevStart + frequency;
            uint256 finish = prevFinish + frequency;
            cycleMapping[i] = Cycle(i, start, finish, false);
            prevStart = start;
            prevFinish = finish;
        }
    }

    function getOwnerFeeAmount() public view returns (uint256) {
        return (contractAmount / 100) * ownerFee;
    }

    function activate(uint256 amount) external _tenantOnly whenNotPaused {
        uint256 fee = getOwnerFeeAmount();
        //checks
        require(amount == (contractAmount + fee), activationFailed);
        require(contractStatus == ContractStatus.NOTACTIVE, alreadyActive);

        bool success = erc20.transferFrom(_msgSender(), address(this), amount);
        require(success, activationFailed);

        //effects
        contractStatus = ContractStatus.ACTIVE;
        activationTime = getCurrentTime();
        finalizationTime = getCurrentTime() + contractDuration;

        //interaction
        success = erc20.transfer(owner(), fee);
        require(success, transferFailed);
        emit Activated(tenant, landlord, amount);
    }

    function checkBalance() public view returns (uint256) {
        return erc20.balanceOf(address(this));
    }

    function collectRent() external _landlordOnly whenNotPaused {
        //checks
        require(contractStatus == ContractStatus.ACTIVE, contractNotActive);
        require(cycleMapping[currentCycle].paid == false, collectedRent);
        uint256 currentTime = getCurrentTime();
        require(
            cycleMapping[currentCycle].start < currentTime,
            startTimeGreater
        );
        require(
            cycleMapping[currentCycle].finish > currentTime,
            finishTimeLower
        );

        //effects
        cycleMapping[currentCycle].paid = true;
        currentCycle = currentCycle + 1;

        //interaction
        bool success = erc20.transfer(landlord, amountToPayByFrequency);
        require(success, transferFailed);
        emit RentCollected(amountToPayByFrequency);
    }

    function cancelContract() external onlyOwner whenNotPaused {
        //checks
        require(contractStatus == ContractStatus.ACTIVE, contractNotActive);

        //effects
        contractStatus = ContractStatus.CANCELLED;

        //interaction
        uint256 balance = checkBalance();
        bool success = erc20.transfer(tenant, balance);
        require(success, transferFailed);
        emit Cancelled();
    }

    function extract() external onlyOwner whenNotPaused {
        uint256 balance = checkBalance();
        bool success = erc20.transfer(owner(), balance);
        require(success, transferFailed);
    }

    //only for testing purposes, remove for prod
    function getCurrentTime() public view returns (uint256) {
        if (time == 0) {
            return block.timestamp;
        } else {
            return time;
        }
    }

    function checkValidAddress(address _a) private view {
        uint256 len;
        require(_a != address(0), invalidAddress);
        require(_a != address(this), invalidAddress);
        assembly {
            //yul
            len := extcodesize(_a)
        }
        require(len == 0, EOAOnly);
    }

    //only for testing purposes, remove for prod
    function setCurrentTime(uint256 val) external {
        time = val;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function destroy() public onlyOwner {
        selfdestruct(payable(owner()));
    }

    modifier _tenantOnly() {
        require(_msgSender() == tenant, onlyTenant);
        _;
    }

    modifier _landlordOnly() {
        require(_msgSender() == landlord, onlyLandlord);
        _;
    }
}
