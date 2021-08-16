async function main() {
  // We get the contract to deploy
  const Techo = await ethers.getContractFactory("Techo");

  const erc20Address = "";
  const tenantAddress = "";
  const landlordAddres = "";
  const duration = ""
  const amount = "";
  const frequency = "";
  const fee = "";

  const techo = await Techo.deploy(erc20Address, tenantAddress, landlordAddres, duration, amount, frequency, fee);

  console.log("Techo is deployed to", techo.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });