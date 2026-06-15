// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {
    OwnableUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {
    PausableUpgradeable
} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    IERC20Permit
} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {
    Initializable
} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {
    UUPSUpgradeable
} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract SpaceshipGame is
    Initializable,
    UUPSUpgradeable,
    ReentrancyGuard,
    OwnableUpgradeable,
    PausableUpgradeable
{
    // ============ State Variables ============

    // Token Configuration
    IERC20 public usdcToken;
    uint256 public constant MIN_BET = 1e5; // 0.04 USDC (6 decimals)
    uint256 public constant MAX_BET = 1000e6; // 1,000 USDC
    uint256 public constant MAX_PAYOUT = 5000e6; // 5,000 USDC max per cashout

    // Server operator (trusted for game operations)
    address public serverOperator;

    // Player balances for deposit/withdrawal flow
    mapping(address => uint256) public playerBalances;
    uint256 public totalPlayerBalances;

    // Snapshot storage
    struct RoundSnapshotData {
        bytes32 snapshotHash;
        bytes32 playersMerkleRoot;
        uint96 totalBets;
        uint96 totalPayouts;
        uint32 numPlayers;
    }
    mapping(uint256 => RoundSnapshotData) public roundSnapshots;

    // ============ Events ============
    event BetPlaced(
        uint256 indexed roundId,
        address indexed player,
        uint256 amount
    );

    event CashOut(
        uint256 indexed roundId,
        address indexed player,
        uint256 payout,
        uint256 multiplier
    );

    event ServerOperatorUpdated(address indexed newOperator);

    // Player funds events
    event Deposit(address indexed player, uint256 amount);
    event Withdrawal(address indexed player, uint256 amount);

    // Snapshot event
    event RoundSnapshot(
        uint256 indexed roundId,
        bytes32 snapshotHash,
        bytes32 playersMerkleRoot,
        uint256 totalBets,
        uint256 totalPayouts,
        uint32 numPlayers
    );

    event HouseFunded(address indexed sender, uint256 amount);
    event HouseWithdrawn(address indexed recipient, uint256 amount);

    // ============ Errors ============
    error InvalidBetAmount();
    error InsufficientHouseBalance();
    error Unauthorized();
    error TransferFailed();
    error InvalidTokenAddress();
    error InvalidAddress();
    error InsufficientBalance();
    error ETHTransferFailed();

    // ============ Modifiers ============
    modifier onlyServerOperator() {
        _onlyServerOperator();
        _;
    }

    function _onlyServerOperator() internal view {
        if (msg.sender != serverOperator) revert Unauthorized();
    }

    // ============ Constructor ============
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _usdcToken,
        address initialOwner
    ) public initializer {
        __Ownable_init(initialOwner);
        __Pausable_init();

        if (_usdcToken == address(0)) revert InvalidTokenAddress();
        usdcToken = IERC20(_usdcToken);
        serverOperator = initialOwner;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    /// @notice Allows the contract to receive ETH
    receive() external payable {}

    /// @notice Withdraw ETH sent to this contract (e.g. for gas or accidentally sent)
    /// @param to Recipient address
    /// @param amount Amount of ETH to withdraw
    function withdrawEth(
        address payable to,
        uint256 amount
    ) external onlyOwner {
        if (address(this).balance < amount) revert InsufficientBalance();
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert ETHTransferFailed();
    }

    // ============ Player Deposit / Withdraw Functions ============

    /**
     * @notice Deposit USDC into the game contract.
     * @param amount Amount of USDC to deposit.
     */
    function deposit(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert InvalidBetAmount();

        bool success = usdcToken.transferFrom(
            msg.sender,
            address(this),
            amount
        );
        if (!success) revert TransferFailed();

        playerBalances[msg.sender] += amount;
        totalPlayerBalances += amount;

        emit Deposit(msg.sender, amount);
    }

    /**
     * @notice Deposit USDC using ERC-2612 Permit for a single-transaction flow.
     * @param amount Amount of USDC to deposit.
     */
    function depositWithPermit(
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external whenNotPaused nonReentrant {
        if (amount == 0) revert InvalidBetAmount();

        // Call permit on the USDC token
        IERC20Permit(address(usdcToken)).permit(
            msg.sender,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );

        bool success = usdcToken.transferFrom(
            msg.sender,
            address(this),
            amount
        );
        if (!success) revert TransferFailed();

        playerBalances[msg.sender] += amount;
        totalPlayerBalances += amount;

        emit Deposit(msg.sender, amount);
    }

    /**
     * @notice Withdraw deposited USDC and winnings from the game contract.
     * @param amount Amount of USDC to withdraw.
     */
    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidBetAmount();
        if (playerBalances[msg.sender] < amount) revert InsufficientBalance();

        playerBalances[msg.sender] -= amount;
        totalPlayerBalances -= amount;

        bool success = usdcToken.transfer(msg.sender, amount);
        if (!success) revert TransferFailed();

        emit Withdrawal(msg.sender, amount);
    }

    // ============ Core Game Functions ============

    /**
     * @notice Place a bet on behalf of a player for a specific round.
     * @dev Transfers tokens from player to contract. Backend tracks state.
     */
    function placeBetFor(
        uint256 roundId,
        address player,
        uint256 amount
    ) external nonReentrant whenNotPaused onlyServerOperator {
        if (amount < MIN_BET || amount > MAX_BET) revert InvalidBetAmount();
        if (playerBalances[player] < amount) revert InsufficientBalance();

        // Deduct from player's deposited balance
        playerBalances[player] -= amount;
        totalPlayerBalances -= amount;

        emit BetPlaced(roundId, player, amount);
    }

    /**
     * @notice Process a cashout (payout) for a player.
     * @dev Transfers tokens from contract to player.
     */
    function cashOutFor(
        uint256 roundId,
        address player,
        uint256 payout,
        uint256 multiplier
    ) external nonReentrant whenNotPaused onlyServerOperator {
        if (payout > MAX_PAYOUT) revert InsufficientHouseBalance();

        uint256 houseBalance = usdcToken.balanceOf(address(this)) -
            totalPlayerBalances;
        if (houseBalance < payout) revert InsufficientHouseBalance();

        // Credit the payout to the player's balance
        playerBalances[player] += payout;
        totalPlayerBalances += payout;

        emit CashOut(roundId, player, payout, multiplier);
    }

    // ============ Admin Functions ============
    function setServerOperator(address newOperator) external onlyOwner {
        if (newOperator == address(0)) revert InvalidAddress();
        serverOperator = newOperator;
        emit ServerOperatorUpdated(newOperator);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function fundHouse(uint256 amount) external onlyOwner {
        bool success = usdcToken.transferFrom(
            msg.sender,
            address(this),
            amount
        );
        if (!success) revert TransferFailed();
        emit HouseFunded(msg.sender, amount);
    }

    function withdrawHouseProfits(uint256 amount) external onlyOwner {
        uint256 houseBalance = usdcToken.balanceOf(address(this)) -
            totalPlayerBalances;
        if (amount > houseBalance) revert InsufficientHouseBalance();

        bool success = usdcToken.transfer(owner(), amount);
        if (!success) revert TransferFailed();
        emit HouseWithdrawn(owner(), amount);
    }

    // ============ Snapshot Functions ============
    /// @notice Submit a compact snapshot of a settled round for on-chain attestation
    /// @param totalBets downcast to uint96 to save gas
    /// @param totalPayouts downcast to uint96 to save gas
    function snapshotRound(
        uint256 roundId,
        bytes32 snapshotHash,
        bytes32 playersMerkleRoot,
        uint96 totalBets,
        uint96 totalPayouts,
        uint32 numPlayers
    ) external onlyServerOperator whenNotPaused {
        // Store snapshot and emit event
        roundSnapshots[roundId] = RoundSnapshotData({
            snapshotHash: snapshotHash,
            playersMerkleRoot: playersMerkleRoot,
            totalBets: totalBets,
            totalPayouts: totalPayouts,
            numPlayers: numPlayers
        });

        emit RoundSnapshot(
            roundId,
            snapshotHash,
            playersMerkleRoot,
            totalBets,
            totalPayouts,
            numPlayers
        );
    }
}
