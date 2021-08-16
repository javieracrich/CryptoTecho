const { expect } = require("chai");
const { ethers } = require("hardhat");
const { Constants, ContractStatus } = require('./Constants');
const { utils } = require('ethers');


async function deployContracts(
  duration,
  amount,
  frequency,
  commission,
  signer
) {
  var [owner, tenant, landlord] = await ethers.getSigners();
  const MockDai = await ethers.getContractFactory("MockDai");
  const dai = await MockDai.deploy();
  await dai.deployed();
  console.log("owner  is:", owner.address);
  console.log("owner has:", utils.formatEther(await dai.balanceOf(owner.address)));
  console.log("transfering 5000 dai from owner to tenant");
  await dai.transfer(tenant.address, utils.parseEther("6000"));

  console.log("now owner has:", utils.formatEther(await dai.balanceOf(owner.address)));
  console.log("now tenant has:", utils.formatEther(await dai.balanceOf(tenant.address)));
  const Techo = await ethers.getContractFactory("Techo", signer);
  const techo = await Techo.deploy(dai.address, tenant.address, landlord.address, duration, amount, frequency, commission);

  return [techo, dai];
}

describe("Techo", async () => {
  let owner, tenant, landlord;
  let amount;

  beforeEach(async () => {
    [owner, tenant, landlord] = await ethers.getSigners();
    amount = utils.parseEther("5000");
  });

  it("both owner and tenant have correct token balances each", async () => {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 1, owner);
    await expect(await dai.balanceOf(tenant.address)).to.equal(utils.parseEther("6000"));
    await expect(await dai.balanceOf(owner.address)).to.equal(utils.parseEther("4000"));
  });

  it("Contract parameters are set", async () => {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 1, owner);

    await expect(techo.daiInstance).to.be.not.null;
    await expect(await techo.contractStatus()).to.equal(ContractStatus.NOTACTIVE);
    await expect(await techo.contractAmount()).to.be.not.null;
    await expect(await techo.contractDuration()).to.be.not.null;
    await expect(await techo.ownerFee()).to.be.not.null;
    await expect(await techo.frequency()).to.be.not.null;
    await expect(await techo.amountToPayByFrequency()).to.be.not.null;
  });

  it("tenant is correct", async () => {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 5, owner);
    expect(await techo.tenant()).to.equal(tenant.address);
  });

  it("landlord is correct", async () => {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 5, owner);
    expect(await techo.landlord()).to.equal(landlord.address);
  });

  it("Contract duration minimum required is 1 week", async () => {
    await expect(deployContracts(Constants.Week - 1, amount, Constants.Month, 1, owner)).to.be.revertedWith(
      "Required minimum contract duration is 1 week"
    );
  });

  it("Contract status is NOTACTIVE after deployed", async () => {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 5, owner);
    expect(await techo.contractStatus()).to.equal(ContractStatus.NOTACTIVE);
  });

  it("AmountToPayByFrequency is correct - YEAR CONTRACT", async () => {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 1, owner);
    const amountToPay = await techo.amountToPayByFrequency();
    var formatted = utils.formatEther(amountToPay);
    expect(formatted).to.equal("416.666666666666666666");
  });

  it("AmountToPayByFrequency is correct - MONTH CONTRACT", async () => {
    var [techo, dai] = await deployContracts(Constants.Month, amount, Constants.Week, 1, owner);
    const amountToPay = await techo.amountToPayByFrequency();
    var formatted = utils.formatEther(amountToPay);
    expect(formatted).to.equal("1250.0");
  });

  it("Calculate 1% commission", async () => {
    var [techo, dai] = await deployContracts(Constants.Month, amount, Constants.Week, 1, owner);
    const feeAmount = await techo.getOwnerFeeAmount();
    var formattedCommission = utils.formatEther(feeAmount);
    expect(formattedCommission).to.equal("50.0");
  });

  it("Calculate 5% commission", async () => {
    var [techo, dai] = await deployContracts(Constants.Month, amount, Constants.Week, 5, owner);
    const feeAmount = await techo.getOwnerFeeAmount();
    var formattedCommission = utils.formatEther(feeAmount);
    expect(formattedCommission).to.be.equal("250.0");
  });

  it("Calculate 10% commission ", async () => {
    var [techo, dai] = await deployContracts(Constants.Month, amount, Constants.Week, 10, owner);
    const feeAmount = await techo.getOwnerFeeAmount();
    var formattedCommission = utils.formatEther(feeAmount);
    expect(formattedCommission).to.equal("500.0");
  });

  it("Calculate 50% commission ", async () => {
    var [techo, dai] = await deployContracts(Constants.Month, amount, Constants.Week, 50, owner);
    const feeAmount = await techo.getOwnerFeeAmount();
    var formattedCommission = utils.formatEther(feeAmount);
    expect(formattedCommission).to.equal("2500.0");
  });

  it("Contract duration is larger than frequency should fail", async () => {
    expect(deployContracts(Constants.Week, amount, Constants.Month, 5, owner)).to.be.revertedWith(
      "Payment frequency should be less than the contract duration"
    );
  });

  it("Contract is activated - happy path", async () => {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 2, owner);
    var tenantTecho = techo.connect(tenant);
    var tenantDai = dai.connect(tenant);
    var activateAmount = utils.parseEther("5100");
    await tenantDai.approve(techo.address, activateAmount);
    await expect(tenantTecho.activate(activateAmount)).to.emit(tenantTecho, "Activated");
    await expect(await techo.contractStatus()).to.equal(ContractStatus.ACTIVE);
    const start = (await techo.activationTime()).toString();
    const finish = (await techo.finalizationTime()).toString();
    await expect(await techo.activationTime()).to.be.not.null;
    await expect(finish).to.be.not.null;
    await expect(start).to.be.not.null;
    await expect(finish > start).to.be.true;

    const ownerBalance = await dai.balanceOf(owner.address);
    expect(utils.formatEther(ownerBalance)).to.equal("4100.0");
  });

  it("landlord tries to activate contract - should fail", async () => {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 2, owner);
    var landlordTecho = techo.connect(landlord);
    var landlordDai = dai.connect(landlord);
    await landlordDai.approve(techo.address, amount);
    await expect(landlordTecho.activate(amount)).to.be.revertedWith("only tenant can call this function");
  });

  it("owner tries to activate contract - should fail", async () => {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 2, owner);
    await dai.approve(techo.address, amount);
    await expect(techo.activate(amount)).to.be.revertedWith("only tenant can call this function");
  });

  it("Transferring less than required to activate should fail", async () => {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 2, owner);
    var tenantTecho = techo.connect(tenant);
    var tenantDai = dai.connect(tenant);
    await tenantDai.approve(techo.address, amount);
    await expect(tenantTecho.activate(utils.parseEther("4000"))).to.be.revertedWith("contract activation failed");
  });

  it("Transferring more than required to activate should fail", async () => {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 2, owner);
    var tenantTecho = techo.connect(tenant);
    var tenantDai = dai.connect(tenant);
    await tenantDai.approve(techo.address, amount);
    await expect(tenantTecho.activate(utils.parseEther("6000"))).to.be.revertedWith("contract activation failed");
  });

  it("Activating already activated contract should fail", async () => {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 2, owner);
    var tenantTecho = techo.connect(tenant);
    var tenantDai = dai.connect(tenant);
    var activateAmount = utils.parseEther("5100");
    await tenantDai.approve(techo.address, activateAmount);
    await tenantTecho.activate(activateAmount);
    await expect(tenantTecho.activate(activateAmount)).to.be.revertedWith("contract is already active");
  });

  it("Cancel contract-happy path", async () => {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 2, owner);
    var tenantTecho = techo.connect(tenant);
    var tenantDai = dai.connect(tenant);
    var activateAmount = utils.parseEther("5100");
    await tenantDai.approve(techo.address, activateAmount);
    await tenantTecho.activate(activateAmount);
    await expect(techo.cancelContract()).to.emit(techo, "Cancelled");
    await expect(await techo.contractStatus()).to.equal(ContractStatus.CANCELLED);
  });

  it("Cancel not active contract should fail ", async () => {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 2, owner);
    var tenantTecho = techo.connect(tenant);
    var tenantDai = dai.connect(tenant);
    var activateAmount = utils.parseEther("5100");
    await tenantDai.approve(techo.address, activateAmount);
    await tenantTecho.activate(activateAmount);
    await techo.cancelContract();
    await expect(techo.cancelContract()).to.be.revertedWith("contract is not active");
  });

  it("Landlord tries to collect rent twice in current cycle should fail ", async function () {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 2, owner);
    var tenantTecho = techo.connect(tenant);
    var tenantDai = dai.connect(tenant);
    var activateAmount = utils.parseEther("5100");
    await tenantDai.approve(techo.address, activateAmount);
    await tenantTecho.activate(activateAmount);
    const provider = new ethers.providers.JsonRpcProvider();
    var block = await provider.getBlock("latest");
    console.log("block", block.timestamp);
    const landlordTecho = techo.connect(landlord);

    expect(landlordTecho.collectRent())
      .to.emit(techo, "RentCollected")
      .withArgs(await techo.amountToPayByFrequency());

    expect(landlordTecho.collectRent()).to.be.revertedWith("you have already collected rent this current cycle");
  });

  it("Landlord tries to collect rent from not active contract should fail ", async function () {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 2, owner);
    var tenantDai = dai.connect(tenant);
    var activateAmount = utils.parseEther("5100");
    await tenantDai.approve(techo.address, activateAmount);
    const landlordTecho = techo.connect(landlord);
    const cycleIndex = 0;
    expect(landlordTecho.collectRent(cycleIndex)).to.be.revertedWith("contract is not active");
  });

  it("Landlord tries to collect rent from cancelled contract should fail ", async function () {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 2, owner);
    var tenantTecho = techo.connect(tenant);
    var tenantDai = dai.connect(tenant);
    var activateAmount = utils.parseEther("5100");
    await tenantDai.approve(techo.address, activateAmount);
    await tenantTecho.activate(activateAmount);
    const provider = new ethers.providers.JsonRpcProvider();
    var block = await provider.getBlock("latest");
    console.log("block", block.timestamp);
    const landlordTecho = techo.connect(landlord);
    const cycleIndex = 0;

    await techo.cancelContract();

    expect(landlordTecho.collectRent(cycleIndex)).to.be.revertedWith("contract is not active");
  });


  it("Landlord collects first rent - happy path ", async () => {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 2, owner);
    var tenantTecho = techo.connect(tenant);
    var tenantDai = dai.connect(tenant);
    var activateAmount = utils.parseEther("5100");
    await tenantDai.approve(techo.address, activateAmount);
    await tenantTecho.activate(activateAmount);

    const provider = new ethers.providers.JsonRpcProvider();

    var block = await provider.getBlock("latest");
    console.log("block", block.timestamp);
    const landlordTecho = techo.connect(landlord);

    expect(landlordTecho.collectRent())
      .to.emit(techo, "RentCollected")
      .withArgs(await techo.amountToPayByFrequency());
    const mapping = await techo.cycleMapping(0);
    expect(mapping.paid).to.be.true;
    const landlordBalance = await dai.balanceOf(landlord.address);
    expect(utils.formatEther(landlordBalance)).to.equal("416.666666666666666666");
  });

  it("cycles are correctly built ", async function () {
    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 2, owner);
    var tenantTecho = techo.connect(tenant);
    var tenantDai = dai.connect(tenant);
    var activateAmount = utils.parseEther("5100");
    await tenantDai.approve(techo.address, activateAmount);
    await tenantTecho.activate(activateAmount);

    const expectedCount = 12

    for (let i = 0; i < expectedCount; i++) {
      const mapping = await techo.cycleMapping(i);
      console.log("mapping", mapping.index, mapping.paid, mapping.start.toString(), mapping.finish.toString());
      expect(mapping.start < mapping.finish).to.be.true;
    }
    expect(await techo.cycleCount()).to.equal(expectedCount);
  });


  it("Landlord collects rent monthly in a 12 month contract - happy path ", async function () {

    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 2, owner);

    var tenantTecho = techo.connect(tenant);
    var tenantDai = dai.connect(tenant);
    var activateAmount = utils.parseEther("5100");
    await tenantDai.approve(techo.address, activateAmount);
    await tenantTecho.activate(activateAmount);

    await IncreaseTime(techo, Constants.Day);

    const landlordTecho = techo.connect(landlord);

    let prevLandlordBalance = await dai.balanceOf(landlord.address);
    console.log("landlord balance before", utils.formatEther(prevLandlordBalance));

    for (let cycleIndex = 0; cycleIndex < 12; cycleIndex++) {

      console.log("========================", "cycle", cycleIndex, "========================");
      await landlordTecho.collectRent();

      await IncreaseTime(landlordTecho, Constants.Month);

      let currentLandlordBalance = await dai.balanceOf(landlord.address);
      expect(prevLandlordBalance < currentLandlordBalance);
      prevLandlordBalance = currentLandlordBalance;
      const mapping = await techo.cycleMapping(cycleIndex);
      console.log("mapping", mapping.index, mapping.paid, mapping.start.toString(), mapping.finish.toString(), mapping.finish - mapping.start);
      expect(mapping.paid).to.be.true;
    }

    prevLandlordBalance = await dai.balanceOf(landlord.address);
    console.log("landlord balance after", utils.formatEther(prevLandlordBalance));

  });

  it("Landlord collects 7 rents in a 12 month contract, then owner cancels contract - happy path ", async function () {

    var [techo, dai] = await deployContracts(Constants.Year, amount, Constants.Month, 2, owner);

    var tenantTecho = techo.connect(tenant);
    var tenantDai = dai.connect(tenant);
    var activateAmount = utils.parseEther("5100");
    await tenantDai.approve(techo.address, activateAmount);
    await tenantTecho.activate(activateAmount);

    await IncreaseTime(techo, Constants.Day);

    const landlordTecho = techo.connect(landlord);

    let landlordBalance = await dai.balanceOf(landlord.address);
    console.log("landlord balance before", utils.formatEther(landlordBalance));

    for (let cycleIndex = 0; cycleIndex < 7; cycleIndex++) {

      console.log("========================", "cycle", cycleIndex, "========================");
      await landlordTecho.collectRent();

      await IncreaseTime(landlordTecho, Constants.Month);

      let currentLandlordBalance = await dai.balanceOf(landlord.address);
      expect(landlordBalance < currentLandlordBalance);
      landlordBalance = currentLandlordBalance;
      const mapping = await techo.cycleMapping(cycleIndex);
      console.log("mapping", mapping.index, mapping.paid, mapping.start.toString(), mapping.finish.toString(), mapping.finish - mapping.start);
      expect(mapping.paid).to.be.true;
    }

    techo.cancelContract();

    landlordBalance = await dai.balanceOf(landlord.address);
    console.log("landlord balance after", utils.formatEther(landlordBalance));
    expect(utils.formatEther(landlordBalance)).to.equal("2916.666666666666666662");

    tenantBalance = await dai.balanceOf(tenant.address);
    console.log("tenant balance after", utils.formatEther(tenantBalance));
    expect(utils.formatEther(tenantBalance)).to.equal("2983.333333333333333338");

  });

  it("Landlord collects rent weekly in a 1 month contract - happy path ", async function () {

    var [techo, dai] = await deployContracts(Constants.Month, amount, Constants.Week, 2, owner);

    var tenantTecho = techo.connect(tenant);
    var tenantDai = dai.connect(tenant);
    var activateAmount = utils.parseEther("5100");
    await tenantDai.approve(techo.address, activateAmount);
    await tenantTecho.activate(activateAmount);

    await IncreaseTime(techo, Constants.Day);

    const landlordTecho = techo.connect(landlord);

    let prevLandlordBalance = await dai.balanceOf(landlord.address);
    console.log("landlord balance before", utils.formatEther(prevLandlordBalance));

    for (let cycleIndex = 0; cycleIndex < 4; cycleIndex++) {

      console.log("========================", "cycle", cycleIndex, "========================");
      await landlordTecho.collectRent();

      await IncreaseTime(landlordTecho, Constants.Week);

      let currentLandlordBalance = await dai.balanceOf(landlord.address);
      expect(prevLandlordBalance < currentLandlordBalance);
      prevLandlordBalance = currentLandlordBalance;
      const mapping = await techo.cycleMapping(cycleIndex);
      console.log("mapping", mapping.index, mapping.paid, mapping.start.toString(), mapping.finish.toString(), mapping.finish - mapping.start);
      expect(mapping.paid).to.be.true;
    }

    prevLandlordBalance = await dai.balanceOf(landlord.address);
    console.log("landlord balance after", utils.formatEther(prevLandlordBalance));

  });
  it("Landlord collects rent daily in a 1 month contract - happy path ", async function () {

    var [techo, dai] = await deployContracts(Constants.Month, amount, Constants.Day, 2, owner);

    var tenantTecho = techo.connect(tenant);
    var tenantDai = dai.connect(tenant);
    var activateAmount = utils.parseEther("5100");
    await tenantDai.approve(techo.address, activateAmount);
    await tenantTecho.activate(activateAmount);

    // await IncreaseTime(techo, Constants.Day);

    const landlordTecho = techo.connect(landlord);

    let prevLandlordBalance = await dai.balanceOf(landlord.address);
    console.log("landlord balance before", utils.formatEther(prevLandlordBalance));

    for (let cycleIndex = 0; cycleIndex < 30; cycleIndex++) {

      console.log("========================", "cycle", cycleIndex, "========================");
      await landlordTecho.collectRent();

      await IncreaseTime(landlordTecho, Constants.Day);

      let currentLandlordBalance = await dai.balanceOf(landlord.address);
      expect(prevLandlordBalance < currentLandlordBalance);
      prevLandlordBalance = currentLandlordBalance;
      const mapping = await techo.cycleMapping(cycleIndex);
      console.log("mapping", mapping.index, mapping.paid, mapping.start.toString(), mapping.finish.toString(), mapping.finish - mapping.start);
      expect(mapping.paid).to.be.true;
    }

    prevLandlordBalance = await dai.balanceOf(landlord.address);
    console.log("landlord balance after", utils.formatEther(prevLandlordBalance));

  });

  async function IncreaseTime(contract, seconds) {
    let time = await contract.getCurrentTime();
    time = time.add(seconds);
    await contract.setCurrentTime(time);
  }

});
