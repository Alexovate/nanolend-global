# CrossChainBNPL Deployment & Management Guide

## Quick Setup

### 1. Environment Configuration

```bash
# Copy template and configure
cp env.template .env

# Edit .env with your settings:
# - PRIVATE_KEY: Your deployment private key
# - ADMIN_ADDRESS: Your admin wallet address
# - RPC URLs: Your Alchemy/Infura endpoints
```

### 2. Deploy to World Chain

```bash
# Deploy main contract
./manage.sh deploy

# Fund with USDC (default: 50 USDC)
./manage.sh fund

# Register demo merchants
./manage.sh register-demo-merchants

# Check status
./manage.sh status
```

### 3. Multi-Chain Deployment

```bash
# Deploy to Base
FOUNDRY_PROFILE=base ./manage.sh deploy

# Deploy to Arbitrum
FOUNDRY_PROFILE=arbitrum ./manage.sh deploy
```

## Management Commands

### 🚀 **Deployment**

- `./manage.sh deploy` - Deploy CrossChainBNPL contract
- `./manage.sh fund` - Fund contract with USDC
- `./manage.sh status` - Show contract status

### 🏪 **Merchant Management**

- `./manage.sh register-merchant <address> <name>` - Register merchant
- `./manage.sh register-demo-merchants` - Register demo merchants

### ⚠️ **Emergency Operations**

- `./manage.sh pause` - Pause all operations
- `./manage.sh unpause` - Resume operations
- `./manage.sh emergency-withdraw` - Withdraw all funds

### 🔧 **Development**

- `./manage.sh test` - Run test suite
- `./manage.sh build` - Build contracts
- `./manage.sh clean` - Clean build artifacts

## Environment Variables

### Required

```bash
PRIVATE_KEY=0x...                    # Deployment private key
ADMIN_ADDRESS=0x...                  # Admin wallet address
# RPC URLs are auto-configured with public endpoints
```

### Optional

```bash
FUND_AMOUNT=50                       # Default funding amount
```

### Auto-populated (after deployment)

```bash
CROSSCHAIN_BNPL_WORLD_CHAIN=0x...    # Contract address
CROSSCHAIN_BNPL_BASE=0x...           # Contract address
CROSSCHAIN_BNPL_ARBITRUM=0x...       # Contract address
```

## Hackathon Workflow

### 1. Initial Setup

```bash
# Setup environment
cp env.template .env
# Edit .env with your keys

# Deploy to World Chain
./manage.sh deploy
./manage.sh fund
./manage.sh register-demo-merchants
```

### 2. Demo Preparation

```bash
# Check everything is working
./manage.sh status
./manage.sh test

# Register your demo merchants
./manage.sh register-merchant 0x742d35Cc... "Demo Coffee Shop"
```

### 3. Live Demo

```bash
# Show contract status to judges
./manage.sh status

# Fund more if needed
FUND_AMOUNT=100 ./manage.sh fund

# Emergency controls if needed
./manage.sh pause
./manage.sh unpause
```

## Contract Addresses

### World Chain (Primary)

- **USDC**: `0x79A02482A880bCE3F13e09Da970dC34db4CD24d1`
- **TokenMessenger**: TBD (configure in .env)

### Base (Settlement)

- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **TokenMessenger**: `0x1682Ae6375C4E4A97e4B583BC394c861A46D8962`

### Arbitrum (Settlement)

- **USDC**: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- **TokenMessenger**: `0x19330d10D9Cc8751218eaf51E8885D058642E08A`

## Examples

### Complete Deployment

```bash
# 1. Setup
cp env.template .env
# Edit .env

# 2. Deploy main contract
./manage.sh deploy
# Update .env with contract address

# 3. Fund and setup
./manage.sh fund
./manage.sh register-demo-merchants
./manage.sh status

# 4. Test everything
./manage.sh test
```

### Cross-Chain Setup

```bash
# Deploy on all chains
./manage.sh deploy                          # World Chain
FOUNDRY_PROFILE=base ./manage.sh deploy     # Base
FOUNDRY_PROFILE=arbitrum ./manage.sh deploy # Arbitrum

# Fund main contract only (World Chain)
./manage.sh fund
```

## Troubleshooting

### Common Issues

- **"Contract address not set"**: Update `.env` with deployed contract address
- **"Insufficient USDC"**: Fund your admin wallet with USDC first
- **"RPC URL not working"**: Check your Alchemy/Infura endpoints

### Reset Everything

```bash
./manage.sh clean
./manage.sh build
./manage.sh test
```

---

**Ready for ETH Global NYC 2025! 🚀**
