import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTransactionStatus1735948800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add status column with default value 'posted'
    await queryRunner.addColumn(
      'dbo.transactions',
      new TableColumn({
        name: 'status',
        type: 'varchar',
        length: '20',
        default: "'posted'",
        isNullable: false,
      }),
    );

    // Add expectedPostDate column (nullable)
    await queryRunner.addColumn(
      'dbo.transactions',
      new TableColumn({
        name: 'expectedPostDate',
        type: 'date',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the columns in reverse order
    await queryRunner.dropColumn('dbo.transactions', 'expectedPostDate');
    await queryRunner.dropColumn('dbo.transactions', 'status');
  }
}
