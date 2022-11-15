import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Escrow } from "./../typechain/Escrow.d";
import { RealEstate } from "./../typechain/RealEstate.d";

import { ethers } from "hardhat";
import { deployContract } from "../helpers/deployHelpers";

import { BigNumber } from "ethers";
import { toToken } from "../helpers/utilsHelper";

describe("Escrow.sol", () => {
  let accounts: SignerWithAddress[],
    lender: SignerWithAddress,
    inspector: SignerWithAddress,
    seller: SignerWithAddress,
    buyer: SignerWithAddress;

  let escrow: Escrow;
  let realEstateNFT: RealEstate;

  // deploy contracts
  beforeEach(async () => {
    accounts = await ethers.getSigners();
    lender = accounts[0];
    inspector = accounts[1];
    seller = accounts[2];
    buyer = accounts[3];

    realEstateNFT = await deployContract("RealEstate", undefined, false);

    escrow = await deployContract(
      "Escrow",
      {
        args: [realEstateNFT.address, seller.address, inspector.address, lender.address],
      },
      false
    );
  });

  describe("Listing", () => {
    it("should have the proper related addresses, after deployed", async () => {
      const lenderAddr = await escrow.lender();
      const inspectorAddr = await escrow.inspector();
      const sellerAddr = await escrow.seller();
      const nftAddr = await escrow.nftAddress();

      expect(lenderAddr).to.equal(lender.address);
      expect(inspectorAddr).to.equal(inspector.address);
      expect(sellerAddr).to.equal(seller.address);
      expect(nftAddr).to.equal(realEstateNFT.address);
    });

    it("should successfully list a NFT on the Escrow", async () => {
      // first, make the seller mint a new token

      await realEstateNFT.connect(seller).mint("https://google.com");

      // expect the owner of the token 1 to be the seller
      const tokenOwner = await realEstateNFT.ownerOf(1);

      expect(tokenOwner).to.equal(seller.address);

      // seller should approve transfer of the token to the escrow contract
      await realEstateNFT.connect(seller).approve(escrow.address, 1);

      // then, lets list the token on the escrow

      await escrow.connect(seller).list(1, toToken("100"), buyer.address);

      // expect the token to be listed on the escrow

      const updatedTokenOwner = await realEstateNFT.ownerOf(1);

      expect(updatedTokenOwner).to.equal(escrow.address);

      const listingData = await escrow.listings(1);

      expect(listingData.isListed).to.equal(true);

      expect(listingData.purchasePrice).to.equal(toToken("100"));

      expect(listingData.escrowAmount).to.equal(toToken("10"));

      expect(listingData.buyer).to.equal(buyer.address);

      expect(listingData.inspectionPassed).to.equal(false);
    });
  });

  const mintApproveTransactionAndList = async (account: SignerWithAddress) => {
    await realEstateNFT.connect(account).mint("https://google.com");

    await realEstateNFT.connect(account).approve(escrow.address, 1);

    await escrow.connect(account).list(1, toToken("100"), buyer.address);
  };

  describe("Deposits", () => {
    it("Updates contract balance after the buyer deposits the earnest", async () => {
      await mintApproveTransactionAndList(seller);

      await escrow.connect(buyer).depositEarnest(1, { value: toToken("10") }); // buyer deposits escrow amount (downpayment)

      const contractBalance = await ethers.provider.getBalance(escrow.address);

      expect(contractBalance).to.equal(toToken("10"));
    });
  });

  describe("Inspections", () => {
    it("should properly update the Real estate listing inspection status", async () => {
      await mintApproveTransactionAndList(seller);

      await escrow.connect(inspector).updateInspectionStatus(1, true);

      const listingData = await escrow.listings(1);

      expect(listingData.inspectionPassed).to.equal(true);
    });
  });

  describe("Approval", () => {
    it("should properly approve a NFT sale", async () => {
      await mintApproveTransactionAndList(seller);

      await escrow.connect(buyer).approveSale(1);
      await escrow.connect(seller).approveSale(1);
      await escrow.connect(lender).approveSale(1);

      const approvalStateBuyer = await escrow.nftApprovalStates(1, buyer.address);
      const approvalStateSeller = await escrow.nftApprovalStates(1, seller.address);
      const approvalStateLender = await escrow.nftApprovalStates(1, lender.address);

      expect(approvalStateBuyer).to.equal(true);
      expect(approvalStateSeller).to.equal(true);
      expect(approvalStateLender).to.equal(true);
    });
  });

  describe("Sale", () => {
    let initialSellerBalance: BigNumber;

    beforeEach(async () => {
      initialSellerBalance = await seller.getBalance();

      await mintApproveTransactionAndList(seller);

      await escrow.connect(buyer).depositEarnest(1, { value: toToken("10") }); // buyer deposits escrow amount (downpayment)

      await escrow.connect(inspector).updateInspectionStatus(1, true);

      await escrow.connect(buyer).approveSale(1);
      await escrow.connect(seller).approveSale(1);
      await escrow.connect(lender).approveSale(1);

      await lender.sendTransaction({
        to: escrow.address,
        value: toToken("90"),
      });

      await escrow.connect(seller).finalizeSale(1);
    });

    it("escrow should have a balance of zero after a sale is finalized", async () => {
      const escrowBalance = await escrow.getBalance();

      const sellerBalance = await seller.getBalance();

      expect(escrowBalance).to.equal(0);

      expect(sellerBalance > initialSellerBalance).to.equal(true);

      const tokenOwner = await realEstateNFT.ownerOf(1);

      expect(tokenOwner).to.equal(buyer.address);
    });
  });

  describe("Validations", () => {
    it("should revert is a person other than the seller tries to list a token", async () => {
      await realEstateNFT.connect(lender).mint("https://google.com");

      await realEstateNFT.connect(lender).approve(escrow.address, 1);

      await expect(escrow.connect(lender).list(1, toToken("100"), buyer.address)).to.be.revertedWith(
        "Only a seller can call this function."
      );
    });

    it("should revert if an account that's not an inspector tries to update the inspection state", async () => {
      await mintApproveTransactionAndList(seller);

      await expect(escrow.connect(buyer).updateInspectionStatus(1, true)).to.be.revertedWith(
        "Only the inspector can call this function"
      );
    });

    it("should revert if the seller tries to list a token that is already listed", async () => {
      await mintApproveTransactionAndList(seller);

      await expect(escrow.connect(seller).list(1, toToken("100"), buyer.address)).to.be.revertedWith(
        "This token is already listed."
      );
    });

    it("should revert if an address thats not a buyer calls the depositEarnest method", async () => {
      await mintApproveTransactionAndList(seller);

      await expect(escrow.connect(seller).depositEarnest(1, { value: toToken("10") })).to.be.revertedWith(
        "Only the buyer can call this function"
      );
    });
  });
});
