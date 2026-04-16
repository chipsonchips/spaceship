import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFreeBetsExpiration1738000004000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add free bets expiration column to users table
        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'freeBetsExpiresAt',
                type: 'timestamp',
                isNullable: true,
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('users', 'freeBetsExpiresAt');
    }
}
