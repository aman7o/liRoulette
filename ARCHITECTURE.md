# Architecture - Linera Roulette

## Overview

Linera Roulette demonstrates Linera's microchain architecture for real-time multiplayer gaming. Each game room runs on its own microchain, enabling parallel games without congestion.

---

## System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         LINERA NETWORK                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│   │  Room Chain │   │  Room Chain │   │  Room Chain │   ...    │
│   │     (A)     │   │     (B)     │   │     (C)     │          │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘          │
│          │                 │                 │                  │
│          └────────────────┬┴─────────────────┘                  │
│                           │                                     │
│                    Cross-Chain Messages                         │
│                           │                                     │
│          ┌────────────────┼────────────────┐                    │
│          │                │                │                    │
│          ▼                ▼                ▼                    │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │  Player 1   │  │  Player 2   │  │  Player N   │            │
│   │   Chain     │  │   Chain     │  │   Chain     │            │
│   └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Chain Roles

### Room Chain (Host)
- **Purpose:** Game orchestration
- **State:**
  - `game: GameState` - current round, bets, results
  - `players: MapView<String, Player>` - registered players
  - `player_chains: SetView<String>` - connected player chain IDs
- **Operations:**
  - Process bets
  - Execute RNG
  - Calculate payouts
  - Broadcast results

### Player Chains
- **Purpose:** Individual player state
- **State:**
  - `my_player: Option<Player>` - local player info
  - `host_chain_id: Option<String>` - reference to room
- **Operations:**
  - Send bet requests
  - Receive confirmations
  - Sync balance updates

---

## Cross-Chain Message Flow

### 1. Player Registration

```
Player Chain                    Room Chain
     │                              │
     │  RegisterPlayerRequest       │
     │  {name, initial_balance}     │
     │─────────────────────────────►│
     │                              │ Store player
     │                              │ Add to player_chains
     │  PlayerRegisteredConfirm     │
     │  {player, success}           │
     │◄─────────────────────────────│
     │                              │
```

### 2. Placing a Bet

```
Player Chain                    Room Chain
     │                              │
     │  PlaceBetRequest             │
     │  {bet_type, numbers, amount} │
     │─────────────────────────────►│
     │                              │ Validate balance
     │                              │ Deduct amount
     │                              │ Add to current_bets
     │  BetPlacedConfirm            │
     │  {bet, new_balance}          │
     │◄─────────────────────────────│
     │                              │
```

### 3. Spin and Result

```
Player Chain                    Room Chain
     │                              │
     │  SpinWheelRequest            │
     │─────────────────────────────►│
     │                              │ Generate random number
     │                              │ Calculate winners
     │                              │ Update balances
     │  SpinResultBroadcast         │
     │  {result, payout, balance}   │
     │◄─────────────────────────────│
     │                              │
```

---

## Message Types

| Message | Direction | Fields |
|---------|-----------|--------|
| `RegisterPlayerRequest` | Player → Host | name, initial_balance |
| `PlayerRegisteredConfirm` | Host → Player | player, success, error_message |
| `PlaceBetRequest` | Player → Host | bet_type, numbers, amount, player_name |
| `BetPlacedConfirm` | Host → Player | bet, success, new_balance, error_message |
| `SpinWheelRequest` | Player → Host | player_chain_id |
| `SpinResultBroadcast` | Host → Player | result, player_payout, new_balance, won |
| `BalanceUpdate` | Host → Player | new_balance, reason |

---

## On-Chain RNG

The winning number is generated deterministically using SHA-256:

```rust
fn generate_random_number(&mut self, game: &GameState) -> u8 {
    let mut hasher = Sha256::new();
    hasher.update(self.runtime.system_time().micros().to_le_bytes());
    hasher.update(self.runtime.chain_id().to_string().as_bytes());
    hasher.update(self.runtime.block_height().0.to_le_bytes());
    for bet in &game.current_bets {
        hasher.update(bet.player_chain_id.as_bytes());
        hasher.update(bet.amount.to_le_bytes());
        hasher.update(&bet.numbers);
    }
    let hash = hasher.finalize();
    (u64::from_le_bytes(hash[0..8]) % 37) as u8
}
```

**Inputs:**
- Block timestamp
- Chain ID
- Block height
- All current bet data

**Output:** Number 0-36

**Properties:**
- Deterministic - same inputs = same output
- Verifiable - anyone can recompute
- No external oracle needed

---

## State Structures

### GameState
```rust
pub struct GameState {
    pub is_spinning: bool,
    pub current_bets: Vec<Bet>,
    pub last_result: Option<SpinResult>,
    pub history: Vec<u8>,
    pub betting_end_time: Option<u64>,
}
```

### Player
```rust
pub struct Player {
    pub chain_id: String,
    pub name: String,
    pub balance: u64,
}
```

### Bet
```rust
pub struct Bet {
    pub player_chain_id: String,
    pub player_name: String,
    pub bet_type: BetType,
    pub numbers: Vec<u8>,
    pub amount: u64,
}
```

---

## Bet Types and Payouts

| BetType | Payout | Winning Condition |
|---------|--------|-------------------|
| Straight | 35:1 | Exact number match |
| Red | 1:1 | Number is red |
| Black | 1:1 | Number is black |
| Even | 1:1 | Number is even (not 0) |
| Odd | 1:1 | Number is odd |
| Low | 1:1 | Number 1-18 |
| High | 1:1 | Number 19-36 |
| FirstDozen | 2:1 | Number 1-12 |
| SecondDozen | 2:1 | Number 13-24 |
| ThirdDozen | 2:1 | Number 25-36 |
| FirstColumn | 2:1 | 1,4,7,10,13,16,19,22,25,28,31,34 |
| SecondColumn | 2:1 | 2,5,8,11,14,17,20,23,26,29,32,35 |
| ThirdColumn | 2:1 | 3,6,9,12,15,18,21,24,27,30,33,36 |

---

## Frontend Architecture

```
frontend/src/
├── components/
│   ├── RouletteWheel.tsx    # Animated wheel
│   ├── BettingTable.tsx     # Bet placement UI
│   ├── PlayerInfo.tsx       # Balance, stats
│   ├── GameControls.tsx     # Spin button, timer
│   └── ModeSelector.tsx     # Solo/Host/Join
├── hooks/
│   └── useGame.ts           # Game state management
├── contexts/
│   └── LineraContext.tsx    # GraphQL client
└── App.tsx                  # Main app
```

### Data Flow
1. User action (place bet) → `useGame` hook
2. Hook calls GraphQL mutation → Linera service
3. Service executes contract operation
4. Contract updates state, sends messages
5. Frontend polls for updates → UI refresh

---

## File Structure

```
lineraRoulette/
├── contract/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs          # Types, ABI, bet logic, 44 tests
│       ├── state.rs        # RouletteState (Views)
│       ├── contract.rs     # Operations, messages, RNG
│       └── service.rs      # GraphQL queries/mutations
├── frontend/
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── components/
│       ├── hooks/
│       └── contexts/
├── run.bash                # One-command launcher
├── docker-compose.yml      # Container setup
├── Dockerfile
├── README.md
├── START_HERE.md
├── RUN_DEMO.md
└── ARCHITECTURE.md         # This file
```

---

## Testing

```bash
cd contract
cargo test
```

**44 tests covering:**
- Payout calculations (10 tests)
- Color logic (6 tests)
- Bet type winners (22 tests)
- Edge cases (4 tests)
- State initialization (2 tests)
