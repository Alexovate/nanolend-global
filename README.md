# NanoLend Global - Cross-Chain BNPL with CCTP V2

**ETH Global NYC 2025 Hackathon Project**

The world's first BNPL (Buy Now, Pay Later) platform with native Circle CCTP V2 cross-chain settlement. Built for the World App ecosystem with gasless UX and instant merchant settlements across multiple chains.

## 🎯 Core Innovation

- **Dynamic Chain Selection**: Merchants choose settlement chain per transaction
- **Circle CCTP V2 Integration**: Native cross-chain USDC transfers with 30-second settlement
- **Dual-Stablecoin Support**: USDC and PYUSD merchant preferences
- **Gasless UX**: Circle Paymaster covers all transaction costs
- **World ID Verification**: Sybil-resistant identity for financial inclusion

## 🏗️ Architecture

```
World Chain (Primary)
├── Loan origination & credit scoring
├── World ID verification
└── CCTP V2 bridges to settlement chains

Settlement Options (Merchant Choice)
├── World Chain: Direct USDC transfer
├── Base: CCTP settlement (Circle's main chain)
└── Arbitrum: CCTP settlement (PayPal PYUSD focus)
```

## 🚀 Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js 18+ (for frontend)

### Installation

```bash
# Clone and setup
git clone <repo>
cd nanolend-global

# Install Foundry dependencies
forge install

# Run tests
forge test

# Deploy to World Chain
forge script script/DeployCrossChainBNPL.s.sol:DeployCrossChainBNPL --rpc-url $WORLD_CHAIN_RPC_URL --broadcast
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Add your configuration
PRIVATE_KEY=your_private_key
WORLD_CHAIN_RPC_URL=your_rpc_url
# ... etc
```

## 📋 Smart Contract

### Core Contract: `CrossChainBNPL.sol`

**Key Functions:**

- `requestLoan()` - Request loan with dynamic chain selection
- `repayLoan()` - Repay loans with progressive credit building
- `registerMerchant()` - Admin function to onboard merchants

**CCTP Integration:**

- Automatic routing based on merchant preferences
- Native USDC burning/minting via Circle's protocol
- Gas optimization for cross-chain settlements

### Testing

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match-test testRequestLoanCCTPBase

# Gas usage analysis
forge test --gas-report
```

## 🎮 Demo Usage

### 1. Basic Loan Flow (World Chain)

```solidity
// Direct settlement on World Chain
bnpl.requestLoan(
    merchantAddress,
    5000000, // $5 USDC (6 decimals)
    "world-id-nullifier",
    0, // WORLD_CHAIN_DOMAIN
    merchantAddress
);
```

### 2. Cross-Chain Settlement (CCTP)

```solidity
// Settlement on Base via CCTP
bnpl.requestLoan(
    merchantAddress,
    5000000, // $5 USDC
    "world-id-nullifier",
    2, // BASE_DOMAIN
    merchantBaseAddress // Where merchant wants USDC on Base
);
```

### 3. Loan Repayment

```solidity
// Repay loan (updates credit score)
bnpl.repayLoan(loanId, repaymentAmount);
```

## 🔗 Contract Addresses

### World Chain (Primary)

- **CrossChainBNPL**: `TBD`
- **USDC**: `0x79A02482A880bCE3F13e09Da970dC34db4CD24d1`
- **TokenMessenger**: `TBD`

### Base (Settlement)

- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **TokenMessenger**: `0x1682Ae6375C4E4A97e4B583BC394c861A46D8962`

### Arbitrum (Settlement)

- **USDC**: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- **TokenMessenger**: `0x19330d10D9Cc8751218eaf51E8885D058642E08A`

## 🏆 Hackathon Strategy

### Prize Tracks

- **Circle**: Production CCTP V2 integration with gasless UX
- **Coinbase**: CDP embedded wallets + onramp integration
- **PayPal**: First-ever PYUSD BNPL implementation

### Technical Highlights

- **Clean Architecture**: Extends proven patterns from existing codebase
- **Production Ready**: Comprehensive testing and error handling
- **Demo Excellence**: Reliable cross-chain settlements in <30 seconds
- **Innovation**: Dynamic per-transaction chain selection

## 📊 Key Features

### For Users

- **Instant Onboarding**: Coinbase onramp + embedded wallets
- **Gasless Experience**: All transactions sponsored by Circle Paymaster
- **Progressive Credit**: $5 starting limit with automatic increases
- **Cross-Chain Flexibility**: Borrow on World Chain, spend anywhere

### For Merchants

- **Chain Choice**: Receive USDC on preferred chain per transaction
- **Instant Settlement**: CCTP V2 Fast Transfers in 30 seconds
- **Dual-Token Support**: Accept USDC or PYUSD payments
- **Zero Integration Complexity**: Simple merchant registration

### Technical Innovation

- **CCTP V2 Pioneer**: Among first production implementations
- **Address Flexibility**: Merchants can use different addresses per chain
- **Fallback Safety**: Graceful handling of CCTP failures
- **Gas Optimization**: Minimal overhead for cross-chain operations

## 🛠️ Development

### Project Structure

```
nanolend-global/
├── src/
│   └── CrossChainBNPL.sol          # Main contract
├── test/
│   └── CrossChainBNPL.t.sol        # Comprehensive tests
├── script/
│   └── DeployCrossChainBNPL.s.sol  # Deployment script
└── foundry.toml                     # Foundry configuration
```

### Key Design Decisions

- **Single Contract**: All logic in one contract for simplicity
- **Mock Testing**: Comprehensive mocks for CCTP integration
- **Event-Driven**: Rich events for frontend integration
- **Emergency Controls**: Pause/unpause and emergency withdraw functions

---

**Built with ❤️ for ETH Global NYC 2025**  
**Revolutionizing microfinance through cross-chain innovation! 🚀**
