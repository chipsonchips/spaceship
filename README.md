# Spaceship Game

![Spaceship Game Screenshot](https://purple-accessible-swift-921.mypinata.cloud/ipfs/bafkreie66ht6qors2fwlwihbbobx6umvdppyyxg4rb4fseto5u4fjvknqu)

A real-time crash game built on Base and Celo blockchain with Farcaster integration, USDC payments, and gasless transactions via Paymaster.

## Key Features

### Core Game

- **Real-time crash game** with exponential multiplier growth
- **Live player updates** via WebSocket
- **Provably fair** - on-chain crash verification with server seed hashing
- **Instant payouts** in USDC
- **Countdown timer** - Visible betting phase countdown

### Blockchain & Payments

- ✅ **USDC payments** - Players bet in USDC tokens (Base network)
- ✅ **Gasless transactions** - Paymaster sponsors transaction fees
- ✅ **ERC-4337 compatible** - Account abstraction ready
- ✅ **Secure betting** - Smart contract enforces all rules

### User Experience

- ✅ **Farcaster MiniApp** - Frame SDK integrated
- ✅ **Base Mini App Kit** - Native Base integration
- ✅ **Celo Mini App Kit** - Native Base integration
- ✅ **Mobile responsive** - Works everywhere
- ✅ **Real-time feedback** - WebSocket updates

## Architecture

```
spaceship/
├── frontend/          # Next.js 15 + React 19
│   ├── app/           # App router (Farcaster entry)
│   ├── components/    # Game UI components
│   ├── context/       # GameContext state
│   ├── hooks/         # useGame, usePaymaster, useUSDC
│   └── types/         # TypeScript definitions
├── backend/           # Express + Socket.IO + TypeORM
│   ├── src/
│   │   ├── routes/    # REST API endpoints
│   │   ├── services/  # GameEngine, Services
│   │   ├── entities/  # Database entities
│   │   ├── db/        # Migrations
│   │   └── config/    # Configuration
├── contracts/         # Solidity + Foundry
│   ├── src/
│   │   ├── SpaceshipGameUSDC.sol # Main contract (USDC + ERC-4337)
│   │   └── Spaceship.sol         # Legacy (ETH-based)
│   ├── test/          # Contract tests
│   └── script/        # Deployment scripts
└── .env.example       # Configuration template
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.0.0
- **pnpm** ≥ 8.0.0
- **PostgreSQL** (backend)
- **Foundry** (contracts)

### Installation

```bash
# Clone and install
git clone <repo>
cd spaceship
pnpm install:all

# Setup environment
cp .env.example .env.local
cp .env.example backend/.env
```

### Development

```bash
# Run both frontend and backend
pnpm dev

# Or separately
pnpm frontend:dev  # http://localhost:3000
pnpm backend:dev   # http://localhost:3001

# Database setup
cd backend
pnpm db:sync && pnpm db:migrate
```

## 🔗 Blockchain

### Smart Contracts

**Recommended: SpaceshipGameUSDC.sol**

- USDC token support
- ERC-4337 ready
- Paymaster compatible

**Deploy:**

```bash
cd contracts
forge script script/Spaceship.s.sol --rpc-url $BASE_RPC --broadcast
```

### Paymaster (Gasless)

Setup via [Coinbase Developer Platform](https://www.coinbase.com/developer-platform):

1. Create account and get Paymaster URL
2. Add contract to allowlist
3. Set `NEXT_PUBLIC_PAYMASTER_PROXY_URL`

Players see "Gas Sponsored ✓" with no fees!

## 🎯 Game Flow

```
BETTING (10s) → FLYING (variable) → CRASHED → SETTLE
   ↓              ↓                  ↓
Place bets    Cash out          Record results
Countdown     Pay out USDC       Next round
```

## 📄 License

MIT

---
