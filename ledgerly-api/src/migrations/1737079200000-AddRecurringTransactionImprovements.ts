import { MigrationInterface, QueryRunner, TableColumn, Table, TableForeignKey, TableIndex } from 'typeorm';

export class AddRecurringTransactionImprovements1737079200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add toAccountId column to recurring_transactions for transfer/savings support
    await queryRunner.addColumn(
      'dbo.recurring_transactions',
      new TableColumn({
        name: 'toAccountId',
        type: 'uuid',
        isNullable: true,
      })
    );

    // Create recurring_transaction_tags junction table
    await queryRunner.createTable(
      new Table({
        name: 'dbo.recurring_transaction_tags',
        columns: [
          {
            name: 'recurringTransactionId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tagId',
            type: 'uuid',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Add composite primary key on junction table
    await queryRunner.query(
      `ALTER TABLE "dbo"."recurring_transaction_tags" ADD CONSTRAINT "PK_recurring_transaction_tags" PRIMARY KEY ("recurringTransactionId", "tagId")`,
    );

    // Add indexes on junction table
    await queryRunner.createIndex(
      'dbo.recurring_transaction_tags',
      new TableIndex({
        name: 'IDX_RECURRING_TRANSACTION_TAGS_RECURRING_ID',
        columnNames: ['recurringTransactionId'],
      }),
    );

    await queryRunner.createIndex(
      'dbo.recurring_transaction_tags',
      new TableIndex({
        name: 'IDX_RECURRING_TRANSACTION_TAGS_TAG_ID',
        columnNames: ['tagId'],
      }),
    );

    // Add foreign keys on junction table
    await queryRunner.createForeignKey(
      'dbo.recurring_transaction_tags',
      new TableForeignKey({
        columnNames: ['recurringTransactionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'dbo.recurring_transactions',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'dbo.recurring_transaction_tags',
      new TableForeignKey({
        columnNames: ['tagId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'dbo.tags',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop junction table (will automatically drop foreign keys)
    await queryRunner.dropTable('dbo.recurring_transaction_tags', true);

    // Drop toAccountId column
    await queryRunner.dropColumn('dbo.recurring_transactions', 'toAccountId');
  }
}
