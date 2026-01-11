# Run Demo - Step by Step

## Prerequisites

- Rust (with `wasm32-unknown-unknown` target)
- Node.js 18+
- Linera CLI

---

## Step 1: Clone Repository

```bash
git clone https://github.com/aman7o/lineraRoulette.git
cd lineraRoulette
```

---

## Step 2: Run Everything

```bash
./run.bash
```

Wait ~30 seconds for:
- Network startup
- Contract compilation
- Chain pool creation (20 chains)
- Frontend launch

---

## Step 3: Open Browser

**Player 1 (Host):** http://localhost:5173

**Player 2 (Join):** http://localhost:5174 (auto-started)

---

## Step 4: Demo Solo Mode

1. Click **Solo**
2. Click a chip amount (10, 25, 50, 100)
3. Click on the betting table (Red, Black, number, etc.)
4. Click **Spin**
5. Watch result popup
6. Check balance and history updates

---

## Step 5: Demo Multiplayer Mode

### Player 1 (Host):
1. Open http://localhost:5173
2. Click **Host**
3. Copy the room code

### Player 2 (Join):
1. Open http://localhost:5174
2. Click **Join**
3. Paste room code
4. Click Join

### Both Players:
1. Place bets (visible to both in real-time)
2. Host clicks **Start Round**
3. Timer syncs on both screens
4. Host clicks **Spin**
5. Both wheels spin together
6. Same result on both screens

---

## Verify Contract Tests

```bash
cd contract
cargo test
```

Output:
```
running 44 tests
...
test result: ok. 44 passed; 0 failed
```

---

## Stop Everything

Press `Ctrl+C` in the terminal running `./run.bash`

Or manually:
```bash
pkill -f linera
pkill -f vite
```

---

## Expected Output from run.bash

```
🎰 LINERA ROULETTE LAUNCHER
📋 Pre-flight checks passed!
🌐 Step 1/7: Starting local Linera network...
✅ Local Linera network started
🔨 Step 2/7: Building smart contract...
✅ Contract built successfully
🚀 Step 3/7: Deploying contract...
✅ Contract deployed successfully!
🎲 Step 3.5/7: Creating chain pool...
✅ Created chain pool: 20 chains
🔌 Step 4/7: Starting GraphQL service...
✅ GraphQL service started on port 8080
🎨 Step 6/7: Setting up frontend...
✅ Frontend ready
🌐 Step 7/7: Starting frontends...
🎰 LINERA ROULETTE IS RUNNING!
```
