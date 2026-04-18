import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddChainIdToBet1738000006000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'player_bets',
            new TableColumn({
                name: 'chainId',
                type: 'integer',
                isNullable: true,
                default: null,
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('player_bets', 'chainId');
    }
}
