// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {AviatorGame} from "../src/AviatorGame.sol";
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

contract AviatorGameTest is Test {
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

    AviatorGame public aviator;
    ERC20Mock public usdc;
    address public constant PLAYER = address(1);
    address public constant PLAYER2 = address(2);
    uint256 public constant BET_AMOUNT = 1e6; // 1 USDC (6 decimals)

    function setUp() public {
        // Deploy mock USDC token
        usdc = new ERC20Mock();

        // Deploy AviatorGame implementation and proxy
        AviatorGame impl = new AviatorGame();
        bytes memory initData = abi.encodeCall(
            AviatorGame.initialize,
            (address(usdc), address(this))
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        aviator = AviatorGame(payable(address(proxy)));

        // Mint USDC to test players and the test contract itself (for funding house)
        usdc.mint(PLAYER, 1000e6);
        usdc.mint(PLAYER2, 1000e6);
        usdc.mint(address(this), 10000e6);

        // Approve aviator to spend players' USDC
        vm.prank(PLAYER);
        usdc.approve(address(aviator), type(uint256).max);
        vm.prank(PLAYER2);
        usdc.approve(address(aviator), type(uint256).max);

        // Approve aviator to spend test contract's USDC
        usdc.approve(address(aviator), type(uint256).max);
    }

    function test_PlaceBet() public {
        // We act as server operator (this contract is owner and initial operator)
        uint256 roundId = 123;

        // Player must deposit first
        vm.prank(PLAYER);
        aviator.deposit(BET_AMOUNT);
        assertEq(aviator.playerBalances(PLAYER), BET_AMOUNT);
        assertEq(aviator.totalPlayerBalances(), BET_AMOUNT);

        vm.expectEmit(true, true, false, true);
        emit BetPlaced(roundId, PLAYER, BET_AMOUNT);

        aviator.placeBetFor(roundId, PLAYER, BET_AMOUNT);

        assertEq(aviator.playerBalances(PLAYER), 0);
        assertEq(aviator.totalPlayerBalances(), 0);
        assertEq(usdc.balanceOf(address(aviator)), BET_AMOUNT); // House keeps the bet
        assertEq(usdc.balanceOf(PLAYER), 1000e6 - BET_AMOUNT);
    }

    function test_CannotPlaceLowOrHighBet() public {
        uint256 roundId = 1;

        vm.prank(PLAYER);
        aviator.deposit(1000e6); // Deposit the player's full balance

        vm.expectRevert(
            abi.encodeWithSelector(AviatorGame.InvalidBetAmount.selector)
        );
        aviator.placeBetFor(roundId, PLAYER, 1);

        vm.expectRevert(
            abi.encodeWithSelector(AviatorGame.InvalidBetAmount.selector)
        );
        aviator.placeBetFor(roundId, PLAYER, 1e9 * 1e6); // > MAX_BET
    }

    function test_CashOutInsufficientHouseBalance() public {
        uint256 roundId = 123;
        // No bets placed, house balance 0

        vm.expectRevert(
            abi.encodeWithSelector(
                AviatorGame.InsufficientHouseBalance.selector
            )
        );
        aviator.cashOutFor(roundId, PLAYER, 2e6, 200); // Need 2 USDC but have 0
    }

    function test_CashOutSuccessFlow() public {
        uint256 roundId = 123;

        // Player must deposit first
        vm.prank(PLAYER);
        aviator.deposit(BET_AMOUNT);

        // 1. Place bet to fund house (bet becomes house funds)
        aviator.placeBetFor(roundId, PLAYER, BET_AMOUNT);
        assertEq(usdc.balanceOf(address(aviator)), BET_AMOUNT);

        // 2. Cash out (simulate win 2x)
        uint256 payout = BET_AMOUNT * 2;
        // Use fundHouse to top up for the win since house only has 1 bet
        aviator.fundHouse(BET_AMOUNT);
        assertEq(usdc.balanceOf(address(aviator)), BET_AMOUNT * 2);

        vm.expectEmit(true, true, false, true);
        emit CashOut(roundId, PLAYER, payout, 200);

        aviator.cashOutFor(roundId, PLAYER, payout, 200);

        // House balance should decrease
        uint256 houseBal = usdc.balanceOf(address(aviator)) - aviator.totalPlayerBalances();
        assertEq(houseBal, 0);

        // Player's game balance should have original + winnings
        assertEq(aviator.playerBalances(PLAYER), payout);
        
        // Player withdraws
        vm.prank(PLAYER);
        aviator.withdraw(payout);
        assertEq(aviator.playerBalances(PLAYER), 0);
        assertEq(usdc.balanceOf(PLAYER), 1000e6 + BET_AMOUNT);
    }

    function test_AdminSetServerOperatorAndWithdraw() public {
        // Only owner (this contract) can set server operator
        address newOp = address(0xBEEF);

        // Non-owner cannot set server operator
        vm.prank(PLAYER);
        vm.expectRevert();
        aviator.setServerOperator(newOp);

        // Owner sets it and we verify
        aviator.setServerOperator(newOp);
        assertEq(aviator.serverOperator(), newOp);

        // Fund house
        aviator.fundHouse(BET_AMOUNT);

        // Withdraw profits
        uint256 before = usdc.balanceOf(address(this));
        aviator.withdrawHouseProfits(BET_AMOUNT);
        assertEq(usdc.balanceOf(address(this)), before + BET_AMOUNT);
        assertEq(usdc.balanceOf(address(aviator)), 0);
    }

    function test_PausePreventsActions() public {
        vm.prank(PLAYER);
        aviator.deposit(BET_AMOUNT * 2);

        aviator.pause();

        vm.expectRevert();
        aviator.placeBetFor(1, PLAYER, BET_AMOUNT);

        aviator.unpause();
        // after unpause should work
        aviator.placeBetFor(1, PLAYER, BET_AMOUNT);
    }

    function test_TransferFailuresRevert() public {
        // Deploy failing token and new Aviator Proxy with it
        FailingERC20 failToken = new FailingERC20();
        AviatorGame badImpl = new AviatorGame();
        bytes memory badInit = abi.encodeCall(
            AviatorGame.initialize,
            (address(failToken), address(this))
        );
        ERC1967Proxy badProxy = new ERC1967Proxy(address(badImpl), badInit);
        AviatorGame bad = AviatorGame(payable(address(badProxy)));

        // Attempt to deposit should revert because transferFrom returns false

        vm.prank(PLAYER);
        vm.expectRevert(
            abi.encodeWithSelector(AviatorGame.TransferFailed.selector)
        );
        bad.deposit(BET_AMOUNT);
    }

    function test_SnapshotOnlyServerOperator() public {
        uint256 rid = 1;
        bytes32 playersMerkleRoot = keccak256(abi.encodePacked("leaf"));
        bytes32 snapshotHash = keccak256("hash");

        vm.prank(PLAYER);
        vm.expectRevert(
            abi.encodeWithSelector(AviatorGame.Unauthorized.selector)
        );
        aviator.snapshotRound(rid, snapshotHash, playersMerkleRoot, 0, 0, 1);
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
        emit AviatorGame.RoundSnapshot(
            rid,
            snapshotHash,
            playersMerkleRoot,
            totalBets,
            totalPayouts,
            numPlayers
        );

        aviator.snapshotRound(
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
        ) = aviator.roundSnapshots(rid);
        assertEq(storedHash, snapshotHash);
        assertEq(storedMerkle, playersMerkleRoot);
        assertEq(storedBets, totalBets);
        assertEq(storedPayouts, totalPayouts);
        assertEq(storedNum, numPlayers);
    }

    function test_ReceiveETH() public {
        vm.deal(PLAYER, 1 ether);
        vm.prank(PLAYER);
        (bool success, ) = address(aviator).call{value: 0.5 ether}("");
        require(success, "Send failed");
        assertEq(address(aviator).balance, 0.5 ether);
    }

    function test_WithdrawETH() public {
        vm.deal(address(aviator), 1 ether);
        uint256 preBalance = address(this).balance;

        aviator.withdrawEth(payable(address(this)), 0.4 ether);

        assertEq(address(aviator).balance, 0.6 ether);
        assertEq(address(this).balance, preBalance + 0.4 ether);
    }

    function test_WithdrawETHFailures() public {
        // 1. Insufficient balance
        vm.expectRevert(AviatorGame.InsufficientBalance.selector);
        aviator.withdrawEth(payable(address(this)), 1 ether); // Balance 0

        // 2. Transfer fail (mocking logic requires a contract that rejects ETH?
        //    Calls to EOA always succeed unless out of gas.
        //    Calls to contract fail if no receive/fallback or revert.)

        // Fund aviator first
        vm.deal(address(aviator), 1 ether);

        // Create a contract that reverts on receive
        RejectETH rejector = new RejectETH();

        vm.expectRevert(AviatorGame.ETHTransferFailed.selector);
        aviator.withdrawEth(payable(address(rejector)), 0.5 ether);
    }

    // ============ New Comprehensive Tests ============

    function test_MultiplePlayersBetting() public {
        uint256 roundId = 999;
        uint256 bet1 = 100e6;
        uint256 bet2 = 200e6;

        vm.prank(PLAYER);
        aviator.deposit(bet1);

        vm.prank(PLAYER2);
        aviator.deposit(bet2);

        // Player 1 places bet
        aviator.placeBetFor(roundId, PLAYER, bet1);

        // Player 2 places bet
        aviator.placeBetFor(roundId, PLAYER2, bet2);

        // House balance should reflect both (since balances are now 0)
        assertEq(usdc.balanceOf(address(aviator)), bet1 + bet2);
        assertEq(aviator.totalPlayerBalances(), 0);

        // Wallet Balances updated
        assertEq(usdc.balanceOf(PLAYER), 1000e6 - bet1);
        assertEq(usdc.balanceOf(PLAYER2), 1000e6 - bet2);
    }

    function test_DepositAndWithdraw() public {
        uint256 amount = 50e6;
        
        vm.prank(PLAYER);
        aviator.deposit(amount);
        assertEq(aviator.playerBalances(PLAYER), amount);
        assertEq(aviator.totalPlayerBalances(), amount);
        assertEq(usdc.balanceOf(PLAYER), 1000e6 - amount);

        vm.prank(PLAYER);
        aviator.withdraw(amount);
        assertEq(aviator.playerBalances(PLAYER), 0);
        assertEq(aviator.totalPlayerBalances(), 0);
        assertEq(usdc.balanceOf(PLAYER), 1000e6);
    }

    function test_InitializationProtection() public {
        vm.expectRevert(); // Initializable: contract is already initialized
        aviator.initialize(address(usdc), PLAYER);
    }

    function test_OnlyOwnerCanFundHouse() public {
        vm.prank(PLAYER); // Not owner
        vm.expectRevert();
        aviator.fundHouse(BET_AMOUNT);
    }

    function test_OnlyOwnerCanPauseUnpause() public {
        vm.prank(PLAYER);
        vm.expectRevert();
        aviator.pause();

        vm.prank(PLAYER);
        vm.expectRevert();
        aviator.unpause();
    }

    function test_OnlyServerOperatorCanCallGameFunctions() public {
        uint256 roundId = 1;

        // Try to place bet as non-operator (e.g. Player trying to cheat and place bet directly?)
        // Wait, placeBetFor is `onlyServerOperator`.
        // The Player calls `placeBetFor`? No, the BACKEND calls `placeBetFor`.
        // If a user calls it directly, they revert `Unauthorized`.

        vm.prank(PLAYER);
        vm.expectRevert(
            abi.encodeWithSelector(AviatorGame.Unauthorized.selector)
        );
        aviator.placeBetFor(roundId, PLAYER, BET_AMOUNT);

        // Try to cash out as non-operator
        vm.prank(PLAYER);
        vm.expectRevert(
            abi.encodeWithSelector(AviatorGame.Unauthorized.selector)
        );
        aviator.cashOutFor(roundId, PLAYER, BET_AMOUNT, 200);
    }
}
