# Free Bets System Setup Guide

## Overview

The free bets system allows new users to receive 2 free bets with a maximum amount of 0.1 USDC each when they first join the Aviator game. This feature includes:

- Automatic free bets allocation for new users
- Free bet tracking and management
- Admin controls to manage free bets
- UI display of free bets in the betting interface

## Database Setup

### 1. Run Migrations

The free bets system requires a new database migration. Run the following command:

```bash
cd backend
npm run migration:run
# or
pnpm migration:run
```

This will:
- Add `freeBetsRemaining` column to the `users` table (default: 2)
- Add `freeBetMaxAmount` column to the `users` table (default: 0.1)
- Create the `free_bets` table to track free bet usage

### 2. Verify Migration

Check that the migration was successful:

```bash
npm run migration:show
# or
pnpm migration:show
```

## Admin User Setup

### Create Admin User

Run the admin creation script:

```bash
cd backend
npm run script -- src/scripts/create-admin-user.ts
# or
pnpm script src/scripts/create-admin-user.ts
```

This will create an admin user with the following permissions:
- `read:admin` - Read admin data
- `write:house` - Manage house balance
- `write:contract` - Manage contract operations
- `manage:users` - Manage user accounts
- `manage:free-bets` - Manage free bets

The admin user credentials will be displayed in the console.

## Features

### 1. Automatic Free Bets for New Users

When a new user joins (either via wallet or Farcaster):
- They automatically receive 2 free bets
- Each free bet has a maximum amount of 0.1 USDC
- Free bets are tracked in the `free_bets` table

### 2. Frontend UI

The BetControls component now displays:
- **Free Bets Counter**: Shows remaining free bets in the top bar
- **Free Bet Toggle**: Checkbox to use a free bet instead of wallet balance
- **Free Bet Validation**: Prevents betting more than the free bet max amount
- **Dynamic Bet Buttons**: Disables preset amounts that exceed free bet max

### 3. Backend API Endpoints

#### Get Free Bets Info
```
GET /api/free-bets/user/:userId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "freeBetsRemaining": 2,
  "freeBetMaxAmount": 0.1
}
```

#### Get Free Bet History
```
GET /api/free-bets/history/:userId?limit=50
Authorization: Bearer <token>

Response:
{
  "success": true,
  "history": [
    {
      "id": "uuid",
      "userId": "uuid",
      "roundId": 123,
      "amount": 0.1,
      "used": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Add Free Bets (Admin Only)
```
POST /api/free-bets/admin/add
Authorization: Bearer <admin_token>

Body:
{
  "userId": "user-uuid",
  "count": 5
}

Response:
{
  "success": true,
  "message": "Added 5 free bets to user",
  "freeBetsRemaining": 7
}
```

#### Set Free Bets (Admin Only)
```
POST /api/free-bets/admin/set
Authorization: Bearer <admin_token>

Body:
{
  "userId": "user-uuid",
  "count": 3
}

Response:
{
  "success": true,
  "message": "Set free bets for user to 3",
  "freeBetsRemaining": 3
}
```

#### Set Free Bet Max Amount (Admin Only)
```
POST /api/free-bets/admin/set-max-amount
Authorization: Bearer <admin_token>

Body:
{
  "userId": "user-uuid",
  "maxAmount": 0.5
}

Response:
{
  "success": true,
  "message": "Set free bet max amount to 0.5",
  "freeBetMaxAmount": 0.5
}
```

#### Get Users with Free Bets (Admin Only)
```
GET /api/free-bets/admin/users-with-free-bets
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "address": "0x...",
      "username": "player1",
      "freeBetsRemaining": 2,
      "freeBetMaxAmount": 0.1,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## How It Works

### User Flow

1. **New User Joins**
   - User connects wallet or Farcaster
   - `UserService.getOrCreatePlayerFromWallet()` or `getOrCreatePlayerFromFarcaster()` is called
   - User is created with `freeBetsRemaining: 2` and `freeBetMaxAmount: 0.1`

2. **User Places Bet**
   - User can choose to use a free bet or wallet balance
   - If using free bet:
     - `FreeBetService.useFreeBet()` is called
     - Free bet record is created in `free_bets` table
     - `freeBetsRemaining` is decremented
     - Bet is placed without requiring on-chain transaction
   - If using wallet balance:
     - Normal bet flow with on-chain transaction

3. **Admin Management**
   - Admin can view users with free bets
   - Admin can add/set free bets for specific users
   - Admin can adjust free bet max amount
   - All actions are logged in `admin_logs` table

### Database Schema

#### Users Table (Updated)
```sql
ALTER TABLE users ADD COLUMN freeBetsRemaining INT DEFAULT 2;
ALTER TABLE users ADD COLUMN freeBetMaxAmount NUMERIC(10,4) DEFAULT 0.1;
```

#### Free Bets Table (New)
```sql
CREATE TABLE free_bets (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roundId BIGINT REFERENCES rounds(roundId) ON DELETE CASCADE,
  amount NUMERIC(10,4) NOT NULL,
  txHash VARCHAR(128),
  used BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (userId, createdAt),
  INDEX (roundId)
);
```

## Configuration

### Environment Variables

No new environment variables are required. The system uses default values:
- Default free bets per new user: 2
- Default free bet max amount: 0.1 USDC

To change these defaults, modify the User entity:

```typescript
// backend/src/entities/user.entity.ts
@Column({ type: 'int', default: 2 })
freeBetsRemaining!: number;

@Column({ type: 'numeric', precision: 10, scale: 4, default: 0.1 })
freeBetMaxAmount!: number;
```

## Testing

### Manual Testing

1. **Create a new user**
   - Connect wallet or Farcaster
   - Verify free bets appear in UI

2. **Place a free bet**
   - Check the "Use Free Bet" checkbox
   - Place a bet
   - Verify free bets counter decrements

3. **Admin operations**
   - Use admin endpoints to add/set free bets
   - Verify changes in database

### API Testing

Use curl or Postman to test endpoints:

```bash
# Get free bets info
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/free-bets/user/<user-id>

# Add free bets (admin)
curl -X POST \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"userId": "<user-id>", "count": 5}' \
  http://localhost:3001/api/free-bets/admin/add
```

## Troubleshooting

### Free bets not showing in UI
- Verify user was created after migration
- Check browser console for API errors
- Verify `/api/users/address/:address` endpoint returns user ID

### Free bet placement fails
- Check that user has remaining free bets
- Verify bet amount doesn't exceed `freeBetMaxAmount`
- Check backend logs for errors

### Admin endpoints return 401
- Verify admin user was created
- Check that authentication token is valid
- Verify admin has required permissions

## Future Enhancements

Potential improvements:
- Expiration dates for free bets
- Different free bet amounts based on user source (wallet vs Farcaster)
- Promotional free bets campaigns
- Free bet bonus multipliers
- Free bet leaderboard tracking
