import { AppDataSource } from '../src/config/database';
import { User, UserRole, UserSource } from '../src/entities/user.entity';

async function main() {
    console.log('Initializing Database...');
    await AppDataSource.initialize();
    
    const userRepo = AppDataSource.getRepository(User);
    
    console.log('Deleting previous invalid "admin_user" accounts...');
    await userRepo.delete({ username: 'admin_user' });
    console.log('Invalid admin accounts deleted.');

    const targetAddress = "0x3E192d109d1dd323375Ac1Ed040f817918E82d63".toLowerCase();

    console.log(`Checking if target address exists: ${targetAddress}`);
    let admin = await userRepo.findOne({ where: { address: targetAddress } });

    if (admin) {
        console.log('User exists. Updating role to ADMIN...');
        admin.role = UserRole.ADMIN;
        admin.username = 'SuperAdmin';
        admin.displayName = 'SuperAdmin';
        admin.isActive = true;
        await userRepo.save(admin);
    } else {
        console.log('User does not exist. Creating new ADMIN user...');
        admin = userRepo.create({
            address: targetAddress,
            role: UserRole.ADMIN,
            username: 'SuperAdmin',
            displayName: 'SuperAdmin',
            isActive: true,
            isVerified: true,
            source: UserSource.WALLET,
            permissions: [],
            freeBetsRemaining: 0,
            freeBetMaxAmount: 0
        });
        await userRepo.save(admin);
    }

    console.log('Successfully provisioned admin wallet! You can now log in.');
    process.exit(0);
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
