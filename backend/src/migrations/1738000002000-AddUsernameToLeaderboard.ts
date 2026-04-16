import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUsernameToLeaderboard1738000002000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'leaderboard',
            new TableColumn({
                name: 'username',
                type: 'varchar',
                length: '255',
                isNullable: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('leaderboard', 'username');
    }
}
