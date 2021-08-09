//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockDai is ERC20 {
    constructor() ERC20("DAI", "DAI") {
        _mint(msg.sender, (10 * (10 ^ 18))); //10 dai
    }
}
