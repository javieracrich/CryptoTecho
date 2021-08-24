import "@nomiclabs/hardhat-waffle";
import { task } from "hardhat/config";
import "solidity-coverage";
import "@nomiclabs/hardhat-ethers";
require("@nomiclabs/hardhat-ganache");
require("hardhat-deploy");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

const ALCHEMY_API_KEY = "...";
const ROPSTEN_PRIVATE_KEY = "...";
const ETHERSCAN_API_KEY = "...";

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();
  for (const account of accounts) {
    console.log(account.address);
  }
});

module.exports = {
  solidity: "0.8.4",
  networks: {
    ropsten: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
      accounts: [`0x${ROPSTEN_PRIVATE_KEY}`],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};
