# Start Here - Linera Roulette

## Quickest Way to Run

```bash
./run.bash
```

Then open: **http://localhost:5173**

---

## What This Does

1. Starts local Linera network
2. Builds and deploys the roulette contract
3. Creates 20 microchains for multiplayer rooms
4. Launches frontend on port 5173

---

## Verify Tests Pass

```bash
cd contract
cargo test
```

Expected output: `44 passed; 0 failed`

---

## Play the Game

1. Open http://localhost:5173
2. Choose mode:
   - **Solo** - Practice alone
   - **Host** - Create multiplayer room
   - **Join** - Enter room code
3. Select bet amount, click table to place bets
4. Click "Spin" when ready

---

## Multiplayer Demo

1. Open http://localhost:5173 (Player 1 - Host)
2. Open http://localhost:5174 (Player 2)
3. Player 1: Click "Host", copy room code
4. Player 2: Click "Join", paste code
5. Both place bets, watch sync in real-time

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port 5173 busy | Kill existing: `pkill -f vite` |
| Linera errors | Kill and restart: `pkill -f linera && ./run.bash` |
| Build fails | Ensure Rust + wasm32 target: `rustup target add wasm32-unknown-unknown` |

---

## Files

- `run.bash` - One-command launcher
- `contract/` - Rust smart contract
- `frontend/` - React UI
- `README.md` - Full documentation
- `ARCHITECTURE.md` - Technical design
