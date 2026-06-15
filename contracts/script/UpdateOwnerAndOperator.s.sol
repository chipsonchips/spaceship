// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {SpaceshipGame} from "../src/SpaceshipGame.sol";
import {console} from "forge-std/console.sol";

contract UpdateOwnerAndOperatorScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address proxyAddress = vm.envAddress("SPACESHIP_PROXY_ADDRESS");
        address newOwnerAndOperator = 0x3E192d109d1dd323375Ac1Ed040f817918E82d63;

        require(proxyAddress != address(0), "SPACESHIP_PROXY_ADDRESS not set");

        vm.startBroadcast(deployerPrivateKey);

        SpaceshipGame spaceshipGame = SpaceshipGame(payable(proxyAddress));

        // 1. Update server operator
        console.log("Updating server operator to:", newOwnerAndOperator);
        spaceshipGame.setServerOperator(newOwnerAndOperator);
        console.log("Server operator updated");

        // 2. Transfer ownership
        console.log("Transferring ownership to:", newOwnerAndOperator);
        spaceshipGame.transferOwnership(newOwnerAndOperator);
        console.log("Ownership transferred");

        vm.stopBroadcast();

        console.log("Owner and Server Operator updated successfully");
        console.log("New Owner:", newOwnerAndOperator);
        console.log("New Server Operator:", newOwnerAndOperator);
    }
}
