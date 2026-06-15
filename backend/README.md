# Spaceship Backend — Database & Dev Setup

## Environment

Copy `.env.example` to `.env` and set your DB values:

DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=spaceship_dev
DB_SYNCHRONIZE=true
DB_LOGGING=false

## Useful scripts

- pnpm dev — start dev server with ts-node-dev
- pnpm db:sync — run schema sync (development only)
- pnpm db:migrate — run pending migrations
- pnpm db:seed — run seed to create an initial round
- pnpm test — run unit/integration tests (vitest + supertest)

## Notes

- For development `DB_SYNCHRONIZE=true` is convenient. For production **use migrations** (see `pnpm db:migrate`) and set `DB_SYNCHRONIZE=false`.
- The game engine persists rounds, bets, leaderboard and history to Postgres via TypeORM with clear separation: `services/*` contain domain logic.
