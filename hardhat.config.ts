import "@nomiclabs/hardhat-waffle";
import { HardhatUserConfig, task } from "hardhat/config";
import "solidity-coverage";
import "@nomiclabs/hardhat-ethers";
require("@nomiclabs/hardhat-ganache");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  // Your type-safe config goes here
  // defaultNetwork: "ganache",
  // networks: {
  //     ganache: {
  //         url: "http://172.17.144.1:7545",
  //         // accounts: [privateKey1, privateKey2, ...]
  //     }
  // },
};

export default config;

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
};
