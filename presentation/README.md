# NanoLend Global - ETH Global NYC 2025 Presentation

## 🎯 Presentation Overview

**Duration:** 5 minutes + 2-3 minute live demo  
**Format:** Marp presentation with integrated live demonstration  
**Target:** ETH Global NYC judges, partners, and community

## 📋 Slide Structure

1. **Title Slide** - Hook with multi-chain BNPL positioning
2. **Problem** - 1.4B people excluded from traditional finance
3. **Solution** - Multi-chain BNPL with World ID verification
4. **Live Demo** - Complete loan cycle demonstration
5. **Technical Innovation** - Partner integrations and architecture
6. **Market Opportunity** - $8T market with real traction
7. **48-Hour Achievements** - What we built from scratch
8. **Future Vision** - Global scale and Solana expansion
9. **Call to Action** - Contact and next steps
10. **Backup Technical** - Deep dive if time permits

## 🚀 How to Present

### Before the Demo:

```bash
# 1. Ensure mini-app is running
cd src/mini-app && npm run dev

# 2. Open presentation in browser
npx @marp-team/marp-cli --html presentation/nanolend-global-eth-global-nyc.md --watch

# 3. Prepare mobile device with World App
# 4. Have ngrok URL ready for live demo
```

### Demo Flow (2-3 minutes):

1. **Show Problem** (30s) - Quick market stats
2. **Solution Overview** (30s) - Multi-chain architecture
3. **Live Demo** (90s):
   - Select merchant "Manila Hospital"
   - World ID verification
   - Instant loan approval → merchant payment
   - Dashboard showing active loan
   - Repayment flow via MiniKit
4. **Technical Highlights** (30s) - Partner integrations

### Key Talking Points:

#### Opening Hook (30s):

_"1.4 billion people can't access traditional credit, but 60% have smartphones. We built the first multi-chain BNPL platform that uses World ID for identity verification and Circle CCTP for cross-chain settlements - completely from scratch in 48 hours."_

#### Problem Statement (30s):

_"Current BNPL platforms like Klarna require credit scores that exclude emerging markets. We're solving this with blockchain-native identity verification and multi-chain architecture for global accessibility."_

#### Solution Demo (90s):

_"Watch this complete loan cycle: World ID proves I'm human without revealing personal data, our smart contract instantly pays the merchant, and I can repay later with automatic credit limit increases."_

#### Technical Achievement (30s):

_"This isn't just a prototype - we have production-grade smart contracts, comprehensive testing, real Circle CCTP integration, and a mobile-optimized frontend that works today."_

#### Market Opportunity (30s):

_"The $8 trillion BNPL market is growing 25% annually, and we already have advanced partnership discussions with the Asian Development Bank for Pacific region deployment."_

#### Closing (30s):

_"We're not just building another DeFi project - we're creating the infrastructure to bring financial inclusion to 1.4 billion people using the best of Web3 technology."_

## 🎨 Design Elements

- **Color Scheme:** World Chain blues (#64B5F6) with success greens (#81C784)
- **Typography:** Inter for readability, JetBrains Mono for code
- **Visual Style:** Modern gradients, subtle shadows, mobile-first design
- **Branding:** Consistent with NanoLend Global identity

## 📱 Demo Preparation Checklist

- [ ] Mini-app running on localhost:3000
- [ ] ngrok tunnel active and accessible
- [ ] World App installed on mobile device
- [ ] Test merchant registered and active
- [ ] Contract funded with sufficient USDC
- [ ] Backup slides ready if demo fails
- [ ] Timer set for 5-minute presentation

## 🔧 Technical Requirements

```bash
# Install Marp CLI
npm install -g @marp-team/marp-cli

# Generate HTML presentation
marp presentation/nanolend-global-eth-global-nyc.md --html

# Generate PDF for backup
marp presentation/nanolend-global-eth-global-nyc.md --pdf

# Watch mode for live editing
marp presentation/nanolend-global-eth-global-nyc.md --watch
```

## 🎯 Success Metrics

**Primary Goals:**

- Clear problem-solution fit demonstration
- Impressive technical achievement showcase
- Real market opportunity validation
- Memorable live demo execution

**Backup Plans:**

- Screenshots ready if demo fails
- Technical deep-dive slide available
- Contact information prominent for follow-ups

## 📞 Contact Information

**Alexander Schmitt**  
Email: alexander@nanolend.global  
GitHub: github.com/alexovate/nanolend-global  
Demo: nanolend-global.vercel.app

---

_Built with ❤️ for financial inclusion at ETH Global NYC 2025_
