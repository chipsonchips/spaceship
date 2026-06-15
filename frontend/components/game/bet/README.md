# Dual/Multi Bet Control System

## Overview

The dual bet control system allows users to place and manage multiple independent bets in the same round. Each bet panel maintains its own complete state including bet amount, auto-cashout settings, and transaction status.

## Architecture

### Component Structure

```
UnifiedBetControls (Mode Switcher)
├── BetControls (Single Mode)
└── DualBetControls (Dual Mode)
    ├── BetHeader (Shared Header with Mode Toggle)
    ├── FundsManager (Deposit/Withdraw UI)
    └── 2x SingleBetPanel (Independent Bet Panels)
        ├── ActiveBet (Shows active bet state)
        └── BetPlacementForm (Bet input & placement)
```

### Key Features

1. **Independent Bet State Management**
   - Each panel tracks its own bet using `useMultiBetTracking` hook
   - Separate bet amounts, auto-cashout settings, and processing states
   - Panel-specific bet ID tracking prevents bet conflicts

2. **Mode Switching**
   - Toggle button in header to switch between SINGLE and DUAL modes
   - State preserved when switching modes
   - Visual indicators show current mode

3. **Responsive Design**
   - Desktop: Side-by-side bet panels
   - Mobile: Tabbed interface with swipe indicator
   - Adaptive button sizes and spacing

## Usage

### For Users

1. **Switch to Dual Mode**: Click the "DUAL" button in the bet control header
2. **Place Multiple Bets**: Each panel can place its own independent bet
3. **Manage Each Bet**: Cash out or modify settings per panel
4. **Switch Back**: Click "SINGLE" to return to single bet mode

### For Developers

#### Adding a New Bet Panel

```typescript
<SingleBetPanel
  panelId={3} // Unique panel ID
  explorerUrl={explorerUrl}
  walletAddress={walletAddress}
  gameBalance={gameBalance}
  refreshBalance={refreshBalance}
/>
```

#### Bet Tracking Hook

```typescript
const { myBet, canPlaceBet, trackBet } = useMultiBetTracking(
  panelId,
  roundId,
  walletAddress,
  allUserBets,
);
```

## File Structure

- `UnifiedBetControls.tsx` - Main mode switcher component
- `BetControls.tsx` - Single bet mode (original)
- `DualBetControls.tsx` - Dual bet mode container
- `SingleBetPanel.tsx` - Individual bet panel (used in dual mode)
- `BetHeader.tsx` - Shared header with balance display
- `FundsManager.tsx` - Deposit/Withdraw popup
- `ActiveBet.tsx` - Active bet display component
- `BetPlacementForm.tsx` - Bet input and placement form
- `useMultiBetTracking.ts` - Hook for tracking bets per panel

## State Management

Each `SingleBetPanel` maintains:

- `betAmount` - Current bet amount input
- `autoCashoutMultiplier` - Auto-cashout setting
- `isProcessing` - Processing state
- `txHash` - Transaction hash
- `error` - Error messages
- `freeBetsRemaining` - Available free bets
- `useFreeBet` - Free bet toggle
- `lastBetAmount` - Last placed bet (for rebet)

Panel-specific tracking via `useMultiBetTracking`:

- `myBet` - This panel's active bet
- `canPlaceBet` - Whether this panel can place a bet
- `trackBet` - Function to assign a bet to this panel

## API Integration

The system uses the updated `placeBet` API that returns:

```typescript
{
  success: boolean;
  error?: string;
  txHash?: string;
  betId?: number; // Used for panel tracking
}
```

## Future Enhancements

- [ ] Support for 3+ bet panels
- [ ] Bet presets per panel
- [ ] Copy bet settings between panels
- [ ] Bet history per panel
- [ ] Panel-specific statistics
