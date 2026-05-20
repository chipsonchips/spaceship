import type { Server, Socket } from 'socket.io';
import { sanitizeRound } from '../game-utils.js';
import { GameStateStore } from './game-state.store.js';
import { RoundRepository } from './round.repository.js';
import { BetHandler } from './bet-handler.service.js';
import { GameBroadcaster } from './game-broadcaster.service.js';
import { logger } from '../../utils/logger.js';

export function registerGameSocketHandlers(
  io: Server,
  state: GameStateStore,
  rounds: RoundRepository,
  bets: BetHandler,
  broadcaster: GameBroadcaster,
  encryptionSecret: string,
): void {
  io.on('connection', (socket: Socket) => {
    void sendInitialState(socket, state, rounds, encryptionSecret);

    socket.on(
      'PLACE_BET',
      async (data: {
        address: string;
        amount: number;
        chainId: number;
        useFreeBet?: boolean;
      }) => {
        try {
          await bets.placeBet(
            data.address,
            data.amount,
            data.chainId,
            data.useFreeBet || false,
          );
          socket.emit('BET_PLACED', { success: true });
          await broadcaster.emitStateWithFreshPlayers();
        } catch (err) {
          socket.emit('ERROR', { message: (err as Error).message });
        }
      },
    );

    socket.on('CASH_OUT', async (data: { betId: number; chainId: number }) => {
      try {
        await bets.cashOutById(data.betId, data.chainId);
        socket.emit('CASH_OUT_SUCCESS', { success: true });
        await broadcaster.emitStateWithFreshPlayers();
      } catch (err) {
        socket.emit('ERROR', { message: (err as Error).message });
      }
    });
  });
}

async function sendInitialState(
  socket: Socket,
  state: GameStateStore,
  rounds: RoundRepository,
  encryptionSecret: string,
): Promise<void> {
  try {
    const round =
      (await rounds.findLatestRoundWithPlayers()) ?? state.currentRound;
    const players =
      round && 'players' in round && Array.isArray(round.players)
        ? (round.players as never[])
        : state.players;

    const payload = round
      ? sanitizeRound({ ...round, players }, encryptionSecret)
      : null;

    socket.emit('GAME_STATE_UPDATE', payload);
  } catch (error) {
    logger.error('Failed to emit initial game state', { error });
    const fallback = state.currentRound
      ? sanitizeRound(
          { ...state.currentRound, players: state.players },
          encryptionSecret,
        )
      : null;
    socket.emit('GAME_STATE_UPDATE', fallback);
  }
}
