#!/usr/bin/env tsx
/**
 * Diagnostic script to check game state and identify issues
 * Run with: pnpm tsx backend/scripts/diagnose-game-state.ts
 */

import 'reflect-metadata';
import { AppDataSource } from '../src/config/database.js';
import { Round } from '../src/entities/round.entity.js';
import { PlayerBet } from '../src/entities/player-bet.entity.js';
import { GameSettings } from '../src/entities/game-settings.entity.js';

async function diagnose() {
    console.log('🔍 Starting game state diagnostics...\n');

    try {
        // Initialize database
        console.log('📊 Connecting to database...');
        await AppDataSource.initialize();
        console.log('✅ Database connected\n');

        // Check current round
        console.log('🎮 Checking current round...');
        const currentRound = await AppDataSource.getRepository(Round).findOne({
            where: {},
            relations: ['players'],
            order: { roundId: 'DESC' },
        });

        if (!currentRound) {
            console.log('❌ No rounds found in database');
            console.log('   This is likely the issue - game needs at least one round to start\n');
        } else {
            console.log(`✅ Current Round ID: ${currentRound.roundId}`);
            console.log(`   Phase: ${currentRound.phase}`);
            console.log(`   Start Time: ${new Date(currentRound.startTime).toISOString()}`);
            console.log(`   Fly Start Time: ${currentRound.flyStartTime ? new Date(currentRound.flyStartTime).toISOString() : 'N/A'}`);
            console.log(`   Current Multiplier: ${currentRound.currentMultiplier}`);
            console.log(`   Crash Multiplier: ${currentRound.crashMultiplier || 'N/A'}`);
            console.log(`   Total Bets: ${currentRound.totalBets}`);
            console.log(`   Total Payouts: ${currentRound.totalPayouts}`);
            console.log(`   Settled: ${currentRound.settled}\n`);

            // Check if round is stuck
            const now = Date.now();
            const roundAge = now - currentRound.startTime;
            const roundAgeSeconds = Math.floor(roundAge / 1000);

            if (currentRound.phase === 'BETTING' && roundAgeSeconds > 60) {
                console.log(`⚠️  WARNING: Round has been in BETTING phase for ${roundAgeSeconds} seconds`);
                console.log('   Expected: < 30 seconds');
                console.log('   This indicates the flying phase is not starting\n');
            }

            if (currentRound.phase === 'FLYING' && roundAgeSeconds > 120) {
                console.log(`⚠️  WARNING: Round has been in FLYING phase for ${roundAgeSeconds} seconds`);
                console.log('   Expected: < 60 seconds');
                console.log('   This indicates the crash is not happening\n');
            }

            if (currentRound.phase === 'CRASHED' && roundAgeSeconds > 60) {
                console.log(`⚠️  WARNING: Round has been in CRASHED phase for ${roundAgeSeconds} seconds`);
                console.log('   Expected: < 10 seconds');
                console.log('   This indicates a new round is not starting\n');
            }

            // Check bets
            const bets = await AppDataSource.getRepository(PlayerBet).find({
                where: { round: { id: currentRound.id } },
            });
            console.log(`   Active Bets: ${bets.length}`);
            console.log(`   Cashed Out: ${bets.filter(b => b.cashedOut).length}\n`);
        }

        // Check game settings
        console.log('⚙️  Checking game settings...');
        const settings = await AppDataSource.getRepository(GameSettings).findOne({
            where: {},
            order: { createdAt: 'ASC' },
        });

        if (!settings) {
            console.log('❌ No game settings found');
            console.log('   Creating default settings...');
            const newSettings = AppDataSource.getRepository(GameSettings).create({
                minBetAmount: 0.1,
                maxBetAmount: 10,
                bettingDurationMs: 30000,
                flyingDurationMs: 20000,
                roundRestartDelayMs: 5000,
                houseEdge: 0.03,
                minCrashMultiplier: 1.01,
                maxCrashMultiplier: 100.00,
            });
            await AppDataSource.getRepository(GameSettings).save(newSettings);
            console.log('✅ Default settings created\n');
        } else {
            console.log('✅ Game settings found');
            console.log(`   Betting Duration: ${settings.bettingDurationMs}ms (${settings.bettingDurationMs / 1000}s)`);
            console.log(`   Flying Duration: ${settings.flyingDurationMs}ms (${settings.flyingDurationMs / 1000}s)`);
            console.log(`   Round Restart Delay: ${settings.roundRestartDelayMs}ms (${settings.roundRestartDelayMs / 1000}s)`);
            console.log(`   House Edge: ${(settings.houseEdge * 100).toFixed(2)}%`);
            console.log(`   Min Crash: ${settings.minCrashMultiplier}x`);
            console.log(`   Max Crash: ${settings.maxCrashMultiplier}x\n`);
        }

        // Check recent rounds
        console.log('📜 Checking recent rounds...');
        const recentRounds = await AppDataSource.getRepository(Round).find({
            order: { roundId: 'DESC' },
            take: 5,
        });

        console.log(`   Found ${recentRounds.length} recent rounds:`);
        recentRounds.forEach((round, index) => {
            const age = Math.floor((Date.now() - round.startTime) / 1000);
            console.log(`   ${index + 1}. Round ${round.roundId}: ${round.phase} (${age}s ago) - Crash: ${round.crashMultiplier || 'N/A'}x`);
        });
        console.log();

        // Summary
        console.log('📋 Summary:');
        if (!currentRound) {
            console.log('❌ CRITICAL: No rounds exist - game cannot start');
            console.log('   Solution: Restart the backend server to create initial round\n');
        } else if (currentRound.phase === 'BETTING' && (Date.now() - currentRound.startTime) > 60000) {
            console.log('❌ CRITICAL: Round stuck in BETTING phase');
            console.log('   Possible causes:');
            console.log('   1. setTimeout not firing (check Node.js event loop)');
            console.log('   2. Database connection issues');
            console.log('   3. Error in startFlyingPhase method');
            console.log('   Solution: Check application logs for errors\n');
        } else if (currentRound.phase === 'FLYING' && (Date.now() - currentRound.startTime) > 120000) {
            console.log('❌ CRITICAL: Round stuck in FLYING phase');
            console.log('   Possible causes:');
            console.log('   1. setInterval not firing');
            console.log('   2. Crash condition never met');
            console.log('   3. Error in crashRound method');
            console.log('   Solution: Check application logs for errors\n');
        } else if (currentRound.phase === 'CRASHED' && (Date.now() - currentRound.startTime) > 60000) {
            console.log('❌ CRITICAL: Round stuck in CRASHED phase');
            console.log('   Possible causes:');
            console.log('   1. setTimeout for new round not firing');
            console.log('   2. Error in startNewRound method');
            console.log('   Solution: Check application logs for errors\n');
        } else {
            console.log('✅ Game state appears normal');
            console.log('   If you\'re still experiencing issues, check:');
            console.log('   1. WebSocket connections');
            console.log('   2. Frontend state management');
            console.log('   3. Network connectivity\n');
        }

    } catch (error) {
        console.error('❌ Error during diagnostics:', error);
        if (error instanceof Error) {
            console.error('   Message:', error.message);
            console.error('   Stack:', error.stack);
        }
    } finally {
        await AppDataSource.destroy();
        console.log('👋 Diagnostics complete');
    }
}

diagnose();
