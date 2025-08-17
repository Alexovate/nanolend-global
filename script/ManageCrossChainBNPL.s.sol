// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {Script, console} from "forge-std/Script.sol";
import {CrossChainBNPL} from "../src/CrossChainBNPL.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/**
 * @title ManageCrossChainBNPL
 * @notice Comprehensive management script for CrossChainBNPL operations
 * @dev Handles deployment, funding, merchant registration, and emergency operations
 */
contract ManageCrossChainBNPL is Script {
    
    // Contract instances
    CrossChainBNPL public bnpl;
    IERC20 public usdc;
    
    // Configuration from environment
    address public admin;
    address public contractAddress;
    address public usdcAddress;
    address public tokenMessengerAddress;
    uint256 public fundAmount;
    
    // Chain configurations
    struct ChainConfig {
        uint256 chainId;
        address usdc;
        address tokenMessenger;
        string name;
    }
    
    mapping(uint256 => ChainConfig) public chains;
    
    modifier loadConfig() {
        admin = vm.envAddress("ADMIN_ADDRESS");
        
        // Load contract address if deploying to existing
        try vm.envAddress("CROSSCHAIN_BNPL_WORLD_CHAIN") returns (address addr) {
            contractAddress = addr;
        } catch {
            contractAddress = address(0);
        }
        
        // Load funding amount
        try vm.envString("FUND_AMOUNT") returns (string memory amountStr) {
            fundAmount = parseUsdcAmount(amountStr);
        } catch {
            fundAmount = 50_000_000; // 50 USDC default
        }
        
        // Setup chain configurations
        setupChains();
        _;
    }
    
    function setupChains() internal {
        // World Chain
        chains[480] = ChainConfig({
            chainId: 480,
            usdc: vm.envAddress("WORLD_CHAIN_USDC"),
            tokenMessenger: vm.envOr("WORLD_CHAIN_TOKEN_MESSENGER", address(0)),
            name: "World Chain"
        });
        
        // Base
        chains[8453] = ChainConfig({
            chainId: 8453,
            usdc: vm.envAddress("BASE_USDC"),
            tokenMessenger: vm.envAddress("BASE_TOKEN_MESSENGER"),
            name: "Base"
        });
        
        // Arbitrum
        chains[42161] = ChainConfig({
            chainId: 42161,
            usdc: vm.envAddress("ARBITRUM_USDC"),
            tokenMessenger: vm.envAddress("ARBITRUM_TOKEN_MESSENGER"),
            name: "Arbitrum"
        });
    }
    
    // ==================== DEPLOYMENT ====================
    
    function deploy() external loadConfig {
        console.log("=== Deploy CrossChainBNPL ===");
        console.log("Chain ID:", block.chainid);
        console.log("Admin:", admin);
        
        ChainConfig memory config = chains[block.chainid];
        require(config.usdc != address(0), "Chain not configured");
        
        console.log("Chain:", config.name);
        console.log("USDC:", config.usdc);
        console.log("TokenMessenger:", config.tokenMessenger);
        
        vm.startBroadcast(admin);
        
        bnpl = new CrossChainBNPL(
            admin,
            config.usdc,
            config.tokenMessenger
        );
        
        vm.stopBroadcast();
        
        console.log("CrossChainBNPL deployed at:", address(bnpl));
        console.log("Update your .env file with:");
        console.log("CROSSCHAIN_BNPL_%s=%s", config.name, address(bnpl));
    }
    
    // ==================== FUNDING ====================
    
    function fund() external loadConfig {
        console.log("=== Fund CrossChainBNPL Contract ===");
        
        require(contractAddress != address(0), "Contract address not set");
        
        bnpl = CrossChainBNPL(contractAddress);
        usdc = IERC20(address(bnpl.usdc()));
        
        uint256 contractBalance = usdc.balanceOf(contractAddress);
        uint256 adminBalance = usdc.balanceOf(admin);
        
        console.log("Contract address:", contractAddress);
        console.log("Current contract USDC balance:", contractBalance / 1e6, "USDC");
        console.log("Admin USDC balance:", adminBalance / 1e6, "USDC");
        console.log("Funding amount:", fundAmount / 1e6, "USDC");
        
        require(adminBalance >= fundAmount, "Insufficient USDC balance");
        
        vm.startBroadcast(admin);
        
        usdc.approve(contractAddress, fundAmount);
        bnpl.fundContract(fundAmount);
        
        vm.stopBroadcast();
        
        uint256 finalBalance = usdc.balanceOf(contractAddress);
        console.log("Final contract USDC balance:", finalBalance / 1e6, "USDC");
        console.log("Successfully funded contract!");
    }
    
    // ==================== MERCHANT MANAGEMENT ====================
    
    function registerMerchant(address merchantAddress, string memory name) external loadConfig {
        console.log("=== Register Merchant ===");
        console.log("Merchant:", merchantAddress);
        console.log("Name:", name);
        
        require(contractAddress != address(0), "Contract address not set");
        bnpl = CrossChainBNPL(contractAddress);
        
        vm.startBroadcast(admin);
        bnpl.registerMerchant(merchantAddress, name, "Manila, Philippines", "+639171234567");
        vm.stopBroadcast();
        
        console.log("Merchant registered successfully!");
    }
    
    function batchRegisterMerchants() external loadConfig {
        console.log("=== Batch Register Demo Merchants ===");
        
        require(contractAddress != address(0), "Contract address not set");
        bnpl = CrossChainBNPL(contractAddress);
        
        // Demo merchants for hackathon
        address[] memory merchants = new address[](3);
        string[] memory names = new string[](3);
        
        merchants[0] = 0x742D35cc6634C0532925a3b8D0C9cDe4E0F82B2d; // Example addresses
        merchants[1] = 0x8ba1F109551BD432803012645AAC136C14f76cca;
        merchants[2] = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;
        
        names[0] = "Crypto Coffee Shop";
        names[1] = "DeFi Electronics Store";
        names[2] = "Web3 Grocery Market";
        
        vm.startBroadcast(admin);
        
        for (uint256 i = 0; i < merchants.length; i++) {
            bnpl.registerMerchant(merchants[i], names[i], "Manila, Philippines", "+639171234567");
            console.log("Registered:", names[i], "at", merchants[i]);
        }
        
        vm.stopBroadcast();
        
        console.log("Batch merchant registration completed!");
    }
    
    function getMerchantProfile(address merchantAddress) external loadConfig {
        console.log("=== Get Merchant Profile ===");
        console.log("Merchant address:", merchantAddress);
        
        require(contractAddress != address(0), "Contract address not set");
        bnpl = CrossChainBNPL(contractAddress);
        
        try bnpl.getMerchantProfile(merchantAddress) returns (CrossChainBNPL.Merchant memory merchant) {
            if (!merchant.isActive && bytes(merchant.name).length == 0) {
                console.log("Merchant not found or not registered");
            } else {
                console.log("=== Merchant Found ===");
                console.log("Active:", merchant.isActive);
                console.log("Name:", merchant.name);
                console.log("Location:", merchant.location);
                console.log("Contact:", merchant.gcashNumber);
                console.log("Outstanding loans:", merchant.outstandingLoans / 1e6, "USDC");
                console.log("Total repaid:", merchant.totalRepaid / 1e6, "USDC");
                console.log("Total bridged:", merchant.totalBridged / 1e6, "USDC");
                console.log("Bridge count:", merchant.bridgeCount);
                console.log("Registered at:", merchant.registeredAt);
            }
        } catch {
            console.log("Error reading merchant data");
        }
    }
    
    function listMerchants() external loadConfig {
        console.log("=== List All Registered Merchants ===");
        
        require(contractAddress != address(0), "Contract address not set");
        bnpl = CrossChainBNPL(contractAddress);
        
        // Get MerchantRegistered events from the beginning
        vm.startPrank(admin);
        
        // We'll need to check merchant registration events
        console.log("Searching for MerchantRegistered events...");
        console.log("Note: This function shows how to query. Use getMerchantProfile() for specific merchants.");
        console.log("Contract address:", contractAddress);
        console.log("Current block:", block.number);
        
        vm.stopPrank();
    }
    
    // ==================== EMERGENCY OPERATIONS ====================
    
    function emergencyWithdraw() external loadConfig {
        console.log("=== Emergency Withdraw ===");
        
        require(contractAddress != address(0), "Contract address not set");
        bnpl = CrossChainBNPL(contractAddress);
        usdc = IERC20(address(bnpl.usdc()));
        
        uint256 contractBalance = usdc.balanceOf(contractAddress);
        console.log("Current contract balance:", contractBalance / 1e6, "USDC");
        
        vm.startBroadcast(admin);
        bnpl.emergencyWithdraw();
        vm.stopBroadcast();
        
        uint256 finalBalance = usdc.balanceOf(contractAddress);
        uint256 adminBalance = usdc.balanceOf(admin);
        
        console.log("Final contract balance:", finalBalance / 1e6, "USDC");
        console.log("Admin balance after withdrawal:", adminBalance / 1e6, "USDC");
        console.log("Emergency withdrawal completed!");
    }
    
    function pause() external loadConfig {
        console.log("=== Pause Contract ===");
        
        require(contractAddress != address(0), "Contract address not set");
        bnpl = CrossChainBNPL(contractAddress);
        
        vm.startBroadcast(admin);
        bnpl.emergencyPause();
        vm.stopBroadcast();
        
        console.log("Contract paused!");
    }
    
    function unpause() external loadConfig {
        console.log("=== Unpause Contract ===");
        
        require(contractAddress != address(0), "Contract address not set");
        bnpl = CrossChainBNPL(contractAddress);
        
        vm.startBroadcast(admin);
        bnpl.emergencyUnpause();
        vm.stopBroadcast();
        
        console.log("Contract unpaused!");
    }
    
    // ==================== INFORMATION ====================
    
    function status() external loadConfig {
        console.log("=== Contract Status ===");
        
        if (contractAddress == address(0)) {
            console.log("Contract not deployed yet");
            return;
        }
        
        bnpl = CrossChainBNPL(contractAddress);
        usdc = IERC20(address(bnpl.usdc()));
        
        console.log("Contract address:", contractAddress);
        console.log("Owner:", bnpl.owner());
        console.log("Paused:", bnpl.paused());
        console.log("Next loan ID:", bnpl.nextLoanId());
        
        console.log("USDC address:", address(bnpl.usdc()));
        console.log("TokenMessenger:", address(bnpl.tokenMessenger()));
        
        uint256 contractBalance = usdc.balanceOf(contractAddress);
        console.log("Contract USDC balance:", contractBalance / 1e6, "USDC");
        
        console.log("Credit limits:");
        console.log("  Initial:", bnpl.initialCreditLimit() / 1e6, "USDC");
        console.log("  Min loan:", bnpl.minLoanAmount() / 1e6, "USDC");
        console.log("  Max loan:", bnpl.maxLoanAmount() / 1e6, "USDC");
        
        console.log("CCTP domains:");
        console.log("  World Chain:", bnpl.WORLD_CHAIN_DOMAIN());
        console.log("  Base:", bnpl.BASE_DOMAIN());
        console.log("  Arbitrum:", bnpl.ARBITRUM_DOMAIN());
    }
    
    // ==================== UTILITIES ====================
    
    function parseUsdcAmount(string memory amountStr) internal pure returns (uint256) {
        bytes memory amountBytes = bytes(amountStr);
        uint256 result = 0;
        uint256 decimals = 0;
        bool foundDecimal = false;
        
        for (uint256 i = 0; i < amountBytes.length; i++) {
            bytes1 char = amountBytes[i];
            
            if (char == '.') {
                foundDecimal = true;
                continue;
            }
            
            if (char >= '0' && char <= '9') {
                uint256 digit = uint256(uint8(char)) - 48;
                result = result * 10 + digit;
                
                if (foundDecimal) {
                    decimals++;
                }
            }
        }
        
        // Convert to USDC base units (6 decimals)
        if (decimals > 6) {
            for (uint256 i = 0; i < decimals - 6; i++) {
                result = result / 10;
            }
            decimals = 6;
        }
        
        for (uint256 i = decimals; i < 6; i++) {
            result = result * 10;
        }
        
        return result;
    }
}
