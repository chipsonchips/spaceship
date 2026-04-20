import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAutoCashout1738000005000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'player_bets',
            new TableColumn({
                name: 'autoCashoutMultiplier',
                type: 'numeric',
                precision: 10,
                scale: 4,
                isNullable: true,
                default: null,
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('player_bets', 'autoCashoutMultiplier');
    }
}
