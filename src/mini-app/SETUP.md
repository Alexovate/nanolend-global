# CCTP Offramp Mini-App Setup

## 🚀 Quick Start

### 1. Environment Configuration

Create `.env.local` file with:

```bash
# Contract Addresses (already deployed on World Chain)
NEXT_PUBLIC_CROSSCHAIN_BNPL_ADDRESS=0x9BCe624858750c1075C2a253cab7204F628F6d0d
NEXT_PUBLIC_USDC_ADDRESS=0x79A02482A880bCE3F13e09Da970dC34db4CD24d1

# World Chain RPC
NEXT_PUBLIC_WORLD_CHAIN_RPC=https://worldchain-mainnet.g.alchemy.com/public

# Circle CCTP Explorer
NEXT_PUBLIC_CIRCLE_EXPLORER_URL=https://iris.circle.com

# World ID (get from World ID Developer Portal)
WORLD_ID_APP_ID=your_world_id_app_id
WORLD_ID_ACTION=your_world_id_action

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_here
```

### 2. Install Dependencies

```bash
cd src/mini-app
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the mini-app.

## 🏗️ Architecture

### Core Components

- **LoanDashboard**: Shows user's BNPL loans and credit status
- **LoanRequest**: Interface to request new USDC loans
- **BridgeInterface**: CCTP bridge for World Chain → Ethereum USDC transfer
- **Auth**: World ID authentication integration

### Smart Contract Integration

The mini-app connects to `CrossChainBNPL.sol` deployed on World Chain:

```typescript
// Main contract functions used:
-requestLoan() - // Request USDC loan with World ID
  bridgeToEthereum() - // Bridge USDC via Circle CCTP
  getUserCredit() - // Get user's credit info
  getUserLoans(); // Get user's loan history
```

## 🌉 CCTP Bridge Flow

1. **User has USDC** from loan repayments on World Chain
2. **Bridge to Ethereum** using Circle CCTP (15 minutes)
3. **Cash out to GCash** via Binance P2P (PHP conversion)

## 🇵🇭 Philippines Cash-Out Guide

### Option 1: Binance P2P (Recommended)

- Sell USDC → Buy PHP
- Direct GCash transfer from P2P buyer
- Fee: ~2-4% total
- Time: ~15 minutes

### Option 2: Local Exchanges

- Use PDAX, Coins.ph
- USDC → Bank transfer → GCash
- Fee: ~3-5% including bank charges
- Time: 1-2 hours

## 🔧 Development

### Wagmi Configuration

The app uses Wagmi v2 for Web3 integration:

```typescript
// Chain configuration
const worldChain = {
  id: 480,
  name: "World Chain",
  network: "worldchain",
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_WORLD_CHAIN_RPC] },
  },
};
```

### Component Structure

```
src/
├── components/
│   ├── LoanDashboard.tsx     # Credit overview
│   ├── LoanRequest.tsx       # Loan request form
│   ├── BridgeInterface.tsx   # CCTP bridge UI
│   └── ...
├── abi/
│   └── CrossChainBNPL.json   # Contract ABI
└── app/
    ├── page.tsx              # Landing page
    └── (protected)/
        └── home/page.tsx     # Main dashboard
```

## 🎯 Hackathon Demo Flow

1. **Landing**: Show value proposition (USDC → Ethereum → GCash)
2. **Authentication**: World ID verification
3. **Dashboard**: View loans and USDC balance
4. **Request Loan**: Get instant USDC with World ID
5. **Bridge**: Use CCTP to bridge USDC to Ethereum
6. **Cash-out Guide**: Instructions for GCash conversion

## 🏆 Prize Strategy

This mini-app demonstrates:

- **Circle CCTP Excellence**: Native USDC bridging for real-world utility
- **World ID Integration**: Sybil-resistant loan verification
- **Real Problem Solving**: Merchant cash-out in emerging markets
- **Mobile-First UX**: World App compatible interface
- **Production Quality**: Full error handling and transaction tracking

Perfect for winning Circle and World ID prizes at ETH Global NYC! 🚀
