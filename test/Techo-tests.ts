import { expect } from "chai";
import { ethers } from "hardhat";
import { Constants, ContractStatus } from "./Constants";
import { BigNumber, Contract, Signer, utils } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

async function getContracts(
  duration: number,
  amount: BigNumber,
  frequency: number,
  commission: number,
  signer: Signer
): Promise<[Contract, Contract]> {
  var [owner, tenant, landlord] = await ethers.getSigners();
  const MockDai = await ethers.getContractFactory("MockDai");
  const dai = await MockDai.deploy();
  await dai.deployed();
  console.log("owner  is:", owner.address);
  console.log("owner has:", utils.formatEther(await dai.balanceOf(owner.address)));
  console.log("transfering 5000 dai from owner to tenant");
  await dai.transfer(tenant.address, utils.parseEther("5000"));

  console.log("now owner has:", utils.formatEther(await dai.balanceOf(owner.address)));
  console.log("now tenant has:", utils.formatEther(await dai.balanceOf(tenant.address)));
  const Techo = await ethers.getContractFactory("Techo", signer);
  const techo = await Techo.deploy(dai.address, tenant.address, landlord.address, duration, amount, frequency, commission);

  return [techo, dai];
}

describe("Techo", function () {
  let owner: SignerWithAddress, tenant: SignerWithAddress, landlord: SignerWithAddress;
  let amount: BigNumber;
  beforeEach(async () => {
    [owner, tenant, landlord] = await ethers.getSigners();
    amount = utils.parseEther("5000");
  });

  it("both owner and tenant have 5000 DAI each", async function () {
    var [techo, dai] = await getContracts(Constants.Year, amount, Constants.Month, 1, owner);
    await expect(await dai.balanceOf(tenant.address)).to.equal(utils.parseEther("5000"));
    await expect(await dai.balanceOf(owner.address)).to.equal(utils.parseEther("5000"));
  });

  it("Contract parameters are set", async function () {
    var [techo, dai] = await getContracts(Constants.Year, amount, Constants.Month, 1, owner);

    await expect(techo.daiInstance).to.be.not.null;
    await expect(await techo.contractStatus()).to.equal(ContractStatus.NOTACTIVE);
    await expect(await techo.contractDaiAmount()).to.be.not.null;
    await expect(await techo.contractSecondsDuration()).to.be.not.null;
    await expect(await techo.commissionPercentage()).to.be.not.null;
    await expect(await techo.paySecondsFrequency()).to.be.not.null;
    await expect(await techo.amountToPayByFrequency()).to.be.not.null;
  });

  it("tenant is correct", async function () {
    var [techo, dai] = await getContracts(Constants.Year, amount, Constants.Month, 5, owner);
    expect(await techo.tenant()).to.equal(tenant.address);
  });

  it("landlord is correct", async function () {
    var [techo, dai] = await getContracts(Constants.Year, amount, Constants.Month, 5, owner);
    expect(await techo.landlord()).to.equal(landlord.address);
  });

  it("Contract duration minimum required is 1 week", async function () {
    await expect(getContracts(Constants.Week - 1, amount, Constants.Month, 1, owner)).to.be.revertedWith(
      "Required minimum contract duration is 1 week"
    );
  });

  it("Contract status is NOTACTIVE after deployed", async function () {
    var [techo, dai] = await getContracts(Constants.Year, amount, Constants.Month, 5, owner);
    expect(await techo.contractStatus()).to.equal(ContractStatus.NOTACTIVE);
  });

  it("AmountToPayByFrequency is correct - YEAR CONTRACT", async function () {
    var [techo, dai] = await getContracts(Constants.Year, amount, Constants.Month, 1, owner);
    const amountToPay = await techo.amountToPayByFrequency();
    var formatted = utils.formatEther(amountToPay);
    expect(formatted).to.equal("416.666666666666666666");
  });

  it("AmountToPayByFrequency is correct - MONTH CONTRACT", async function () {
    var [techo, dai] = await getContracts(Constants.Month, amount, Constants.Week, 1, owner);
    const amountToPay = await techo.amountToPayByFrequency();
    var formatted = utils.formatEther(amountToPay);
    expect(formatted).to.equal("1250.0");
  });

  it("Calculate 1% commission", async function () {
    var [techo, dai] = await getContracts(Constants.Month, amount, Constants.Week, 1, owner);
    const commission = await techo.calculateCommission();
    var formattedCommission = utils.formatEther(commission);
    expect(formattedCommission).to.equal("50.0");
  });

  it("Calculate 5% commission", async function () {
    var [techo, dai] = await getContracts(Constants.Month, amount, Constants.Week, 5, owner);
    const commission = await techo.calculateCommission();
    var formattedCommission = utils.formatEther(commission);
    expect(formattedCommission).to.be.equal("250.0");
  });

  it("Calculate 10% commission ", async function () {
    var [techo, dai] = await getContracts(Constants.Month, amount, Constants.Week, 10, owner);
    const commission = await techo.calculateCommission();
    var formattedCommission = utils.formatEther(commission);
    expect(formattedCommission).to.equal("500.0");
  });

  it("Calculate 50% commission ", async function () {
    var [techo, dai] = await getContracts(Constants.Month, amount, Constants.Week, 50, owner);
    const commission = await techo.calculateCommission();
    var formattedCommission = utils.formatEther(commission);
    expect(formattedCommission).to.equal("2500.0");
  });

  it("Contract duration is larger than frequency", async function () {
    expect(getContracts(Constants.Week, amount, Constants.Month, 5, owner)).to.be.revertedWith(
      "Payment frequency should be less than the contract duration"
    );
  });
  it("Contract is activated - happy path", async function () {
    var [techo, dai] = await getContracts(Constants.Year, amount, Constants.Month, 2, owner);
    var tenantTecho = techo.connect(tenant);
    var tenantDai = dai.connect(tenant);
    await tenantDai.approve(techo.address, amount);
    await tenantTecho.activate(amount);
    await expect(await techo.contractStatus()).to.equal(ContractStatus.ACTIVE);
    const start = (await techo.activationTime()).toString();
    const finish = (await techo.finalizationTime()).toString();
    await expect(await techo.activationTime()).to.be.not.null;
    await expect(finish).to.be.not.null;
    await expect(start).to.be.not.null;
    await expect(finish > start).to.be.true;
  });

  it("Transferring less than required to activate should fail", async function () {});

  it("Transferring more than required to activate should fail", async function () {});

  it("Activating already activated contract should fail", async function () {});

  it("Cancel contract-happy path", async function () {});

  it("Cancel not active contract should fail ", async function () {});
});
