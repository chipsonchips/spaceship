import 'reflect-metadata';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/user.entity.js';
import { logger } from '../utils/logger.js';

async function seedFreeBets() {
    try {
        await AppDataSource.initialize();
        logger.info('Database connected');

        const userRepo = AppDataSource.getRepository(User);

        // Get all users
        const users = await userRepo.find();
        logger.info(`Found ${users.length} users to seed`);

        if (users.length === 0) {
            logger.info('No users found to seed');
            process.exit(0);
        }

        let updatedCount = 0;

        // Calculate expiration date (30 days from now)
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 30);

        // Update each user with free bets
        for (const user of users) {
            user.freeBetsRemaining = 2;
            user.freeBetMaxAmount = 0.1;
            user.freeBetsExpiresAt = expirationDate;
            await userRepo.save(user);
            updatedCount++;
        }

        logger.info(`Successfully seeded free bets for ${updatedCount} users`);
        console.log(`\n✓ Seeded ${updatedCount} users with:`);
        console.log(`  - Free Bets: 2`);
        console.log(`  - Max Amount per Bet: 0.1 USDC`);
        console.log(`  - Expires: ${expirationDate.toISOString()}`);

        process.exit(0);
    } catch (error) {
        logger.error('Failed to seed free bets', { error: (error as Error).message });
        console.error('Error:', (error as Error).message);
        process.exit(1);
    }
}

seedFreeBets();
