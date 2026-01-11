#!/bin/bash
set -e

echo "🎰 =================================="
echo "🎰  LINERA ROULETTE LAUNCHER"
echo "🎰 =================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Linera is installed
if ! command -v linera &> /dev/null; then
    echo -e "${RED}ERROR: Linera CLI not found${NC}"
    echo "Please install Linera from: https://linera.dev"
    exit 1
fi

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}ERROR: Rust not found${NC}"
    echo "Please install Rust from: https://rustup.rs"
    exit 1
fi

# Check if Node.js is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}ERROR: Node.js/npm not found${NC}"
    echo "Please install Node.js from: https://nodejs.org"
    exit 1
fi

echo -e "${BLUE}📋 Pre-flight checks passed!${NC}"
echo ""

# Step 1: Start local Linera network (WITHOUT faucet first - to allow deployment)
echo -e "${YELLOW}🌐 Step 1/7: Starting local Linera network...${NC}"
linera net up --testing-prng-seed 37 > /tmp/linera-net.log 2>&1 &
LINERA_PID=$!
sleep 12

# Extract wallet environment variables
LINERA_WALLET=$(grep "export LINERA_WALLET" /tmp/linera-net.log | head -1 | cut -d'"' -f2)
LINERA_KEYSTORE=$(grep "export LINERA_KEYSTORE" /tmp/linera-net.log | head -1 | cut -d'"' -f2)
LINERA_STORAGE=$(grep "export LINERA_STORAGE" /tmp/linera-net.log | head -1 | cut -d'"' -f2)

if [ -z "$LINERA_WALLET" ]; then
    echo -e "${RED}ERROR: Failed to extract wallet path from network startup${NC}"
    cat /tmp/linera-net.log
    kill $LINERA_PID 2>/dev/null || true
    exit 1
fi

export LINERA_WALLET
export LINERA_KEYSTORE
export LINERA_STORAGE

echo -e "${GREEN}✅ Local Linera network started (PID: $LINERA_PID)${NC}"
echo -e "${BLUE}   Wallet: $LINERA_WALLET${NC}"
echo ""

# Step 2: Build contract
echo -e "${YELLOW}🔨 Step 2/7: Building smart contract...${NC}"
cd contract

# Add wasm32 target if not already added
rustup target add wasm32-unknown-unknown 2>/dev/null || true

# Build contract
cargo build --release --target wasm32-unknown-unknown

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Contract build failed${NC}"
    kill $LINERA_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✅ Contract built successfully${NC}"
cd ..
echo ""

# Step 3: Deploy contract (BEFORE starting faucet to avoid wallet lock)
echo -e "${YELLOW}🚀 Step 3/7: Deploying contract to local network...${NC}"

# Publish and create application (host chain with empty argument = host mode)
# Empty object {} deserializes to InstantiationArgument { host_chain_id: None }
APP_OUTPUT=$(linera publish-and-create \
    contract/target/wasm32-unknown-unknown/release/linera_roulette_contract.wasm \
    contract/target/wasm32-unknown-unknown/release/linera_roulette_service.wasm \
    --json-argument '{}' \
    2>&1)

# Extract APP_ID from output (last 64-char hex string)
APP_ID=$(echo "$APP_OUTPUT" | grep -oE '[a-f0-9]{64}' | tail -1)

if [ -z "$APP_ID" ]; then
    echo -e "${RED}ERROR: Failed to extract APP_ID from deployment${NC}"
    echo "Deployment output:"
    echo "$APP_OUTPUT"
    kill $LINERA_PID 2>/dev/null || true
    exit 1
fi

# Get default chain ID for frontend fallback
DEFAULT_CHAIN=$(linera wallet show 2>&1 | grep "Chain ID:" | head -1 | awk '{print $3}')

echo -e "${GREEN}✅ Contract deployed successfully!${NC}"
echo -e "${BLUE}   APP_ID: $APP_ID${NC}"
echo -e "${BLUE}   DEFAULT_CHAIN: $DEFAULT_CHAIN${NC}"
echo ""

# ============================================
# Step 3.5: Create Chain Pool (20 chains)
# ============================================
echo -e "${YELLOW}🎲 Step 3.5/7: Creating chain pool for Host/Join...${NC}"

CHAIN_POOL_SIZE=20
CHAIN_POOL=()

# Chain 1 = Default chain
CHAIN_POOL+=("$DEFAULT_CHAIN")
echo -e "${GREEN}   ✓ Chain 1/${CHAIN_POOL_SIZE}: ${DEFAULT_CHAIN:0:16}...${NC}"

# Create remaining chains
for i in $(seq 2 $CHAIN_POOL_SIZE); do
    echo -ne "${BLUE}   Creating chain $i/${CHAIN_POOL_SIZE}...${NC}\r"

    OPEN_OUTPUT=$(linera open-chain 2>&1)
    NEW_CHAIN=$(echo "$OPEN_OUTPUT" | grep -oE '[a-f0-9]{64}' | tail -1)

    if [ -n "$NEW_CHAIN" ]; then
        CHAIN_POOL+=("$NEW_CHAIN")
        echo -e "${GREEN}   ✓ Chain $i/${CHAIN_POOL_SIZE}: ${NEW_CHAIN:0:16}...${NC}"
    else
        echo -e "${YELLOW}   ⚠ Chain $i: Failed to create${NC}"
    fi

    sleep 0.5
