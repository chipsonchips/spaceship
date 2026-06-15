// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {SpaceshipGame} from "../src/SpaceshipGame.sol";
import {console} from "forge-std/console.sol";

import {
    ERC1967Proxy
} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract SpaceshipScript is Script {
    function run() external {
        // Load the private key from the environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address usdcTokenAddress = vm.envAddress("USDC_ADDRESS");

        // Ensure USDC token address is provided
        require(usdcTokenAddress != address(0), "USDC_ADDRESS not set");

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy implementation
        SpaceshipGame implementation = new SpaceshipGame();

        // Encode initializer
        bytes memory initData = abi.encodeWithSelector(
            SpaceshipGame.initialize.selector,
            usdcTokenAddress,
            vm.addr(deployerPrivateKey)
        );

        // Deploy proxy
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        SpaceshipGame spaceship = SpaceshipGame(payable(address(proxy)));

        console.log("SpaceshipGame Proxy deployed to:", address(spaceship));

        vm.stopBroadcast();
    }
}
