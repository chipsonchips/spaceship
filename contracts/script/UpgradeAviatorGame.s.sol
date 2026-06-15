// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {SpaceshipGame} from "../src/SpaceshipGame.sol";
import {console} from "forge-std/console.sol";

contract UpgradeSpaceshipGameScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = vm.envAddress("SPACESHIP_PROXY_ADDRESS");

        require(proxyAddress != address(0), "SPACESHIP_PROXY_ADDRESS not set");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy New Implementation
        SpaceshipGame newImplementation = new SpaceshipGame();
        console.log(
            "New Implementation deployed at:",
            address(newImplementation)
        );

        // 2. Upgrade Proxy
        // call upgradeToAndCall with empty data to perform the upgrade
        SpaceshipGame(payable(proxyAddress)).upgradeToAndCall(
            address(newImplementation),
            ""
        );
        console.log("Proxy upgraded to new implementation");

        vm.stopBroadcast();
    }
}
