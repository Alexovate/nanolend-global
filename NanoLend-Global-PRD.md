# NanoLend Global - ETH Global NYC 2025

## 🎯 Executive Summary

**Product**: Cross-Chain BNPL with Dual-Stablecoin Support  
**Team**: Alexander Schmitt (@alexovate)  
**Hackathon**: ETH Global NYC 2025  
**Timeline**: 48 hours

### 🚀 What We're Building

The world's first cross-chain, dual-stablecoin microfinance platform that combines World ID verification with gasless transactions, enabling financial inclusion for underbanked populations globally.

### ⚡ Core Innovation

- **Cross-Chain Settlement**: Borrow on World Chain, settle on Base/Arbitrum
- **Dual-Stablecoin Choice**: USDC or PYUSD based on merchant preference
- **Gasless UX**: Circle Paymaster covers all transaction costs
- **Instant Onramp**: PHP → USDC via Coinbase in <2 minutes

---

## 🏗️ Technical Architecture

### Core Innovation Stack

**Smart Contracts**: Solidity with progressive credit scoring and World ID integration  
**Frontend**: Next.js mobile-first application with embedded wallet support  
**Identity**: World ID for sybil-resistant verification  
**Cross-Chain**: Circle CCTP V2 for seamless multi-chain settlement

### Partner Technology Integration

#### 🎯 Circle Integration

- **CCTP V2**: Cross-chain USDC settlement (World Chain ↔ Base/Arbitrum)
- **Paymaster**: Gasless transactions for all users
- **Multi-chain**: Deploy existing contract on Base + Arbitrum

#### 🎯 Coinbase CDP Integration

- **Onramp**: PHP → USDC conversion for Filipino users
- **Embedded Wallets**: Replace current wallet system
- **Data APIs**: Transaction history and balance tracking

#### 🎯 PayPal USD Integration

- **PYUSD Support**: Add as second stablecoin option
- **Merchant Choice**: USDC or PYUSD settlement preference
- **Dual-Token UI**: Seamless switching between stablecoins

---

## 📱 User Experience

### Core Flow

1. **Instant Onboarding**

   - World ID verification
   - Coinbase onramp: PHP → USDC
   - CDP embedded wallet creation

2. **Cross-Chain Borrowing**

   - Request loan on World Chain
   - Choose USDC or PYUSD
   - Gasless approval via Circle Paymaster
   - Cross-chain settlement to merchant

3. **Flexible Repayment**
   - Pay on any supported chain
   - Automatic credit score updates
   - Progressive limit increases ($2→$5)

### Multi-Chain Architecture

```
World Chain (Primary)
├── User verification & credit scoring
├── Loan origination
└── CCTP bridge to settlement chains

Base/Arbitrum (Settlement)
├── Merchant payment settlement
├── USDC/PYUSD distribution
└── Lower gas costs
```

---

## 🎯 Demo Features

### Core Demos for Judges

1. **Cross-Chain Settlement Demo**

   - Borrow USDC on World Chain → Auto-settle on Base
   - Show CCTP bridge in action
   - 30-second end-to-end flow

2. **Dual-Stablecoin Demo**

   - User chooses PYUSD over USDC
   - Merchant receives preferred token
   - Seamless UI experience

3. **Gasless Experience Demo**

   - Zero gas fees for borrower
   - Circle Paymaster sponsorship
   - Compare with traditional DeFi costs

4. **Onramp Integration Demo**

   - PHP → USDC conversion
   - Embedded wallet creation
   - <2 minute onboarding

5. **Credit Progression Demo**
   - $2 → $5 limit increases
   - Real repayment history
   - Financial inclusion impact

---

---

## ✅ Definition of Done

### Technical Demonstrations

- [ ] **Cross-Chain Flow**: Complete loan origination on World Chain with settlement on Base/Arbitrum
- [ ] **Gasless Experience**: End-to-end user journey with zero transaction costs
- [ ] **Instant Onboarding**: Fiat-to-crypto conversion integrated into seamless workflow
- [ ] **Dual-Stablecoin System**: Dynamic merchant preference selection between USDC/PYUSD
- [ ] **Mobile Experience**: Full-featured application working on actual mobile devices

### Deliverables

- [ ] **Live Application**: Production-ready deployment with real transaction capabilities
- [ ] **Technical Demo**: Comprehensive video showcasing all system features
- [ ] **Open Source Code**: Complete codebase with documentation and setup instructions
- [ ] **Architecture Documentation**: Technical specifications and integration guides

---

## 🔗 Technical Resources

### Development Stack

- **Smart Contracts**: Foundry framework with Solidity ^0.8.21
- **Frontend**: Next.js 15 with React 18 and TypeScript
- **Blockchain**: Multi-chain deployment (World Chain, Base, Arbitrum)
- **Web3**: Viem and Wagmi for blockchain interactions

### Partner APIs & SDKs

- **Circle**: CCTP V2 documentation and Paymaster integration guides
- **Coinbase**: CDP SDK documentation and Onramp API specifications
- **PayPal**: PYUSD smart contract addresses and integration documentation
- **World**: World ID SDK and World App integration guides

---

**Revolutionizing microfinance through cross-chain innovation and gasless UX! 🚀**
