# Linera Roulette

A real-time multiplayer European Roulette game built on Linera's microchain architecture with cross-chain messaging.

![Game Screenshot](screenshots/screenshot-game.png)

---

## Key Accomplishments

- **Real Multiplayer Sync** - Host/Join games with cross-chain messaging, wheels spin together across browser tabs
- **7 Cross-Chain Message Types** - Complete protocol for registration, betting, and result broadcasting
- **44 Unit Tests** - Full coverage of bet logic, payouts, and edge cases
- **On-Chain RNG** - Verifiable randomness using SHA-256 hash of block data, no external oracle
- **Professional UI** - Animated roulette wheel with anime.js, realistic ball physics
- **One-Command Setup** - `./run.bash` starts everything in 30 seconds

---

## Screenshots

| Mode Selection | Multiplayer Host | Multiplayer Join |
|----------------|------------------|------------------|
| ![Modes](screenshots/screenshot-modes.png) | ![Host](screenshots/screenshot-host.png) | ![Multiplayer](screenshots/screenshot-multiplayer.png) |

---

## Why Linera?

Multiplayer roulette needs instant sync - timers, bets, spins, results must hit all players at once. Each room runs on its own microchain, so games don't compete for block space. Cross-chain messaging keeps players synced without a central server.

## Features

- European Roulette (0-36)
- 13 bet types with standard payouts
- Host/Join multiplayer via room codes
- Solo practice mode
- Synchronized betting timer across all players
- On-chain RNG using SHA-256

## Quick Start

```bash
./run.bash
```

Starts local Linera network, deploys contract, launches frontend at `http://localhost:5173`

## Architecture

```
                    ┌─────────────────────────────────┐
                    │         HOST CHAIN (Room)       │
                    │  • Game state                   │
                    │  • All player bets              │
                    │  • RNG execution                │
                    │  • Payout calculation           │
                    └───────────────┬─────────────────┘
                                    │
                      Cross-Chain Messages
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
   │  Player 1   │          │  Player 2   │          │  Player N   │
   │  (own chain)│          │  (own chain)│          │  (own chain)│
   └─────────────┘          └─────────────┘          └─────────────┘
```

- **Host Chain** - One per room. Manages game state, processes bets, executes RNG, broadcasts results.
- **Player Chains** - Each player operates from their own chain, sending bet requests and receiving results via cross-chain messages.

## Cross-Chain Messages

| Message | Direction | Purpose |
|---------|-----------|---------|
| `RegisterPlayerRequest` | Player → Host | Join the game |
| `PlayerRegisteredConfirm` | Host → Player | Confirm registration |
| `PlaceBetRequest` | Player → Host | Submit a bet |
| `BetPlacedConfirm` | Host → Player | Confirm bet placed |
| `SpinWheelRequest` | Player → Host | Request spin |
| `SpinResultBroadcast` | Host → Player | Send result + payout |
| `BalanceUpdate` | Host → Player | Sync chip balance |

## Bet Types

| Type | Payout | Coverage |
|------|--------|----------|
| Straight | 35:1 | Single number |
| Red | 1:1 | Red numbers |
| Black | 1:1 | Black numbers |
| Even | 1:1 | Even numbers |
| Odd | 1:1 | Odd numbers |
| Low | 1:1 | 1-18 |
| High | 1:1 | 19-36 |
| First Dozen | 2:1 | 1-12 |
| Second Dozen | 2:1 | 13-24 |
| Third Dozen | 2:1 | 25-36 |
| First Column | 2:1 | 1,4,7,10,13,16,19,22,25,28,31,34 |
| Second Column | 2:1 | 2,5,8,11,14,17,20,23,26,29,32,35 |
| Third Column | 2:1 | 3,6,9,12,15,18,21,24,27,30,33,36 |

## On-Chain RNG

Winning number generated deterministically using SHA-256 hash of:
- Block timestamp
- Chain ID
- Block height
- Current bet data

```rust
hash(timestamp + chain_id + block_height + bets) % 37
```

Fully verifiable on-chain. No external oracle.

## Project Structure

```
├── contract/                # Linera smart contract (Rust)
│   └── src/
│       ├── lib.rs          # ABI, types, bet logic
│       ├── state.rs        # RouletteState (Views)
│       ├── contract.rs     # Operations, messages, RNG
│       └── service.rs      # GraphQL queries/mutations
│
├── frontend/               # React + TypeScript
│   └── src/
│       ├── components/     # Wheel, BettingTable, Timer
│       ├── hooks/          # useGame
│       └── contexts/       # LineraContext
│
└── run.bash                # One-command launcher
```

## Tech Stack

- **Linera SDK**: 0.15.7
- **Contract**: Rust → WebAssembly
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Animation**: anime.js

## Demo

**Video Demo**: Coming soon

**Try Multiplayer Locally**:
```bash
./run.bash
```
- **Host:** http://localhost:5173
- **Join:** http://localhost:5174

## Build Manually

```bash
# Contract
cd contract
cargo build --release --target wasm32-unknown-unknown

# Frontend
cd frontend
npm install
npm run dev
```

## License

Apache-2.0
