import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RealEstate } from "./../typechain/RealEstate.d";

import { expect } from "chai";
import { ethers } from "hardhat";
import { deployContract } from "../helpers/deployHelpers";

describe("RealEstate.sol", () => {
  let realEstate: RealEstate;

  let accounts: SignerWithAddress[], buyer: SignerWithAddress, seller: SignerWithAddress;

  // deploy contracts
  beforeEach(async () => {
    accounts = await ethers.getSigners();
    buyer = accounts[0];
    seller = accounts[1];

    realEstate = await deployContract("RealEstate", undefined, false);
  });

  describe("Minting", () => {
    it("should successfully mint a new NFT token with specific metadata", async () => {
      const tokenURLData = "https://google.com"; // in real life, this will be an image from IPFS

      //mint NFT as a seller

      const transaction = await realEstate.connect(seller).mint(tokenURLData);

      // wait for the transaction to be mined
      await transaction.wait();

      const mintedTokenURI = await realEstate.tokenURI(1);

      expect(mintedTokenURI).to.equal(tokenURLData);

      // get the total supply of NFTs
      const totalSupply = await realEstate.totalSupply();

      expect(totalSupply).to.equal(1);
    });
  });
});
