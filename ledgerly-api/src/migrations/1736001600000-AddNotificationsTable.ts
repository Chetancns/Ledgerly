import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddNotificationsTable1736001600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'dbo.notifications',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'isRead',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'dbo.notifications',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'dbo.users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add index on userId for faster queries
    await queryRunner.createIndex(
      'dbo.notifications',
      new TableIndex({
        name: 'IDX_notifications_userId',
        columnNames: ['userId'],
      }),
    );

    // Add index on isRead for filtering unread notifications
    await queryRunner.createIndex(
      'dbo.notifications',
      new TableIndex({
        name: 'IDX_notifications_isRead',
        columnNames: ['isRead'],
      }),
    );

    // Add composite index for common query pattern (userId + isRead)
    await queryRunner.createIndex(
      'dbo.notifications',
      new TableIndex({
        name: 'IDX_notifications_userId_isRead',
        columnNames: ['userId', 'isRead'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('dbo.notifications', 'IDX_notifications_userId_isRead');
    await queryRunner.dropIndex('dbo.notifications', 'IDX_notifications_isRead');
    await queryRunner.dropIndex('dbo.notifications', 'IDX_notifications_userId');

    // Drop table (foreign key is dropped automatically)
    await queryRunner.dropTable('dbo.notifications');
  }
}
