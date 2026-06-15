// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {SpaceshipGame} from "../src/SpaceshipGame.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    ERC1967Proxy
} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// Simple ERC20 that always returns false for transfer/transferFrom to simulate failures
contract FailingERC20 is IERC20 {
    string public name = "Fail";
    string public symbol = "FAIL";
    uint8 public decimals = 6;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    function totalSupply() external pure override returns (uint256) {
        return 0;
    }
    function transfer(address, uint256) external pure override returns (bool) {
        return false;
    }
    function approve(address, uint256) external pure override returns (bool) {
        return true;
    }
    function transferFrom(
        address,
        address,
        uint256
    ) external pure override returns (bool) {
        return false;
    }
}

contract RejectETH {
    receive() external payable {
        revert("No ETH");
    }
}

contract SpaceshipGameTest is Test {
    // local matching event for expectEmit
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
    event RoundSnapshot(
        uint256 indexed roundId,
        bytes32 snapshotHash,
        bytes32 playersMerkleRoot,
        uint256 totalBets,
        uint256 totalPayouts,
        uint32 numPlayers
    );

    // Allow test contract to receive ETH
    receive() external payable {}

    SpaceshipGame public spaceship;
    ERC20Mock public usdc;
    address public constant PLAYER = address(1);
    address public constant PLAYER2 = address(2);
    uint256 public constant BET_AMOUNT = 1e6; // 1 USDC (6 decimals)

    function setUp() public {
        // Deploy mock USDC token
        usdc = new ERC20Mock();

        // Deploy SpaceshipGame implementation and proxy
        SpaceshipGame impl = new SpaceshipGame();
        bytes memory initData = abi.encodeCall(
            SpaceshipGame.initialize,
            (address(usdc), address(this))
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        spaceship = SpaceshipGame(payable(address(proxy)));

        // Mint USDC to test players and the test contract itself (for funding house)
        usdc.mint(PLAYER, 1000e6);
        usdc.mint(PLAYER2, 1000e6);
        usdc.mint(address(this), 10000e6);

        // Approve spaceship to spend players' USDC
        vm.prank(PLAYER);
        usdc.approve(address(spaceship), type(uint256).max);
        vm.prank(PLAYER2);
        usdc.approve(address(spaceship), type(uint256).max);

        // Approve spaceship to spend test contract's USDC
        usdc.approve(address(spaceship), type(uint256).max);
    }

    function test_PlaceBet() public {
        // We act as server operator (this contract is owner and initial operator)
        uint256 roundId = 123;

        // Player must deposit first
        vm.prank(PLAYER);
        spaceship.deposit(BET_AMOUNT);
        assertEq(spaceship.playerBalances(PLAYER), BET_AMOUNT);
        assertEq(spaceship.totalPlayerBalances(), BET_AMOUNT);

        vm.expectEmit(true, true, false, true);
        emit BetPlaced(roundId, PLAYER, BET_AMOUNT);

        spaceship.placeBetFor(roundId, PLAYER, BET_AMOUNT);

        assertEq(spaceship.playerBalances(PLAYER), 0);
        assertEq(spaceship.totalPlayerBalances(), 0);
        assertEq(usdc.balanceOf(address(spaceship)), BET_AMOUNT); // House keeps the bet
        assertEq(usdc.balanceOf(PLAYER), 1000e6 - BET_AMOUNT);
    }

    function test_CannotPlaceLowOrHighBet() public {
        uint256 roundId = 1;

        vm.prank(PLAYER);
        spaceship.deposit(1000e6); // Deposit the player's full balance

        vm.expectRevert(
            abi.encodeWithSelector(SpaceshipGame.InvalidBetAmount.selector)
        );
        spaceship.placeBetFor(roundId, PLAYER, 1);

        vm.expectRevert(
            abi.encodeWithSelector(SpaceshipGame.InvalidBetAmount.selector)
        );
        spaceship.placeBetFor(roundId, PLAYER, 1e9 * 1e6); // > MAX_BET
    }

    function test_CashOutInsufficientHouseBalance() public {
        uint256 roundId = 123;
        // No bets placed, house balance 0

        vm.expectRevert(
            abi.encodeWithSelector(
                SpaceshipGame.InsufficientHouseBalance.selector
            )
        );
        spaceship.cashOutFor(roundId, PLAYER, 2e6, 200); // Need 2 USDC but have 0
    }

    function test_CashOutSuccessFlow() public {
        uint256 roundId = 123;

        // Player must deposit first
        vm.prank(PLAYER);
        spaceship.deposit(BET_AMOUNT);

        // 1. Place bet to fund house (bet becomes house funds)
        spaceship.placeBetFor(roundId, PLAYER, BET_AMOUNT);
        assertEq(usdc.balanceOf(address(spaceship)), BET_AMOUNT);

        // 2. Cash out (simulate win 2x)
        uint256 payout = BET_AMOUNT * 2;
        // Use fundHouse to top up for the win since house only has 1 bet
        spaceship.fundHouse(BET_AMOUNT);
        assertEq(usdc.balanceOf(address(spaceship)), BET_AMOUNT * 2);

        vm.expectEmit(true, true, false, true);
        emit CashOut(roundId, PLAYER, payout, 200);

        spaceship.cashOutFor(roundId, PLAYER, payout, 200);

        // House balance should decrease
        uint256 houseBal = usdc.balanceOf(address(spaceship)) -
            spaceship.totalPlayerBalances();
        assertEq(houseBal, 0);

        // Player's game balance should have original + winnings
        assertEq(spaceship.playerBalances(PLAYER), payout);

        // Player withdraws
        vm.prank(PLAYER);
        spaceship.withdraw(payout);
        assertEq(spaceship.playerBalances(PLAYER), 0);
        assertEq(usdc.balanceOf(PLAYER), 1000e6 + BET_AMOUNT);
    }

    function test_AdminSetServerOperatorAndWithdraw() public {
        // Only owner (this contract) can set server operator
        address newOp = address(0xBEEF);

        // Non-owner cannot set server operator
        vm.prank(PLAYER);
        vm.expectRevert();
        spaceship.setServerOperator(newOp);

        // Owner sets it and we verify
        spaceship.setServerOperator(newOp);
        assertEq(spaceship.serverOperator(), newOp);

        // Fund house
        spaceship.fundHouse(BET_AMOUNT);

        // Withdraw profits
        uint256 before = usdc.balanceOf(address(this));
        spaceship.withdrawHouseProfits(BET_AMOUNT);
        assertEq(usdc.balanceOf(address(this)), before + BET_AMOUNT);
        assertEq(usdc.balanceOf(address(spaceship)), 0);
    }

    function test_PausePreventsActions() public {
        vm.prank(PLAYER);
        spaceship.deposit(BET_AMOUNT * 2);

        spaceship.pause();

        vm.expectRevert();
        spaceship.placeBetFor(1, PLAYER, BET_AMOUNT);

        spaceship.unpause();
        // after unpause should work
        spaceship.placeBetFor(1, PLAYER, BET_AMOUNT);
    }

    function test_TransferFailuresRevert() public {
        // Deploy failing token and new Spaceship Proxy with it
        FailingERC20 failToken = new FailingERC20();
        SpaceshipGame badImpl = new SpaceshipGame();
        bytes memory badInit = abi.encodeCall(
            SpaceshipGame.initialize,
            (address(failToken), address(this))
        );
        ERC1967Proxy badProxy = new ERC1967Proxy(address(badImpl), badInit);
        SpaceshipGame bad = SpaceshipGame(payable(address(badProxy)));

        // Attempt to deposit should revert because transferFrom returns false

        vm.prank(PLAYER);
        vm.expectRevert(
            abi.encodeWithSelector(SpaceshipGame.TransferFailed.selector)
        );
        bad.deposit(BET_AMOUNT);
    }

    function test_SnapshotOnlyServerOperator() public {
        uint256 rid = 1;
        bytes32 playersMerkleRoot = keccak256(abi.encodePacked("leaf"));
        bytes32 snapshotHash = keccak256("hash");

        vm.prank(PLAYER);
        vm.expectRevert(
            abi.encodeWithSelector(SpaceshipGame.Unauthorized.selector)
        );
        spaceship.snapshotRound(rid, snapshotHash, playersMerkleRoot, 0, 0, 1);
    }

    function test_SnapshotStoresAndEmits() public {
        uint256 rid = 10;
        bytes32 playersMerkleRoot = keccak256(abi.encodePacked("p1", "p2"));
        uint96 totalBets = 100;
        uint96 totalPayouts = 50;
        uint32 numPlayers = 2;
        bytes32 snapshotHash = keccak256("snapshot");

        // calling as server operator (this test contract is owner and initial serverOperator)
        vm.expectEmit(true, false, false, true);
        emit SpaceshipGame.RoundSnapshot(
            rid,
            snapshotHash,
            playersMerkleRoot,
            totalBets,
            totalPayouts,
            numPlayers
        );

        spaceship.snapshotRound(
            rid,
            snapshotHash,
            playersMerkleRoot,
            totalBets,
            totalPayouts,
            numPlayers
        );

        (
            bytes32 storedHash,
            bytes32 storedMerkle,
            uint96 storedBets,
            uint96 storedPayouts,
            uint32 storedNum
        ) = spaceship.roundSnapshots(rid);
        assertEq(storedHash, snapshotHash);
        assertEq(storedMerkle, playersMerkleRoot);
        assertEq(storedBets, totalBets);
        assertEq(storedPayouts, totalPayouts);
        assertEq(storedNum, numPlayers);
    }

    function test_ReceiveETH() public {
        vm.deal(PLAYER, 1 ether);
        vm.prank(PLAYER);
        (bool success, ) = address(spaceship).call{value: 0.5 ether}("");
        require(success, "Send failed");
        assertEq(address(spaceship).balance, 0.5 ether);
    }

    function test_WithdrawETH() public {
        vm.deal(address(spaceship), 1 ether);
        uint256 preBalance = address(this).balance;

        spaceship.withdrawEth(payable(address(this)), 0.4 ether);

        assertEq(address(spaceship).balance, 0.6 ether);
        assertEq(address(this).balance, preBalance + 0.4 ether);
    }

    function test_WithdrawETHFailures() public {
        // 1. Insufficient balance
        vm.expectRevert(SpaceshipGame.InsufficientBalance.selector);
        spaceship.withdrawEth(payable(address(this)), 1 ether); // Balance 0

        // 2. Transfer fail (mocking logic requires a contract that rejects ETH?
        //    Calls to EOA always succeed unless out of gas.
        //    Calls to contract fail if no receive/fallback or revert.)

        // Fund spaceship first
        vm.deal(address(spaceship), 1 ether);

        // Create a contract that reverts on receive
        RejectETH rejector = new RejectETH();

        vm.expectRevert(SpaceshipGame.ETHTransferFailed.selector);
        spaceship.withdrawEth(payable(address(rejector)), 0.5 ether);
    }

    // ============ New Comprehensive Tests ============

    function test_MultiplePlayersBetting() public {
        uint256 roundId = 999;
        uint256 bet1 = 100e6;
        uint256 bet2 = 200e6;

        vm.prank(PLAYER);
        spaceship.deposit(bet1);

        vm.prank(PLAYER2);
        spaceship.deposit(bet2);

        // Player 1 places bet
        spaceship.placeBetFor(roundId, PLAYER, bet1);

        // Player 2 places bet
        spaceship.placeBetFor(roundId, PLAYER2, bet2);

        // House balance should reflect both (since balances are now 0)
        assertEq(usdc.balanceOf(address(spaceship)), bet1 + bet2);
        assertEq(spaceship.totalPlayerBalances(), 0);

        // Wallet Balances updated
        assertEq(usdc.balanceOf(PLAYER), 1000e6 - bet1);
        assertEq(usdc.balanceOf(PLAYER2), 1000e6 - bet2);
    }

    function test_DepositAndWithdraw() public {
        uint256 amount = 50e6;

        vm.prank(PLAYER);
        spaceship.deposit(amount);
        assertEq(spaceship.playerBalances(PLAYER), amount);
        assertEq(spaceship.totalPlayerBalances(), amount);
        assertEq(usdc.balanceOf(PLAYER), 1000e6 - amount);

        vm.prank(PLAYER);
        spaceship.withdraw(amount);
        assertEq(spaceship.playerBalances(PLAYER), 0);
        assertEq(spaceship.totalPlayerBalances(), 0);
        assertEq(usdc.balanceOf(PLAYER), 1000e6);
    }

    function test_InitializationProtection() public {
        vm.expectRevert(); // Initializable: contract is already initialized
        spaceship.initialize(address(usdc), PLAYER);
    }

    function test_OnlyOwnerCanFundHouse() public {
        vm.prank(PLAYER); // Not owner
        vm.expectRevert();
        spaceship.fundHouse(BET_AMOUNT);
    }

    function test_OnlyOwnerCanPauseUnpause() public {
        vm.prank(PLAYER);
        vm.expectRevert();
        spaceship.pause();

        vm.prank(PLAYER);
        vm.expectRevert();
        spaceship.unpause();
    }

    function test_OnlyServerOperatorCanCallGameFunctions() public {
        uint256 roundId = 1;

        // Try to place bet as non-operator (e.g. Player trying to cheat and place bet directly?)
        // Wait, placeBetFor is `onlyServerOperator`.
        // The Player calls `placeBetFor`? No, the BACKEND calls `placeBetFor`.
        // If a user calls it directly, they revert `Unauthorized`.

        vm.prank(PLAYER);
        vm.expectRevert(
            abi.encodeWithSelector(SpaceshipGame.Unauthorized.selector)
        );
        spaceship.placeBetFor(roundId, PLAYER, BET_AMOUNT);

        // Try to cash out as non-operator
        vm.prank(PLAYER);
        vm.expectRevert(
            abi.encodeWithSelector(SpaceshipGame.Unauthorized.selector)
        );
        spaceship.cashOutFor(roundId, PLAYER, BET_AMOUNT, 200);
    }
}
