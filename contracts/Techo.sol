//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./Enums.sol";

///@author Javier Acrich
contract Techo is Ownable, Pausable {
    IERC20 erc20;
    ContractStatus public contractStatus;
    address public immutable landlord;
    address public immutable tenant;

    uint8 public currentCycle = 0;
    uint8 public cycleCount = 0;

    error ActivationFailed(uint256 correctAmount);
    error AlreadyActive();
    error TransferFailed();
    error ContractNotActive();
    error CollectedRent();
    error CurrentCycleAlreadyCollected();
    error InvalidAddress(address _a);
    error OnlyTenant();
    error OnlyLandlord();
    error MinContractDuration(uint256 duration);
    error ContractDurationLargerThanFrequency();

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
        if (_contractDuration < oneWeek()) {
            revert MinContractDuration(oneWeek());
        }

        if (_contractDuration < _frequency) {
            revert ContractDurationLargerThanFrequency();
        }

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

    function oneWeek() private pure returns (uint256) {
        return 604800;
    }

    function getOwnerFeeAmount() public view returns (uint256) {
        return (contractAmount / 100) * ownerFee;
    }

    function activate(uint256 amount) external _tenantOnly whenNotPaused {
        uint256 fee = getOwnerFeeAmount();
        //checks
        uint256 correctAmount = contractAmount + fee;
        if (amount != correctAmount) {
            revert ActivationFailed(correctAmount);
        }
        if (contractStatus == ContractStatus.ACTIVE) {
            revert AlreadyActive();
        }

        bool success = erc20.transferFrom(_msgSender(), address(this), amount);
        if (!success) {
            revert TransferFailed();
        }

        //effects
        contractStatus = ContractStatus.ACTIVE;
        activationTime = getCurrentTime();
        finalizationTime = getCurrentTime() + contractDuration;

        //interaction
        success = erc20.transfer(owner(), fee);
        if (!success) {
            revert TransferFailed();
        }
        emit Activated(tenant, landlord, amount);
    }

    function checkBalance() public view returns (uint256) {
        return erc20.balanceOf(address(this));
    }

    function collectRent() external _landlordOnly whenNotPaused {
        //checks
        if (contractStatus != ContractStatus.ACTIVE) {
            revert ContractNotActive();
        }
        if (cycleMapping[currentCycle].paid) {
            revert CollectedRent();
        }

        uint256 currentTime = getCurrentTime();

        if (cycleMapping[currentCycle].start > currentTime) {
            revert CurrentCycleAlreadyCollected();
        }

        if (cycleMapping[currentCycle].finish < currentTime) {
            revert CurrentCycleAlreadyCollected();
        }

        //effects
        cycleMapping[currentCycle].paid = true;
        currentCycle = currentCycle + 1;

        //interaction
        bool success = erc20.transfer(landlord, amountToPayByFrequency);

        if (!success) {
            revert TransferFailed();
        }
        emit RentCollected(amountToPayByFrequency);
    }

    function cancelContract() external onlyOwner whenNotPaused {
        //checks
        if (contractStatus != ContractStatus.ACTIVE) {
            revert ContractNotActive();
        }

        //effects
        contractStatus = ContractStatus.CANCELLED;

        //interaction
        uint256 balance = checkBalance();
        bool success = erc20.transfer(tenant, balance);

        if (!success) {
            revert TransferFailed();
        }

        emit Cancelled();
    }

    function extract() external onlyOwner whenNotPaused {
        uint256 balance = checkBalance();
        bool success = erc20.transfer(owner(), balance);

        if (!success) {
            revert TransferFailed();
        }
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
        if (_a == address(0)) {
            //address zero is not allowed
            revert InvalidAddress(_a);
        }
        if (_a == address(this)) {
            //this contract is not allowed
            revert InvalidAddress(_a);
        }
        assembly {
            //yul
            len := extcodesize(_a)
        }
        if (len != 0) {
            //only external account address allowed
            revert InvalidAddress(_a);
        }
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
        if (_msgSender() != tenant) {
            revert OnlyTenant();
        }
        _;
    }

    modifier _landlordOnly() {
        if (_msgSender() != landlord) {
            revert OnlyLandlord();
        }
        _;
    }
}
