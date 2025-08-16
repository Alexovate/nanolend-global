// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {Script, console} from "forge-std/Script.sol";
import {CrossChainBNPL} from "../src/CrossChainBNPL.sol";

/**
 * @title DeployCrossChainBNPL
 * @notice Deployment script for CrossChainBNPL contract across multiple chains
 */
contract DeployCrossChainBNPL is Script {
    
    // Contract addresses per chain
    struct ChainConfig {
        address usdc;
        address tokenMessenger;
        string name;
    }
    
    // Chain configurations
    mapping(uint256 => ChainConfig) public configs;
    
    function setUp() public {
        // World Chain configuration
        configs[480] = ChainConfig({
            usdc: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            tokenMessenger: address(0), // Need to find actual address
            name: "World Chain"
        });
        
        // Base configuration
        configs[8453] = ChainConfig({
            usdc: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            tokenMessenger: 0x1682Ae6375C4E4A97e4B583BC394c861A46D8962,
            name: "Base"
        });
        
        // Arbitrum configuration  
        configs[42161] = ChainConfig({
            usdc: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            tokenMessenger: 0x19330d10D9Cc8751218eaf51E8885D058642E08A,
            name: "Arbitrum"
        });
    }
    
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying CrossChainBNPL...");
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);
        
        ChainConfig memory config = configs[block.chainid];
        require(config.usdc != address(0), "Chain not configured");
        
        console.log("Chain:", config.name);
        console.log("USDC:", config.usdc);
        console.log("TokenMessenger:", config.tokenMessenger);
        
        vm.startBroadcast(deployerPrivateKey);
        
        CrossChainBNPL bnpl = new CrossChainBNPL(
            deployer, // owner
            config.usdc,
            config.tokenMessenger
        );
        
        vm.stopBroadcast();
        
        console.log("CrossChainBNPL deployed at:", address(bnpl));
        
        // Verify deployment
        console.log("Owner:", bnpl.owner());
        console.log("USDC:", address(bnpl.usdc()));
        console.log("TokenMessenger:", address(bnpl.tokenMessenger()));
        console.log("Initial credit limit:", bnpl.initialCreditLimit());
    }
    
    function deployWorldChain() public {
        // Specific deployment for World Chain
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy on World Chain (main deployment)
        CrossChainBNPL bnpl = new CrossChainBNPL(
            deployer,
            0x79A02482A880bCE3F13e09Da970dC34db4CD24d1, // USDC on World Chain
            address(0) // TokenMessenger - need to find actual address
        );
        
        vm.stopBroadcast();
        
        console.log("CrossChainBNPL deployed on World Chain at:", address(bnpl));
    }
}
