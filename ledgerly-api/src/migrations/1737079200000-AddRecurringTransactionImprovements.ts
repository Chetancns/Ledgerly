import { MigrationInterface, QueryRunner, TableColumn, Table, TableForeignKey } from 'typeorm';

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
            isPrimary: true,
          },
          {
            name: 'tagId',
            type: 'uuid',
            isPrimary: true,
          },
        ],
      }),
      true
    );

    // Add foreign key for recurringTransactionId
    await queryRunner.createForeignKey(
      'dbo.recurring_transaction_tags',
      new TableForeignKey({
        columnNames: ['recurringTransactionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'dbo.recurring_transactions',
        onDelete: 'CASCADE',
      })
    );

    // Add foreign key for tagId
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
    await queryRunner.dropTable('dbo.recurring_transaction_tags');

    // Drop toAccountId column
    await queryRunner.dropColumn('dbo.recurring_transactions', 'toAccountId');
  }
}
