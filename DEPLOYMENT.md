# Deployment Guide - Aviator Game

This guide covers deploying the Aviator game to production across frontend, backend, and smart contracts.

## Prerequisites

- Accounts on: Vercel (frontend), Node.js hosting (backend), Base chain (contracts)
- Environment variables configured for production
- Domain/SSL certificates
- Database hosting (PostgreSQL)

## 1. Smart Contract Deployment

### Deploy AviatorGameUSDC to Base Mainnet

```bash
cd contracts

# Set environment variables
export PRIVATE_KEY=0x...  # Your deployer private key
export BASE_RPC_URL=https://mainnet.base.org

# Deploy contract
forge script script/Aviator.s.sol:AviatorGameUSDCScript \
  --rpc-url $BASE_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

# Verify on-chain (optional)
forge script script/Aviator.s.sol:AviatorGameUSDCScript \
  --rpc-url $BASE_RPC_URL \
  --verify

# Save deployed contract address
# Set as NEXT_PUBLIC_GAME_CONTRACT_ADDRESS and SERVER_OPERATOR_ADDRESS
```

### Setup Paymaster on Coinbase Developer Platform

1. Go to [Coinbase Developer Platform](https://www.coinbase.com/developer-platform)
2. Navigate to **Onchain Tools > Paymaster**
3. Create new paymaster project
4. Copy Paymaster Service URL
5. Add contract allowlist:
   - Function: `placeBet`
   - Function: `cashOut`
6. Create proxy endpoint for backend (see Backend section)

## 2. Backend Deployment

### Setup PostgreSQL Database (Supabase)

In Supabase Dashboard → **Project Settings → Database**:

1. Copy the **Session pooler** connection string (port **5432**, not direct IPv6-only host).
2. Set it on Railway as `DATABASE_URL` (the backend parses this automatically).

```bash
# Example (use your real password and project ref)
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-eu-north-1.pooler.supabase.com:5432/postgres
```

**Railway IPv6 note:** Railway cannot reach Supabase over IPv6 (`ENETUNREACH`). The backend forces IPv4 for DB connections. Use the **pooler** hostname (`*.pooler.supabase.com`), not the direct `db.*.supabase.co` host if you see IPv6 errors.

Do **not** set `DB_SYNCHRONIZE=true` in production. Migrations run automatically via `predeploy` and `start` scripts.

### Prepare Backend

```bash
cd backend

pnpm install
pnpm build
# Migrations run on deploy (predeploy + start)
```

### Deploy to Railway

| Setting | Value |
|---------|--------|
| Root directory | `backend` |
| Build command | `pnpm install && pnpm build` |
| Start command | `pnpm start` |
| Pre-deploy (optional) | `pnpm predeploy` — migrations only |

**Required Railway env vars:**

```
DATABASE_URL=postgresql://postgres.[ref]:[password]@[region].pooler.supabase.com:5432/postgres
NODE_ENV=production
DB_SYNCHRONIZE=false
PORT=3001
ENCRYPTION_SECRET=...
JWT_SECRET=...
BACKEND_PRIVATE_KEY=...
BASE_RPC_URL=https://mainnet.base.org
```

**Vercel frontend env vars** (Project → Settings → Environment Variables):

```
NEXT_PUBLIC_API_URL=https://aviator-backend-production-2306.up.railway.app
NEXT_PUBLIC_WS_URL=wss://aviator-backend-production-2306.up.railway.app
```

CORS already allows `https://aviator-sand.vercel.app`. Add more origins with `CORS_ORIGINS` (comma-separated) on Railway if needed.

**Game rounds:** No separate cron or script. When the server starts successfully, `GameEngine` creates and schedules rounds automatically after migrations complete.

### Deploy to Heroku (alternative)

```bash
heroku create aviator-game-api
heroku config:set -a aviator-game-api \
  DATABASE_URL=postgresql://... \
  BASE_RPC_URL=https://mainnet.base.org \
  USDC_TOKEN_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  SERVER_OPERATOR_ADDRESS=0x... \
  PORT=3001
git push heroku main
```

### Paymaster Proxy Endpoint

Create a secure proxy in your backend to protect Paymaster URL:

```typescript
// backend/src/routes/paymaster.ts
import express from 'express';

const router = express.Router();

router.post('/paymaster', async (req, res) => {
  const paymasterUrl = process.env.PAYMASTER_SERVICE_URL;
  
  if (!paymasterUrl) {
    return res.status(500).json({ error: 'Paymaster not configured' });
  }

  try {
    const response = await fetch(paymasterUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAYMASTER_API_KEY}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Paymaster request failed' });
  }
});

export default router;
```

Register in `index.ts`:
```typescript
import paymasterRouter from './routes/paymaster';
app.use('/api', paymasterRouter);
```

## 3. Frontend Deployment

### Environment Configuration

Create `.env.production`:
```env
NEXT_PUBLIC_BASE_CHAIN_ID=0x2105
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x<deployed-contract>
NEXT_PUBLIC_PAYMASTER_PROXY_URL=https://api.youromain.com/api/paymaster
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Or link to Git repo and auto-deploy on push
```

**Vercel Configuration (vercel.json):**
```json
{
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install",
  "outputDirectory": ".next",
  "env": {
    "NEXT_PUBLIC_BASE_CHAIN_ID": "@next_public_base_chain_id",
    "NEXT_PUBLIC_USDC_ADDRESS": "@next_public_usdc_address",
    "NEXT_PUBLIC_GAME_CONTRACT_ADDRESS": "@NEXT_PUBLIC_GAME_CONTRACT_ADDRESS",
    "NEXT_PUBLIC_PAYMASTER_PROXY_URL": "@next_public_paymaster_proxy_url",
    "NEXT_PUBLIC_WS_URL": "@next_public_ws_url"
  }
}
```

## 4. Domain & SSL Setup

### Setup HTTPS

```bash
# Using Let's Encrypt with Certbot
certbot certonly --standalone -d api.yourdomain.com

# Or use hosting provider's SSL
```

### Configure WebSocket

For WebSocket to work with WSS (secure):

**Nginx Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## 5. Health Checks & Monitoring

### Backend Health Endpoint

Add to backend:
```typescript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});
```

### Monitor Deployment

```bash
# Check backend health
curl https://api.yourdomain.com/health

# Check WebSocket
wscat -c wss://api.yourdomain.com

# View logs
heroku logs -a aviator-game-api --tail
```

## 6. Farcaster Frame Setup

### Register Miniapp

1. Go to [Farcaster Developers](https://developers.farcaster.xyz/)
2. Register your miniapp URL: `https://yourdomain.com`
3. Get Frame URL: `https://yourdomain.com/api/frame`

### Frame Metadata

Add to frontend `app/layout.tsx`:
```typescript
export const metadata = {
  title: 'Aviator Game',
  description: 'Play crash game on Base',
  openGraph: {
    title: 'Aviator Game',
    description: 'Real-time crash game with USDC',
    url: 'https://yourdomain.com',
    images: [{
      url: 'https://yourdomain.com/og-image.png',
      width: 1200,
      height: 630
    }]
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://yourdomain.com/frame-image.png',
    'fc:frame:button:1': 'Play Game',
    'fc:frame:button:1:action': 'launch_frame',
    'fc:frame:button:1:target': 'https://yourdomain.com'
  }
};
```

## 7. Security Checklist

- [ ] Private keys not exposed in code
- [ ] Database password not in git
- [ ] Paymaster API key protected
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] HTTPS enforced
- [ ] Environment variables in production
- [ ] Database backups configured
- [ ] Monitoring/alerts set up

## 8. Post-Deployment

### Verify Everything Works

```bash
# Test betting flow
curl -X POST https://api.yourdomain.com/api/rounds/1/bet \
  -H "Content-Type: application/json" \
  -d '{
    "playerAddress": "0x...",
    "amount": 1000000,
    "txHash": "0x..."
  }'

# Check game state
curl https://api.yourdomain.com/api/rounds/current

# Test WebSocket
wscat -c wss://api.yourdomain.com
```

### Setup Monitoring

```bash
# Use services like:
# - Datadog for logs
# - Sentry for errors
# - UptimeRobot for health checks
```

### Rollback Plan

```bash
# If issues arise:
# 1. Pause game via contract owner function
# 2. Revert to previous Vercel deployment
# 3. Check backend logs
# 4. Redeploy fixed version
```

## 9. Maintenance

### Regular Updates

```bash
# Weekly: Check for dependency updates
pnpm outdated

# Monthly: Update dependencies
pnpm update

# As needed: Security patches
pnpm audit fix
```

### Database Maintenance

```bash
# Regular backups
pg_dump aviator > backup-$(date +%Y%m%d).sql

# Monitor size
heroku pg:info

# Vacuum periodically
psql -d postgresql://... -c "VACUUM ANALYZE;"
```

## Support & Troubleshooting

### Common Issues

**Contract deployment fails:**
- Check deployer address has ETH for gas on Base
- Verify RPC URL is accessible
- Check private key is valid

**WebSocket connection fails:**
- Check CORS headers
- Verify WebSocket upgrade headers in proxy
- Check firewall allows WSS (port 443)

**Paymaster not working:**
- Verify allowlist includes contract and functions
- Check Paymaster service URL is correct
- Review API key/permissions

**Database connection fails:**
- Verify DATABASE_URL is correct
- Check network access to DB host
- Ensure credentials are correct

---

**Questions?** Check backend logs or contact DevOps team.
