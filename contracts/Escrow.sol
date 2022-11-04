//SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

// import IERC721 from node_modules
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// import ERC721Received
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

contract Escrow is ERC721Holder {
  address public lender;
  address public inspector;
  address payable public seller;
  address public nftAddress;

  constructor(
    address _nftAddress,
    address payable _seller,
    address _inspector,
    address _lender
  ) {
    nftAddress = _nftAddress;
    seller = _seller;
    inspector = _inspector;
    lender = _lender;
  }

  // List NFT contract into Escrow
  function list(uint256 _nftId) public {
    // move token to this smart contract
    IERC721(nftAddress).safeTransferFrom(msg.sender, address(this), _nftId);
  }
}
