import { AppDataSource } from '../config/database';
import { userService } from '../services/user.service';
import { logger } from '../utils/logger';
import { generateSecureToken } from '../utils/auth';

/**
 * Bootstrap script to create the first admin user
 * Usage: npx ts-node src/scripts/create-admin.ts <username> [address] [email]
 * 
 * Example:
 * npx ts-node src/scripts/create-admin.ts admin_user 0x1234... admin@example.com
 */
async function createAdminUser() {
    try {
        // Initialize database connection
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const args = process.argv.slice(2);

        if (args.length === 0) {
            console.error('Usage: npx ts-node src/scripts/create-admin.ts <username> [address] [email]');
            console.error('Example: npx ts-node src/scripts/create-admin.ts admin_user 0x1234... admin@example.com');
            process.exit(1);
        }

        const username = args[0];
        const address = args[1] || null;
        const email = args[2] || null;

        // Default permissions for admin
        const permissions = [
            'read:audit',
            'write:house',
            'write:contract',
            'manage:users',
            'manage:admins',
        ];

        console.log(`Creating admin user: ${username}`);
        console.log(`Address: ${address || 'N/A'}`);
        console.log(`Email: ${email || 'N/A'}`);
        console.log(`Permissions: ${permissions.join(', ')}`);

        const admin = await userService.createAdmin(address, email, username, permissions);

        // Generate a secure admin secret
        const adminSecret = generateSecureToken(32);

        console.log('\n✅ Admin user created successfully!');
        console.log(`ID: ${admin.id}`);
        console.log(`Username: ${admin.username}`);
        console.log(`Role: ${admin.role}`);
        console.log(`Permissions: ${admin.permissions.join(', ')}`);
        console.log('\n🔐 Admin Secret (save this securely):');
        console.log(`${adminSecret}`);
        console.log('\n📝 Add this to your .env file:');
        console.log(`ADMIN_SECRET=${adminSecret}`);

        process.exit(0);
    } catch (error) {
        logger.error('Failed to create admin user', { error: (error as Error).message });
        console.error('Error:', (error as Error).message);
        process.exit(1);
    }
}

createAdminUser();
