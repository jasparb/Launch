#!/bin/bash

echo "🚀 Launch.fund Smart Contract Deployment Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command_exists solana; then
    echo -e "${RED}❌ Solana CLI not found${NC}"
    echo "Please install Solana CLI first:"
    echo "sh -c \"\$(curl -sSfL https://release.solana.com/v1.18.4/install)\""
    exit 1
fi

if ! command_exists cargo; then
    echo -e "${RED}❌ Rust/Cargo not found${NC}"
    echo "Please install Rust first:"
    echo "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

if ! command_exists anchor; then
    echo -e "${RED}❌ Anchor CLI not found${NC}"
    echo "Please install Anchor CLI first:"
    echo "cargo install --git https://github.com/coral-xyz/anchor avm --locked --force"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites found${NC}"

# Setup Solana configuration
echo -e "${BLUE}Setting up Solana configuration...${NC}"
solana config set --url https://api.devnet.solana.com

# Check if wallet exists
if [ ! -f ~/.config/solana/id.json ]; then
    echo -e "${YELLOW}⚠️  No wallet found, generating new keypair...${NC}"
    solana-keygen new --outfile ~/.config/solana/id.json
fi

# Show wallet address
WALLET_ADDRESS=$(solana address)
echo -e "${BLUE}Wallet address: ${NC}$WALLET_ADDRESS"

# Check SOL balance
BALANCE=$(solana balance | grep -o '[0-9]*\.[0-9]*')
echo -e "${BLUE}Current balance: ${NC}$BALANCE SOL"

# Request airdrop if balance is low
if (( $(echo "$BALANCE < 1" | bc -l) )); then
    echo -e "${YELLOW}Low balance detected, requesting airdrop...${NC}"
    solana airdrop 2
    sleep 2
    NEW_BALANCE=$(solana balance | grep -o '[0-9]*\.[0-9]*')
    echo -e "${GREEN}New balance: ${NC}$NEW_BALANCE SOL"
fi

# Build the program
echo -e "${BLUE}Building smart contract...${NC}"
if anchor build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Deploy the program
echo -e "${BLUE}Deploying to devnet...${NC}"
if anchor deploy --provider.cluster devnet; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Verify deployment
echo -e "${BLUE}Verifying deployment...${NC}"
PROGRAM_ID="8RDF8KobfNfe4ZCPw7T3xputHQDAT7wwiBBkFeRruECo"
if solana account $PROGRAM_ID --url devnet >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Program successfully deployed and verified!${NC}"
    echo -e "${GREEN}Program ID: ${NC}$PROGRAM_ID"
    echo -e "${GREEN}Network: ${NC}devnet"
    echo ""
    echo -e "${BLUE}🎉 Your smart contract is now live on Solana devnet!${NC}"
    echo -e "${BLUE}You can now create real on-chain campaigns in the app.${NC}"
else
    echo -e "${YELLOW}⚠️  Deployment completed but verification failed${NC}"
    echo "The program may still be deploying. Please check again in a few minutes."
fi