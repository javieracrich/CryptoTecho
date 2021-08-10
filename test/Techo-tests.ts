import { expect } from "chai";
import { ethers } from "hardhat";
import { Constants, ContractStatus } from "./Constants";
import { Signer, utils } from "ethers";

async function getContract(duration: number, daiAmount: string, frequency: number, commission: number, signer: Signer): Promise<any> {
  const MockDai = await ethers.getContractFactory("MockDai");
  var mockDai = await MockDai.deploy();
  await mockDai.deployed();
  const Techo = await ethers.getContractFactory("Techo", signer);
  var [owner, tenant, landlord] = await ethers.getSigners();
  const techo = Techo.deploy(mockDai.address, tenant.address, landlord.address, duration, daiAmount, frequency, commission);
  return techo;
}

describe("Techo", function () {
  it("Contract parameters are set", async function () {
    var [owner, tenant, landlord] = await ethers.getSigners();
    var techo = await getContract(Constants.Year, add18(12), Constants.Month, 1, owner);

    await expect(techo.daiInstance).to.be.not.null;
    await expect(await techo.contractStatus()).to.equal(ContractStatus.NOTACTIVE);
    await expect(await techo.contractDaiAmount()).to.be.not.null;
    await expect(await techo.contractSecondsDuration()).to.be.not.null;
    await expect(await techo.commissionPercentage()).to.be.not.null;
    await expect(await techo.paySecondsFrequency()).to.be.not.null;
    await expect(await techo.amountToPayByFrequency()).to.be.not.null;
  });

  it("tenant is correct", async function () {
    var [owner, tenant, landlord] = await ethers.getSigners();
    var techo = await getContract(Constants.Year, add18(12), Constants.Month, 5, owner);
    expect(await techo.tenant()).to.equal(tenant.address);
  });

  it("landlord is correct", async function () {
    var [owner, tenant, landlord] = await ethers.getSigners();
    var techo = await getContract(Constants.Year, add18(12), Constants.Month, 5, owner);
    expect(await techo.landlord()).to.equal(landlord.address);
  });

  it("Contract duration minimum required is 1 week", async function () {
    var [owner, tenant, landlord] = await ethers.getSigners();
    await expect(getContract(Constants.Week - 1, add18(12), Constants.Month, 1, owner)).to.be.revertedWith(
      "Required minimum contract duration is 1 week"
    );
  });

  it("Contract status is NOTACTIVE after deployed", async function () {
    var [owner, tenant, landlord] = await ethers.getSigners();
    var techo = await getContract(Constants.Year, add18(12), Constants.Month, 5, owner);
    expect(await techo.contractStatus()).to.equal(ContractStatus.NOTACTIVE);
  });

  it("AmountToPayByFrequency is correct - YEAR CONTRACT", async function () {
    var [owner, tenant, landlord] = await ethers.getSigners();
    var techo = await getContract(Constants.Year, add18(24), Constants.Month, 1, owner);
    const amountToPay = await techo.amountToPayByFrequency();
    var amount = utils.formatEther(amountToPay);
    expect(amount).to.equal("1.846153846153846153");
  });

  it("AmountToPayByFrequency is correct - MONTH CONTRACT", async function () {
    var [owner, tenant, landlord] = await ethers.getSigners();
    var techo = await getContract(Constants.Month, add18(4), Constants.Week, 1, owner);
    const amountToPay = await techo.amountToPayByFrequency();
    var amount = utils.formatEther(amountToPay);
    expect(amount).to.equal("1.0");
  });

  it("Calculate 1% commission", async function () {
    var [owner, tenant, landlord] = await ethers.getSigners();
    var techo = await getContract(Constants.Month, add18(4), Constants.Week, 1, owner);
    const commission = await techo.calculateCommission();
    var formattedCommission = utils.formatEther(commission);
    expect(formattedCommission).to.be.equal("0.04");
  });

  it("Calculate 5% commission", async function () {
    var [owner, tenant, landlord] = await ethers.getSigners();
    var techo = await getContract(Constants.Month, add18(7), Constants.Week, 5, owner);
    const commission = await techo.calculateCommission();
    var formattedCommission = utils.formatEther(commission);
    expect(formattedCommission).to.be.equal("0.35");
  });

  it("Calculate 10% commission ", async function () {
    var [owner, tenant, landlord] = await ethers.getSigners();
    var techo = await getContract(Constants.Month, add18(5), Constants.Week, 10, owner);
    const commission = await techo.calculateCommission();
    var formattedCommission = utils.formatEther(commission);
    expect(formattedCommission).to.be.equal("0.5");
  });

  it("Calculate 50% commission ", async function () {
    var [owner, tenant, landlord] = await ethers.getSigners();
    var techo = await getContract(Constants.Month, add18(5), Constants.Week, 50, owner);
    const commission = await techo.calculateCommission();
    var formattedCommission = utils.formatEther(commission);
    expect(formattedCommission).to.be.equal("2.5");
  });

  it("Contract duration is larger than frequency", async function () {
    var [owner, tenant, landlord] = await ethers.getSigners();
    expect(getContract(Constants.Week, add18(5), Constants.Month, 5, owner)).to.be.revertedWith(
      "Payment frequency should be less than the contract duration"
    );
  });
  it("Contract is activated", async function () {
    //     var [owner, tenant, landlord] = await ethers.getSigners();
    //     var techo = await getContract(Constants.Year, add18(12), Constants.Month, 2, tenant);
    //  //   const [owner, tenant, landlord] = await ethers.getSigners();
    //     tenant.connect();
    //     tenant.sendTransaction;
    //     const tx = await techo.activate(add18(12));
    //     await tx.wait();
  });
});

function add18(number: Number): string {
  return utils.parseEther(number + "").toString();
}
