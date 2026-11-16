# 🃏 Bhabhi (The Indian Card Game)

A full-stack, real-time multiplayer implementation of the classic Indian card game **Bhabhi** (also known as *Bhabhi Thulla* / *Get Away*). Built with an immutable pure-rules engine, an authoritative Socket.IO server, and a modern responsive React client.

---

## 🏛️ Project Architecture

This monorepo is managed with standard **npm workspaces**:

```text
bhabhi/
├── packages/
│   └── engine/             # Pure TypeScript library: 0 dependencies, deterministic rules, tests
│       ├── src/            # types, deck, rules, game state transitions
│       └── tests/          # Vitest suite covering all 20 spec scenarios + 500 game simulations
├── apps/
│   ├── server/             # Express + Socket.IO authoritative game server
│   │   └── src/            # room manager, bot intelligence, reconnect timers, terminal CLI
│   └── web/                # React 19 + Vite UI
│       └── src/            # Zustand state, Framer Motion animations, pure CSS playing cards
├── Dockerfile              # Docker container for the server
└── .github/workflows/      # Automated CI workflow running engine tests on push
```

---

## 📜 Game Rules Summary (BHABHI RULES SPEC v1)

- **Deck & Rank (S1–S3)**: 52-card standard deck (no jokers). Rank order: `2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A` (Ace is high). No trump suits.
- **The Opening Lead (S6)**: The player holding the **Ace of Spades (A♠)** must lead the first trick with A♠.
- **Follow Rule (T3)**: If you hold any card of the led suit, you **must** follow suit.
- **Cut Rule (T4)**: If you are void in the led suit, you must cut with another suit. A cut **ends the trick immediately**.
- **First-Trick Restriction (T5)**: In trick 1 (A♠ lead), cuts must be rank **$\le 10$**. Waived only if holding no cards $\le 10$.
- **Trick Resolution (R1–R3)**:
  - **No Cut**: Highest card of led suit wins; cards are discarded permanently out of play. Winner leads next trick.
  - **Cut Occurred**: The player who played the highest card of the led suit picks up all trick cards into their hand. That player leads next.
- **Elimination & Winning (E1–E7)**: Players are safe (eliminated) once a trick fully resolves and their hand is empty.
- **Bhabhi (G1–G4)**: The last player left holding cards is the **BHABHI** (the loser). If the last active players empty hands simultaneously, it's a **DRAW**.
- **Turn Timer (M1)**: 30 seconds per turn. Automatically auto-plays the lowest-rank legal card on timeout.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+**
- **npm 10+**

### 1. Installation

Install all workspace dependencies from the root directory:

```bash
npm install
```

---

### 2. Running Locally

#### Option A: Terminal CLI Game (Single Player vs Bots)
Play Bhabhi directly in your terminal with interactive prompts and smart bot opponents:

```bash
npm run cli -w apps/server
```

#### Option B: Full-Stack Web App

Start the authoritative server on port `3001`:
```bash
npm run dev -w apps/server
```

In a separate terminal, start the React + Vite frontend on port `5173`:
```bash
npm run dev -w apps/web
```

Open your browser at [http://localhost:5173](http://localhost:5173).

---

### 3. Docker Deployment

Build and run the game server in a Docker container:

```bash
# Build Docker image
docker build -t bhabhi-server .

# Run container
docker run -p 3001:3001 bhabhi-server
```

Verify health:
```bash
curl http://localhost:3001/health
# {"ok": true}
```

---

## 🧪 Testing

Run Vitest across the engine rules test suite:

```bash
npm test -w packages/engine
```

The test suite covers:
- S1–S6: Card distribution, extras to lower seats, A♠ lead enforcement.
- T1–T6: Follow suit rules, cuts, first-trick restrictions, and waivers.
- R1–R3: Discards on no-cut, pickups on cut (including follower highest card).
- E1–E7: Elimination edge cases, winner out lead advancement clockwise.
- G1–G4: Bhabhi determination, simultaneous draw, finish rankings.
- 500 complete Monte Carlo game simulations verifying 52-card invariant conservation and guaranteed termination.

---

## ✨ Features Included

- **Authoritative Server**: Prevents cheating by never sending opponent hands across the wire.
- **Reconnection Tokens**: Holds seats for 120 seconds upon disconnect with auto-play bot backup.
- **Sound Effects**: Procedural Web Audio API sound effects for card plays, cuts, pickups, and victories, with saved localStorage mute toggle.
- **Last Card Glow**: Visual pulse and warning badges when an opponent is down to their last card.
- **Game History Panel**: Real-time event log tracking every trick, play, cut, and elimination throughout the entire match.
- **Mobile Responsive**: Scaled CSS playing cards and circular table layout optimized down to 360px screen width.
