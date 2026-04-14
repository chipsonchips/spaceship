import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddUserManagement1738000001000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create users table
        await queryRunner.createTable(
            new Table({
                name: 'users',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'address',
                        type: 'varchar',
                        length: '64',
                        isNullable: true,
                    },
                    {
                        name: 'farcasterId',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'email',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'username',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'displayName',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'bio',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'avatarUrl',
                        type: 'varchar',
                        length: '500',
                        isNullable: true,
                    },
                    {
                        name: 'farcasterUsername',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'role',
                        type: 'varchar',
                        length: '50',
                        default: "'player'",
                    },
                    {
                        name: 'permissions',
                        type: 'text',
                        default: "''",
                    },
                    {
                        name: 'source',
                        type: 'varchar',
                        length: '50',
                        default: "'wallet'",
                    },
                    {
                        name: 'isActive',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'isVerified',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'verificationToken',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'adminNotes',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'lastLoginAt',
                        type: 'bigint',
                        isNullable: true,
                    },
                    {
                        name: 'lastActivityAt',
                        type: 'bigint',
                        isNullable: true,
                    },
                    {
                        name: 'preferences',
                        type: 'text',
                        default: "'{}'",
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true
        );

        // Create admin_logs table
        await queryRunner.createTable(
            new Table({
                name: 'admin_logs',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'adminId',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'actionType',
                        type: 'varchar',
                        length: '100',
                    },
                    {
                        name: 'description',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'details',
                        type: 'text',
                        default: "'{}'",
                    },
                    {
                        name: 'ipAddress',
                        type: 'varchar',
                        length: '45',
                        isNullable: true,
                    },
                    {
                        name: 'chainId',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'success',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'errorMessage',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true
        );

        // Create foreign key for admin_logs
        await queryRunner.createForeignKey(
            'admin_logs',
            new TableForeignKey({
                columnNames: ['adminId'],
                referencedColumnNames: ['id'],
                referencedTableName: 'users',
                onDelete: 'SET NULL',
            })
        );

        // Create indexes
        await queryRunner.createIndex(
            'users',
            new TableIndex({
                columnNames: ['address'],
            })
        );

        await queryRunner.createIndex(
            'users',
            new TableIndex({
                columnNames: ['farcasterId'],
            })
        );

        await queryRunner.createIndex(
            'users',
            new TableIndex({
                columnNames: ['email'],
            })
        );

        await queryRunner.createIndex(
            'admin_logs',
            new TableIndex({
                columnNames: ['adminId', 'createdAt'],
            })
        );

        await queryRunner.createIndex(
            'admin_logs',
            new TableIndex({
                columnNames: ['actionType', 'createdAt'],
            })
        );

        await queryRunner.createIndex(
            'admin_logs',
            new TableIndex({
                columnNames: ['chainId'],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys
        const adminLogsTable = await queryRunner.getTable('admin_logs');
        const foreignKey = adminLogsTable?.foreignKeys.find(
            (fk) => fk.columnNames.indexOf('adminId') !== -1
        );
        if (foreignKey) {
            await queryRunner.dropForeignKey('admin_logs', foreignKey);
        }

        // Drop tables
        await queryRunner.dropTable('admin_logs');
        await queryRunner.dropTable('users');
    }
}
