import { expect } from "chai";

import { ethers } from "hardhat";

import { BigNumber, utils } from "ethers";

describe("Techo", function () {
  it("Contract duration minimum required is 1 week", async function () {
    const MockDai = await ethers.getContractFactory("MockDai");
    var mockDai = await MockDai.deploy();
    await mockDai.deployed();
    const Techo = await ethers.getContractFactory("Techo");
    const secondsInAWeek = 604800;
    const daiAmount = "12000000000000000000"; //12 dai.
    const frequency = 2_592_000; // 30 days

    await expect(Techo.deploy(mockDai.address, secondsInAWeek - 1, daiAmount, frequency)).to.be.revertedWith(
      "Required minimum contract duration is 1 week"
    );
  });

  it("Contract status is NOTACTIVE after deployed", async function () {
    const MockDai = await ethers.getContractFactory("MockDai");
    var mockDai = await MockDai.deploy();
    await mockDai.deployed();
    const Techo = await ethers.getContractFactory("Techo");
    const secondsInAYear = 31_536_000; //1 year
    const daiAmount = "12000000000000000000"; //12 dai.
    const frequency = 2_592_000; // 30 days

    var techo = await Techo.deploy(mockDai.address, secondsInAYear, daiAmount, frequency);
    expect(await techo.contractStatus()).to.equal(ContractStatus.NOTACTIVE);
  });

  it("AmountToPayByFrequency is correct -YEAR CONTRACT", async function () {
    const MockDai = await ethers.getContractFactory("MockDai");
    var mockDai = await MockDai.deploy();
    await mockDai.deployed();
    const Techo = await ethers.getContractFactory("Techo");
    const secondsInAYear = 31_536_000; //1 year
    const daiAmount = "24000000000000000000"; //24 dai.
    const frequency = 2_592_000; // 30 days

    var techo = await Techo.deploy(mockDai.address, secondsInAYear, daiAmount, frequency);
    await techo.deployed();
    const amountToPay = await techo.amountToPayByFrequency();
    var amount = utils.formatEther(amountToPay);
    expect(amount).to.equal("2.0");
  });

  it("AmountToPayByFrequency is correct- MONTH CONTRACT", async function () {
    const MockDai = await ethers.getContractFactory("MockDai");
    var mockDai = await MockDai.deploy();
    await mockDai.deployed();
    const Techo = await ethers.getContractFactory("Techo");
    const secondsInAMonth = 2_419_200; // 28 days
    const daiAmount = "4000000000000000000"; //4 dai.
    const frequency = 604_800; // 7 days

    var techo = await Techo.deploy(mockDai.address, secondsInAMonth, daiAmount, frequency);
    await techo.deployed();
    const amountToPay = await techo.amountToPayByFrequency();
    var amount = utils.formatEther(amountToPay);
    expect(amount).to.equal("1.0");
  });
});

enum ContractStatus {
  NOTACTIVE,
  ACTIVE,
  CANCELLED,
}
