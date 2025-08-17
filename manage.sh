#!/bin/bash

# CrossChainBNPL Management Script
# Usage: ./manage.sh [command] [args...]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo -e "${YELLOW}Copy env.template to .env and configure your settings:${NC}"
    echo "cp env.template .env"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Determine RPC URL based on current chain
get_rpc_url() {
    case "${FOUNDRY_PROFILE:-default}" in
        "world_chain"|"worldchain")
            echo "https://worldchain-mainnet.g.alchemy.com/public"
            ;;
        "base")
            echo "https://mainnet.base.org"
            ;;
        "arbitrum")
            echo "https://arb1.arbitrum.io/rpc"
            ;;
        *)
            echo "https://worldchain-mainnet.g.alchemy.com/public"  # Default to World Chain
            ;;
    esac
}

RPC_URL=$(get_rpc_url)

# Main command handler
case "$1" in
    "deploy")
        echo -e "${BLUE}Deploying CrossChainBNPL...${NC}"
        forge script script/ManageCrossChainBNPL.s.sol:ManageCrossChainBNPL \
            --sig "deploy()" \
            --rpc-url "$RPC_URL" \
            --broadcast \
            --private-key "$PRIVATE_KEY"
        ;;
    
    "fund")
        AMOUNT=${2:-${FUND_AMOUNT:-50}}
        echo -e "${BLUE}Funding contract with ${AMOUNT} USDC...${NC}"
        FUND_AMOUNT="$AMOUNT" forge script script/ManageCrossChainBNPL.s.sol:ManageCrossChainBNPL \
            --sig "fund()" \
            --rpc-url "$RPC_URL" \
            --broadcast \
            --private-key "$PRIVATE_KEY"
        ;;
    
    "register-merchant")
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo -e "${RED}Usage: ./manage.sh register-merchant <address> <name>${NC}"
            exit 1
        fi
        echo -e "${BLUE}Registering merchant: $3 at $2${NC}"
        forge script script/ManageCrossChainBNPL.s.sol:ManageCrossChainBNPL \
            --sig "registerMerchant(address,string)" "$2" "$3" \
            --rpc-url "$RPC_URL" \
            --broadcast \
            --private-key "$PRIVATE_KEY"
        ;;
    
    "register-demo-merchants")
        echo -e "${BLUE}Registering demo merchants for hackathon...${NC}"
        forge script script/ManageCrossChainBNPL.s.sol:ManageCrossChainBNPL \
            --sig "batchRegisterMerchants()" \
            --rpc-url "$RPC_URL" \
            --broadcast \
            --private-key "$PRIVATE_KEY"
        ;;
    
    "get-merchant")
        if [ -z "$2" ]; then
            echo -e "${RED}Usage: ./manage.sh get-merchant <address>${NC}"
            exit 1
        fi
        echo -e "${BLUE}Getting merchant profile for: $2${NC}"
        forge script script/ManageCrossChainBNPL.s.sol:ManageCrossChainBNPL \
            --sig "getMerchantProfile(address)" "$2" \
            --rpc-url "$RPC_URL"
        ;;
    
    "list-merchants")
        echo -e "${BLUE}Listing all registered merchants...${NC}"
        forge script script/ManageCrossChainBNPL.s.sol:ManageCrossChainBNPL \
            --sig "listMerchants()" \
            --rpc-url "$RPC_URL"
        ;;
    
    "status")
        echo -e "${BLUE}Checking contract status...${NC}"
        forge script script/ManageCrossChainBNPL.s.sol:ManageCrossChainBNPL \
            --sig "status()" \
            --rpc-url "$RPC_URL"
        ;;
    
    "pause")
        echo -e "${YELLOW}Pausing contract...${NC}"
        forge script script/ManageCrossChainBNPL.s.sol:ManageCrossChainBNPL \
            --sig "pause()" \
            --rpc-url "$RPC_URL" \
            --broadcast \
            --private-key "$PRIVATE_KEY"
        ;;
    
    "unpause")
        echo -e "${GREEN}Unpausing contract...${NC}"
        forge script script/ManageCrossChainBNPL.s.sol:ManageCrossChainBNPL \
            --sig "unpause()" \
            --rpc-url "$RPC_URL" \
            --broadcast \
            --private-key "$PRIVATE_KEY"
        ;;
    
    "emergency-withdraw")
        echo -e "${RED}Emergency withdrawal...${NC}"
        forge script script/ManageCrossChainBNPL.s.sol:ManageCrossChainBNPL \
            --sig "emergencyWithdraw()" \
            --rpc-url "$RPC_URL" \
            --broadcast \
            --private-key "$PRIVATE_KEY"
        ;;
    
    "test")
        echo -e "${BLUE}Running tests...${NC}"
        forge test -vv
        ;;
    
    "build")
        echo -e "${BLUE}Building contracts...${NC}"
        forge build
        ;;
    
    "clean")
        echo -e "${BLUE}Cleaning build artifacts...${NC}"
        forge clean
        ;;
    
    "install")
        echo -e "${BLUE}Installing dependencies...${NC}"
        forge install
        ;;
    
    "help"|*)
        echo -e "${GREEN}CrossChainBNPL Management Commands:${NC}"
        echo ""
        echo -e "${BLUE}Deployment:${NC}"
        echo "  deploy                    Deploy CrossChainBNPL contract"
        echo "  fund                      Fund contract with USDC"
        echo ""
        echo -e "${BLUE}Merchant Management:${NC}"
        echo "  register-merchant <addr> <name>  Register a merchant"
        echo "  register-demo-merchants   Register demo merchants for hackathon"
        echo "  get-merchant <addr>       Get merchant profile details"
        echo "  list-merchants            List all registered merchants"
        echo ""
        echo -e "${BLUE}Operations:${NC}"
        echo "  status                    Show contract status"
        echo "  pause                     Pause contract operations"
        echo "  unpause                   Unpause contract operations"
        echo "  emergency-withdraw        Emergency withdraw all funds"
        echo ""
        echo -e "${BLUE}Development:${NC}"
        echo "  test                      Run test suite"
        echo "  build                     Build contracts"
        echo "  clean                     Clean build artifacts"
        echo "  install                   Install dependencies"
        echo ""
        echo -e "${YELLOW}Environment:${NC}"
        echo "  Set FOUNDRY_PROFILE=world_chain|base|arbitrum to change target chain"
        echo "  Configure RPC URLs and addresses in .env file"
        echo ""
        echo -e "${BLUE}Examples:${NC}"
        echo "  ./manage.sh deploy"
        echo "  ./manage.sh fund"
        echo "  ./manage.sh register-merchant 0x123... \"Coffee Shop\""
        echo "  FOUNDRY_PROFILE=base ./manage.sh deploy"
        ;;
esac
