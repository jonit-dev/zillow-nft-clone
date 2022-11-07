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

  struct RealEstate {
    bool isListed;
    uint256 purchasePrice;
    uint256 escrowAmount;
    address buyer;
    bool inspectionPassed;
  }

  mapping(uint256 => RealEstate) public listings;

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
  function list(
    uint256 _nftId,
    uint256 _listingPrice,
    address buyer
  ) public payable onlySeller notListed(_nftId) {
    // move token to this smart contract
    IERC721(nftAddress).safeTransferFrom(msg.sender, address(this), _nftId);

    // escrowAmount should be 10% of the listingPrice
    uint256 escrowAmount = (_listingPrice * 10) / 100;

    listings[_nftId] = RealEstate(true, _listingPrice, escrowAmount, buyer, false);
  }

  // Put under contract (only buyer - payable escrow) - its like a downpayment
  function depositEarnest(uint256 _nftID) public payable onlyBuyer(_nftID) {
    uint256 escrowAmount = listings[_nftID].escrowAmount;

    require(msg.value >= escrowAmount, "Not enough funds to deposit");
  }

  function updateInspectionStatus(uint256 _nftID, bool _passed) public onlyInspector {
    listings[_nftID].inspectionPassed = _passed;
  }

  receive() external payable {} // required for receiving ether to the SC

  function getBalance() public view returns (uint256) {
    return address(this).balance;
  }

  modifier onlyInspector() {
    require(msg.sender == inspector, "Only the inspector can call this function");
    _;
  }

  modifier onlyBuyer(uint256 _nftId) {
    require(msg.sender == listings[_nftId].buyer, "Only the buyer can call this function");
    _;
  }

  modifier onlySeller() {
    require(msg.sender == seller, "Only a seller can call this function.");
    _;
  }

  // modifier check token is not listed
  modifier notListed(uint256 _nftId) {
    require(listings[_nftId].isListed == false, "This token is already listed.");
    _;
  }
}
