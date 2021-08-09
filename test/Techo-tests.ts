import { expect } from "chai";
import { ethers } from "hardhat";
import { Constants, ContractStatus } from "./Constants";
import { utils } from "ethers";

async function getContract(duration: number, daiAmount: string, frequency: number, commission: number): Promise<any> {
  const MockDai = await ethers.getContractFactory("MockDai");
  var mockDai = await MockDai.deploy();
  await mockDai.deployed();
  const Techo = await ethers.getContractFactory("Techo");
  const techo = Techo.deploy(mockDai.address, duration, daiAmount, frequency, commission);
  return techo;
}

describe("Techo", function () {
  it("Contract duration minimum required is 1 week", async function () {
    await expect(getContract(Constants.Week - 1, add18(12), Constants.Month, 1)).to.be.revertedWith("Required minimum contract duration is 1 week");
  });

  it("Contract status is NOTACTIVE after deployed", async function () {
    var techo = await getContract(Constants.Year, add18(12), Constants.Month, 5);
    expect(await techo.contractStatus()).to.equal(ContractStatus.NOTACTIVE);
  });

  it("AmountToPayByFrequency is correct - YEAR CONTRACT", async function () {
    var techo = await getContract(Constants.Year, add18(24), Constants.Month, 1);
    const amountToPay = await techo.amountToPayByFrequency();
    var amount = utils.formatEther(amountToPay);
    expect(amount).to.equal("1.846153846153846153");
  });

  it("AmountToPayByFrequency is correct - MONTH CONTRACT", async function () {
    var techo = await getContract(Constants.Month, add18(4), Constants.Week, 1);
    const amountToPay = await techo.amountToPayByFrequency();
    var amount = utils.formatEther(amountToPay);
    expect(amount).to.equal("1.0");
  });

  it("Calculate 1% commission", async function () {
    var techo = await getContract(Constants.Month, add18(4), Constants.Week, 1);
    const commission = await techo.calculateCommission();
    var formattedCommission = utils.formatEther(commission);
    expect(formattedCommission).to.be.equal("0.04");
  });

  it("Calculate 5% commission", async function () {
    var techo = await getContract(Constants.Month, add18(7), Constants.Week, 5);
    const commission = await techo.calculateCommission();
    var formattedCommission = utils.formatEther(commission);
    expect(formattedCommission).to.be.equal("0.35");
  });

  it("Calculate 10% commission ", async function () {
    var techo = await getContract(Constants.Month, add18(5), Constants.Week, 10);
    const commission = await techo.calculateCommission();
    var formattedCommission = utils.formatEther(commission);
    expect(formattedCommission).to.be.equal("0.5");
  });

  it("Calculate 50% commission ", async function () {
    var techo = await getContract(Constants.Month, add18(5), Constants.Week, 50);
    const commission = await techo.calculateCommission();
    var formattedCommission = utils.formatEther(commission);
    expect(formattedCommission).to.be.equal("2.5");
  });
});

function add18(number: Number): string {
  return utils.parseEther(number + '').toString();
}
