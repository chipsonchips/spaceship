#!/bin/bash

# Load environment variables
set -a
source contracts/.env
set +a

INTERVAL=3
COUNTER=0

# Gas limit for snapshotRound through proxy
# Increased from initial estimate due to delegatecall overhead
GAS_LIMIT="150000"

echo "================================================"
echo "Starting Celo Snapshot Writer Loop"
echo "Interval: ${INTERVAL} seconds (~20 tx/min)"
echo "Gas Limit: ${GAS_LIMIT} (price fetched dynamically)"
echo "Press Ctrl+C to stop"
echo "================================================"
echo ""

# Fetch starting nonce once, then increment manually to avoid collisions
NONCE=$(cast nonce "$(cast wallet address --private-key "$PRIVATE_KEY")" --rpc-url "$MAINNET_URL")
echo "Starting nonce: $NONCE"
echo ""

while true; do
  COUNTER=$((COUNTER + 1))
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  
  # Generate random data for each field
  ROUND_ID=$((RANDOM % 10000 + 1))
  SNAPSHOT_HASH="0x$(openssl rand -hex 32)"
  PLAYERS_MERKLE_ROOT="0x$(openssl rand -hex 32)"
  TOTAL_BETS=$((RANDOM % 10000000000 + 1000000000))
  TOTAL_PAYOUTS=$((RANDOM % 5000000000 + 500000000))
  NUM_PLAYERS=$((RANDOM % 100 + 1))

  echo "[$TIMESTAMP] Snapshot #$COUNTER (nonce: $NONCE)"
  echo "  Round ID: $ROUND_ID | Players: $NUM_PLAYERS | Bets: $TOTAL_BETS wei"
  
  # Call the snapshotRound function with explicit nonce to avoid collisions
  RESULT=$(cast send "$SPACESHIP_PROXY_ADDRESS" \
    "snapshotRound(uint256,bytes32,bytes32,uint96,uint96,uint32)" \
    "$ROUND_ID" \
    "$SNAPSHOT_HASH" \
    "$PLAYERS_MERKLE_ROOT" \
    "$TOTAL_BETS" \
    "$TOTAL_PAYOUTS" \
    "$NUM_PLAYERS" \
    --rpc-url "$MAINNET_URL" \
    --private-key "$PRIVATE_KEY" \
    --gas-limit "$GAS_LIMIT" \
    --nonce "$NONCE" \
    --json 2>&1)

  TX_HASH=$(echo "$RESULT" | jq -r '.transactionHash // empty' 2>/dev/null)
  if [ -n "$TX_HASH" ] && [ "$TX_HASH" != "null" ]; then
    echo "  ✓ Success - TX: ${TX_HASH:0:20}..."
    NONCE=$((NONCE + 1))
  else
    echo "  ✗ Failed"
    echo "$RESULT"
    # Re-sync nonce from chain in case we're out of sync
    NONCE=$(cast nonce "$(cast wallet address --private-key "$PRIVATE_KEY")" --rpc-url "$MAINNET_URL")
    echo "  Re-synced nonce to: $NONCE"
  fi
  
  echo ""
  sleep $INTERVAL
done
