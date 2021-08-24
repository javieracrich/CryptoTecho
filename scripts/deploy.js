const { Constants } = require("../test/Constants");
const { utils } = require('ethers');
const { ethers } = require("hardhat");

async function main() {

  const [deployer] = await ethers.getSigners();
  console.log("deploying Techo with account: ", deployer.address);

  console.log("Accout Balance: ", (await deployer.getBalance()).toString());
  // We get the contract to deploy
  const Techo = await ethers.getContractFactory("Techo");

  const erc20Address = "0xad6d458402f60fd3bd25163575031acdce07538d"; //ropsten dai
  const tenantAddress = "0x...";
  const landlordAddres = "0x...";
  const duration = Constants.Year;
  const amount = utils.parseEther("5000");
  const frequency = Constants.Month;
  const fee = "1";

  const techo = await Techo.deploy(erc20Address, tenantAddress, landlordAddres, duration, amount, frequency, fee);

  console.log("Techo is deployed to", techo.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });