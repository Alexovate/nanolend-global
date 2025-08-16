# USDC Offramp Mini-App - ETH Global NYC 2025

## 🎯 Executive Summary

**Product**: CCTP-Powered USDC Offramp Mini-App for Philippines Merchants  
**Team**: Alexander Schmitt (@alexovate)  
**Hackathon**: ETH Global NYC 2025

### 🚀 What We're Building

A mini-app that enables Philippines merchants to bridge their accumulated USDC from World Chain to Ethereum via Circle CCTP, then cash out to GCash pesos using existing infrastructure. Solves the "I have USDC but need local currency" problem for merchant partners.

### ⚡ Core Innovation

- **CCTP Bridge Integration**: Native USDC transfer from World Chain to Ethereum
- **GCash Cash-Out Pipeline**: Leverage existing USDC → PHP conversion infrastructure
- **Merchant-Focused UX**: Simple, one-click bridge for accumulated USDC balances
- **Real-World Utility**: Solve actual merchant pain point with proven technology

---

## 🏆 Prize Strategy

### **🥇 Circle CCTP Excellence**

**Focus**: Demonstrate CCTP V2 real-world utility for emerging market cash-out

**Innovation**: First merchant-focused CCTP offramp for Philippines GCash integration

- **Native USDC Bridging**: Pure Circle technology, no wrapped tokens or liquidity pools
- **Real Merchant Problem**: Solve actual cash-flow issues for Philippines businesses
- **Existing Infrastructure**: Leverage proven Ethereum USDC → GCash pathways
- **15-minute Settlement**: Fast bridge time for merchant liquidity needs

---

## 🏗️ Technical Architecture

### **Core Smart Contract: USDCOfframpBridge.sol**

```solidity
contract USDCOfframpBridge {
    // Core components
    IERC20 public immutable usdc;
    ITokenMessenger public immutable tokenMessenger;
    uint32 public constant ETHEREUM_DOMAIN = 0;
    uint256 public serviceFeeUSDC = 0; // Zero fees for hackathon demo

    // Merchant tracking
    struct MerchantProfile {
        string businessName;
        string gcashNumber;
        uint256 totalBridged;
        bool isActive;
    }

    // Core functionality
    function registerMerchant(string calldata businessName, string calldata gcashNumber) external;
    function bridgeToEthereum(uint256 amount, address ethereumRecipient) external;
    function getMerchantProfile(address merchant) external view returns (MerchantProfile memory);
}
```

**Key Features:**

- **CCTP Integration**: Direct Circle TokenMessenger integration
- **Merchant Profiles**: Track business info and GCash numbers
- **Zero Fees**: No service fees for hackathon demonstration
- **Transaction History**: Complete bridge tracking with status
- **Emergency Controls**: Pause, withdraw, and admin functions

---

## 📱 Mini-App User Experience

### **Core User Flow**

1. **Merchant Registration**: Business name + GCash number + Ethereum address
2. **Balance Dashboard**: View World Chain USDC accumulated from loan repayments
3. **Bridge Setup**: Select amount and confirm Ethereum destination
4. **Transaction Tracking**: Monitor 15-minute CCTP bridge progress
5. **Cash-Out Guide**: Instructions for Ethereum USDC → GCash conversion

### **Key Interface Features**

- **Balance Overview**: Real-time World Chain and Ethereum USDC balances
- **Bridge Calculator**: Preview amount and transaction details
- **Progress Tracking**: Live CCTP status with Circle explorer links
- **Transaction History**: Complete record of all bridge operations
- **GCash Integration**: Step-by-step cash-out instructions for Philippines users

---

_Built with ❤️ by Alexander Schmitt (@alexovate) for ETH Global NYC 2025_  
_Solving Real Merchant Problems with Circle CCTP Technology_  
_First Mini-App for Philippines USDC → GCash Bridge Integration_
