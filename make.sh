#!/bin/bash

# Load environment variables
set -a
source contracts/.env
set +a

INTERVAL=10
COUNTER=0

echo "================================================"
echo "Starting Celo Snapshot Writer Loop"
echo "Interval: ${INTERVAL} seconds"
echo "Press Ctrl+C to stop"
echo "================================================"
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

  echo "[$TIMESTAMP] Snapshot #$COUNTER"
  echo "  Round ID: $ROUND_ID | Players: $NUM_PLAYERS | Bets: $TOTAL_BETS wei"
  
  # Call the snapshotRound function
  RESULT=$(cast send "$AVIATOR_PROXY_ADDRESS" \
    "snapshotRound(uint256,bytes32,bytes32,uint96,uint96,uint32)" \
    "$ROUND_ID" \
    "$SNAPSHOT_HASH" \
    "$PLAYERS_MERKLE_ROOT" \
    "$TOTAL_BETS" \
    "$TOTAL_PAYOUTS" \
    "$NUM_PLAYERS" \
    --rpc-url "$MAINNET_URL" \
    --private-key "$PRIVATE_KEY" 2>&1)
  
  if echo "$RESULT" | grep -q "status.*1"; then
    TX_HASH=$(echo "$RESULT" | grep "transactionHash" | head -1 | awk '{print $2}')
    echo "  ✓ Success - TX: ${TX_HASH:0:20}..."
  else
    echo "  ✗ Failed"
    echo "$RESULT"
  fi
  
  echo ""
  sleep $INTERVAL
done
