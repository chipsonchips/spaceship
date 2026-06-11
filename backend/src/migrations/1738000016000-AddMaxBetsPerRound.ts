import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMaxBetsPerRound1738000016000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('game_settings');
        const column = table?.findColumnByName('maxBetsPerRound');

        if (!column) {
            await queryRunner.addColumn(
                'game_settings',
                new TableColumn({
                    name: 'maxBetsPerRound',
                    type: 'int',
                    default: 3,
                })
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('game_settings', 'maxBetsPerRound');
    }
}
