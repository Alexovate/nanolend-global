# NanoLend Global - ETH Global NYC 2025 Presentation

## 🎯 Presentation Overview

**Duration:** 5 minutes + 2-3 minute live demo  
**Format:** Marp presentation with integrated live demonstration  
**Target:** ETH Global NYC judges, partners, and community

## 📋 Slide Structure

1. **Title Slide** - "Proof of Identity, Not Proof of Wealth" with World Chain badges
2. **Problem** - 1.4B people excluded with stat circles showing market scale
3. **Solution** - Multi-chain BNPL tech grid with 4 key features
4. **Live Demo** - Simple announcement slide for demo transition
5. **Technical Innovation** - Current integrations + 48-hour achievements
6. **Market Opportunity** - Philippines First: 1.3M sari-sari stores + 81M GCash users
7. **Future Vision** - Next steps + business model with 100M people goal
8. **Call to Action** - "Giving humanity the benefit of the doubt" with contact

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

_"1.4 billion people can't access traditional credit because systems require proof of wealth, not proof of identity. We built NanoLend Global - proof of identity, not proof of wealth - using World ID verification on World Chain, built completely from scratch in 48 hours."_

#### Problem Statement (30s):

_"Traditional BNPL requires credit scores that exclude emerging markets. We're giving humanity the benefit of the doubt - using sybil-resistant identity to prevent abuse while allowing generous credit policies."_

#### Solution Demo (90s):

_"Watch this complete loan cycle: World ID proves I'm human without revealing personal data, our smart contract instantly pays the merchant, and I can repay later with automatic credit limit increases - all on World Chain mainnet."_

#### Technical Achievement (30s):

_"This isn't just a prototype - we have production-grade smart contracts with 95% test coverage, World ID integration that works today, and a mobile-optimized frontend deployed on World Chain."_

#### Market Opportunity (30s):

_"Starting with Philippines: 1.3 million sari-sari stores and 81 million GCash users provide the perfect infrastructure for blockchain BNPL adoption in emerging markets."_

#### Closing (30s):

_"We're not just building another DeFi project - we're fundamentally reimagining financial trust to bring credit access to 100 million people by 2030."_

## 🎨 Design Elements

- **Color Scheme:** Primary blue (#64B5F6) with success green (#35D07F) on clean white background
- **Typography:** Inter for readability and professional appearance
- **Visual Style:** Clean, minimalist design inspired by Circle and Celo presentations
- **Components:** Unified achievement-box styling, stat circles for metrics, tech grids for features
- **Branding:** Professional, accessible design focused on financial inclusion message

## 📱 Demo Preparation Checklist

- [ ] Mini-app running on localhost:3000
- [ ] ngrok tunnel active and accessible
- [ ] World App installed on mobile device
- [ ] Test merchant registered and active (Manila Hospital)
- [ ] Contract deployed on World Chain with sufficient liquidity
- [ ] World ID verification working
- [ ] Backup plan ready if demo fails
- [ ] Timer set for 5-minute presentation + 2-3 minute demo

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
GitHub: github.com/alexovate/nanolend-global

## 🚀 Current Status

- **Live on World Chain:** Production BNPL smart contracts deployed
- **World ID Integration:** Functional sybil-resistant verification
- **Mobile-Optimized:** World App ready interface
- **Philippine Market:** Focused on 1.3M sari-sari stores and 81M GCash users
- **Future Expansion:** Solana integration and geographic expansion planned

---

_Built with ❤️ for financial inclusion at ETH Global NYC 2025_
