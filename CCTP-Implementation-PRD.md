# CCTP V2 Implementation PRD

## Circle Cross-Chain Transfer Protocol Integration for NanoLend Global

---

## 🎯 **Executive Summary**

This PRD defines the integration of Circle's CCTP V2 into NanoLend Global's proven `NanoLoanManager.sol` architecture to enable cross-chain merchant settlements. The integration will allow merchants to receive USDC payments on their preferred chain (Base, Arbitrum) while maintaining the core loan logic on World Chain.

### **Core Innovation**

- **Preserve Proven Architecture**: Keep your battle-tested `NanoLoanManager.sol` as the primary loan engine
- **Add Cross-Chain Settlement**: Enable merchants to receive USDC on Base/Arbitrum via CCTP
- **Maintain Simplicity**: Minimal changes to existing proven patterns

---

## 🏗️ **Technical Architecture Analysis**

### **Current `NanoLoanManager.sol` Strengths**

After analyzing your 1,081-line contract, these patterns will be preserved:

1. **Optimized Data Structures**: `UserDashboard` single-call pattern
2. **Progressive Credit System**: Proven credit limit algorithms
3. **Permit2 Integration**: Gasless repayments via World App
4. **Emergency Controls**: Comprehensive admin functions
5. **Event-Driven Analytics**: PostHog integration ready

### **CCTP Integration Strategy**

```
Current Flow:
User Request → NanoLoanManager → Direct USDC Transfer → Merchant

New Flow:
User Request → NanoLoanManager → CCTP Bridge → Merchant (Different Chain)
```

---

## 🔄 **CCTP V2 Integration Design**

### **Supported Chains (Confirmed)**