done

# Sync wallet after batch creation
linera sync > /dev/null 2>&1 || true

POOL_COUNT=${#CHAIN_POOL[@]}
echo -e "${GREEN}✅ Created chain pool: $POOL_COUNT chains${NC}"
echo ""

# Step 4: Start Linera service on port 8080
echo -e "${YELLOW}🔌 Step 4/7: Starting Linera GraphQL service...${NC}"
linera service --port 8080 > /tmp/linera-service.log 2>&1 &
SERVICE_PID=$!
sleep 3
curl -s http://localhost:8080 > /dev/null && echo -e "${GREEN}✅ GraphQL service started on port 8080${NC}" || echo -e "${YELLOW}⚠️ GraphQL service may still be starting...${NC}"
echo ""

# Step 5: Faucet service (optional - for multiplayer new chain creation)
# Note: Faucet requires exclusive RocksDB access, so we skip it for now
# The game works fine without faucet in Solo/Host modes - only needed for creating new player chains
echo -e "${YELLOW}💧 Step 5/7: Faucet service (skipped - using existing chains)...${NC}"
echo -e "${BLUE}   Note: Multiplayer 'Join' mode requires manual chain setup${NC}"
FAUCET_PID=""
echo ""

# Step 6: Setup frontend
echo -e "${YELLOW}🎨 Step 6/7: Setting up frontend...${NC}"
cd frontend

# Create .env file with APP_ID, DEFAULT_CHAIN, and HOST_CHAIN
cat > .env << EOF
VITE_NODE_URL=http://localhost:8080
VITE_FAUCET_URL=http://localhost:8079
VITE_APP_ID=$APP_ID
VITE_DEFAULT_CHAIN=$DEFAULT_CHAIN
VITE_HOST_CHAIN=$DEFAULT_CHAIN
EOF

echo -e "${GREEN}✅ Environment configured${NC}"

# Generate chainPool.json for frontend
echo -e "${BLUE}   Generating chainPool.json...${NC}"

# Start JSON array
echo '{"chains":[' > public/chainPool.json

# Add each chain
for i in "${!CHAIN_POOL[@]}"; do
    COMMA=""
    [ $i -gt 0 ] && COMMA=","
    echo "${COMMA}{\"id\":$((i+1)),\"chainId\":\"${CHAIN_POOL[$i]}\",\"inUse\":false}" >> public/chainPool.json
done

# Close JSON
echo ']}' >> public/chainPool.json

echo -e "${GREEN}   ✓ chainPool.json created with $POOL_COUNT chains${NC}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

echo -e "${GREEN}✅ Frontend ready${NC}"
cd ..
echo ""

# Step 7: Start frontends (2 instances for multiplayer testing)
echo -e "${YELLOW}🌐 Step 7/7: Starting frontends (2 instances)...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
PORT=5174 npm run dev > /tmp/frontend-5174.log 2>&1 &
cd ..

# Wait for frontend to start
sleep 5

echo ""
echo -e "${GREEN}🎰 =================================="
echo -e "🎰  LINERA ROULETTE IS RUNNING!"
echo -e "🎰 ==================================
${NC}"
echo ""
echo -e "${BLUE}📍 Access Points:${NC}"
echo -e "   Frontend 1 (Host):   ${GREEN}http://localhost:5173${NC}"
echo -e "   Frontend 2 (Player): ${GREEN}http://localhost:5174${NC}"
echo -e "   GraphQL Service:     ${GREEN}http://localhost:8080${NC}"
echo ""
echo -e "${BLUE}📊 Application Info:${NC}"
echo -e "   APP_ID: ${YELLOW}$APP_ID${NC}"
echo ""
echo -e "${BLUE}🎮 How to Play:${NC}"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Click 'Connect to Local Network'"
echo "   3. Register as a player"
echo "   4. Place your bets on the roulette table"
echo "   5. Click 'Spin the Wheel' and win!"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down...${NC}"

    # Kill frontend
    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Stopping frontend..."
        kill $FRONTEND_PID 2>/dev/null || true
    fi

    # Kill Faucet service
    if [ ! -z "$FAUCET_PID" ]; then
        echo "Stopping Faucet service..."
        kill $FAUCET_PID 2>/dev/null || true
    fi

    # Kill Linera service
    if [ ! -z "$SERVICE_PID" ]; then
        echo "Stopping GraphQL service..."
        kill $SERVICE_PID 2>/dev/null || true
    fi

    # Kill Linera network
    if [ ! -z "$LINERA_PID" ]; then
        echo "Stopping Linera network..."
        kill $LINERA_PID 2>/dev/null || true
    fi

    # Kill any remaining linera processes
    pkill -f "linera" 2>/dev/null || true

    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

# Wait indefinitely
wait
