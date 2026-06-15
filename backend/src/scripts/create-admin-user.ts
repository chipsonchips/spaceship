import 'reflect-metadata';
import { AppDataSource } from '../config/database.js';
import { userService } from '../services/user.service.js';
import { logger } from '../utils/logger.js';

async function createAdminUser() {
    try {
        await AppDataSource.initialize();
        logger.info('Database connected');

        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@spaceship.local';

        // Check if admin already exists
        const existingAdmin = await userService.getAllAdmins();
        if (existingAdmin.length > 0) {
            logger.info('Admin user already exists');
            console.log('Existing admins:');
            existingAdmin.forEach(admin => {
                console.log(`- ${admin.username} (${admin.email})`);
            });
            process.exit(0);
        }

        // Create admin user
        const admin = await userService.createAdmin(
            null,
            adminEmail,
            adminUsername,
            ['read:admin', 'write:house', 'write:contract', 'manage:users', 'manage:free-bets']
        );

        logger.info('Admin user created successfully');
        console.log('\n✓ Admin user created:');
        console.log(`  Username: ${admin.username}`);
        console.log(`  Email: ${admin.email}`);
        console.log(`  ID: ${admin.id}`);
        console.log(`  Permissions: ${admin.permissions.join(', ')}`);

        process.exit(0);
    } catch (error) {
        logger.error('Failed to create admin user', { error: (error as Error).message });
        console.error('Error:', (error as Error).message);
        process.exit(1);
    }
}

createAdminUser();