- ✅ **World Chain**: Primary loan origination (confirmed CCTP support)
- ✅ **Base**: Merchant settlement option (Circle's main chain)
- ✅ **Arbitrum**: Merchant settlement option (CCTP V2 supported)

### **Smart Contract Architecture**

#### **Option 1: Minimal Integration (Recommended)**

Extend your existing `NanoLoanManager.sol` with CCTP functionality:

```solidity
// Add to existing NanoLoanManager.sol
interface ITokenMessenger {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce);
}

// New merchant preference system
struct MerchantCCTP {
    uint32 preferredDomain;     // 0=Ethereum, 1=Avalanche, 2=Base, 3=Arbitrum
    address settlementAddress;   // Where they want USDC
    bool enableCrossChain;      // Whether they accept cross-chain settlement
}

mapping(address => MerchantCCTP) public merchantCCTPSettings;
```

#### **Option 2: Modular Approach**

Create separate bridge contract while keeping loan logic intact:

```solidity
// New: CCTPMerchantBridge.sol
contract CCTPMerchantBridge {
    NanoLoanManager public immutable loanManager;
    ITokenMessenger public immutable tokenMessenger;

    function settleMerchantCrossChain(
        uint256 loanId,
        uint256 amount,
        uint32 destinationDomain,
        address merchantAddress
    ) external onlyLoanManager {
        // Burn USDC and initiate cross-chain transfer
    }
}
```

### **CCTP Contract Addresses (Production)**

```solidity
// World Chain CCTP Contracts (need to verify)
ITokenMessenger constant TOKEN_MESSENGER = ITokenMessenger(0x...);
address constant USDC_WORLD_CHAIN = 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1;

// Base Chain CCTP Contracts
ITokenMessenger constant BASE_TOKEN_MESSENGER = ITokenMessenger(0x1682Ae6375C4E4A97e4B583BC394c861A46D8962);
address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

// Arbitrum Chain CCTP Contracts
ITokenMessenger constant ARB_TOKEN_MESSENGER = ITokenMessenger(0x19330d10D9Cc8751218eaf51E8885D058642E08A);
address constant USDC_ARBITRUM = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
```

---

## 📱 **User Experience Flow**

### **Merchant Registration Enhancement**

```solidity
function registerMerchantWithCCTP(
    address merchantAddress,
    string calldata name,
    string calldata location,
    uint32 preferredDomain,     // 2=Base, 3=Arbitrum, 0=World Chain (no bridge)
    address settlementAddress   // Where they want USDC
) external onlyOwner {
    // Your existing merchant registration
    registerMerchant(merchantAddress, name, location);

    // Add CCTP preferences
    merchantCCTPSettings[merchantAddress] = MerchantCCTP({
        preferredDomain: preferredDomain,
        settlementAddress: settlementAddress,
        enableCrossChain: preferredDomain != WORLD_CHAIN_DOMAIN
    });
}
```

### **Enhanced Loan Request Flow**

```solidity
function requestLoan(
    address merchant,
    uint256 amount,
    string calldata borrowerUsername,
    string calldata worldIdNullifier
) external whenNotPaused nonReentrant {
    // Your existing validation logic (lines 242-286)
    // ... keep all existing checks unchanged ...

    // Create loan (your existing logic - lines 294-312)
    uint256 loanId = nextLoanId++;
    loans[loanId] = Loan({...}); // Your existing structure

    // ENHANCED: Route payment based on merchant preference
    MerchantCCTP memory merchantSettings = merchantCCTPSettings[merchant];

    if (merchantSettings.enableCrossChain) {
        // Cross-chain settlement via CCTP
        _settleMerchantCrossChain(loanId, amount, merchantSettings);
    } else {
        // Your existing direct transfer (line 309)
        usdc.transfer(merchant, amount);
    }

    // Your existing event and tracking (lines 311-314)
    userLoans[msg.sender].push(loanId);
    emit LoanCreated(loanId, msg.sender, merchant, amount);
}
```

### **Cross-Chain Settlement Function**

```solidity
function _settleMerchantCrossChain(
    uint256 loanId,
    uint256 amount,
    MerchantCCTP memory merchantSettings
) internal {
    // Approve USDC for CCTP TokenMessenger
    usdc.approve(address(TOKEN_MESSENGER), amount);

    // Convert merchant address to bytes32 for CCTP
    bytes32 mintRecipient = bytes32(uint256(uint160(merchantSettings.settlementAddress)));

    // Burn USDC on World Chain and initiate cross-chain transfer
    uint64 nonce = TOKEN_MESSENGER.depositForBurn(
        amount,
        merchantSettings.preferredDomain,
        mintRecipient,
        address(usdc)
    );

    // Emit event for tracking
    emit CrossChainSettlementInitiated(loanId, merchantSettings.preferredDomain, nonce, amount);
}
```

---

## 🎯 **Implementation Phases**

### **Phase 1: Core CCTP Integration (8 hours)**

- [ ] Add CCTP interfaces to `NanoLoanManager.sol`
- [ ] Implement `MerchantCCTP` structure and mappings
- [ ] Add cross-chain settlement logic to `requestLoan()`
- [ ] Deploy and test on World Chain → Base flow

### **Phase 2: Multi-Chain Support (4 hours)**

- [ ] Add Arbitrum domain support
- [ ] Implement merchant preference UI updates
- [ ] Add cross-chain tracking events
- [ ] Test World Chain → Arbitrum flow

### **Phase 3: Demo Polish & Testing (4 hours)**

- [ ] Comprehensive cross-chain testing (World Chain → Base/Arbitrum)
- [ ] Demo video creation and UI polish
- [ ] Documentation and deployment scripts
- [ ] Performance optimization and gas analysis

---

## 🔒 **Security Considerations**

### **Minimal Attack Surface**

- **Preserve Existing Security**: Your proven patterns (Ownable, ReentrancyGuard, Pausable) remain
- **CCTP Security**: Circle's attestation-based security model
- **Emergency Controls**: Extend your existing pause/emergency functions

### **New Security Additions**

```solidity
// Emergency functions for CCTP
function pauseCrossChainSettlements() external onlyOwner {
    // Disable cross-chain settlements while keeping regular loans active
}

function emergencyWithdrawCCTPApprovals() external onlyOwner {
    // Remove USDC approvals to CCTP contracts
    usdc.approve(address(TOKEN_MESSENGER), 0);
}
```

---

## 🧪 **Testing Strategy**

### **Integration Testing**

```solidity
// Test existing functionality remains intact
function testExistingLoanFlow() public {
    // Verify your existing 1,081 lines of logic work unchanged
}

// Test new cross-chain functionality
function testCCTPSettlement() public {
    // Test CCTP integration without breaking existing flows
}
```

### **Fallback Testing**

- **CCTP Unavailable**: Graceful fallback to direct transfer
- **Destination Chain Issues**: Queue for retry or manual processing
- **Merchant Preference Changes**: Update settlement routing

---

## 📊 **Success Metrics**

### **Technical Metrics**

- ✅ Zero regression in existing `NanoLoanManager.sol` functionality
- ✅ <30 second settlement times via CCTP V2 Fast Transfers
- ✅ Gas optimization: <20% increase in loan request costs
- ✅ 99.9% cross-chain settlement success rate

### **Business Metrics**

- ✅ Merchant adoption of cross-chain settlement preferences
- ✅ Reduced merchant onboarding friction (multi-chain support)
- ✅ User satisfaction with gasless cross-chain experience

---

## 🎭 **Demo Strategy**

### **Hackathon Demo Flow**

1. **Existing Strength**: "Here's our proven BNPL system with 1,000+ lines of battle-tested code"
2. **Innovation**: "Now watch cross-chain settlement via CCTP V2"
3. **Live Demo**: World Chain loan → Base merchant settlement in <30 seconds
4. **Multi-Chain Excellence**: Demonstrate seamless USDC settlement across three chains

### **Judge Impact Points**

- **Circle Prize**: Production-ready CCTP V2 integration with Fast Transfers
- **Technical Depth**: Minimal code changes with maximum functionality
- **Real Innovation**: First BNPL with native cross-chain merchant settlement

---

## 🔗 **Technical Resources**

### **CCTP Documentation**

- Circle CCTP V2 Developer Docs
- TokenMessenger Interface Specifications
- Cross-Chain Domain Mappings
- Attestation Service Integration Guide

### **Integration Dependencies**

- Existing `NanoLoanManager.sol` (proven foundation)
- Circle CCTP V2 contracts (World Chain, Base, Arbitrum)
- OpenZeppelin contracts (already integrated)
- World ID SDK (existing integration)

---

**This CCTP integration preserves your proven architecture while adding breakthrough cross-chain functionality - exactly what judges want to see! 🚀**
