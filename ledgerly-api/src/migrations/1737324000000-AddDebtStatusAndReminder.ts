import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDebtStatusAndReminder1737324000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add status column with default 'active'
    await queryRunner.query(`
      ALTER TABLE dbo.debts 
      ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL
    `);

    // Add reminderDate column
    await queryRunner.query(`
      ALTER TABLE dbo.debts 
      ADD COLUMN "reminderDate" DATE
    `);

    // Update existing debts where balance is 0 to 'completed' status
    await queryRunner.query(`
      UPDATE dbo.debts 
      SET status = 'completed' 
      WHERE "currentBalance"::NUMERIC <= 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dbo.debts DROP COLUMN "reminderDate"
    `);
    
    await queryRunner.query(`
      ALTER TABLE dbo.debts DROP COLUMN status
    `);
  }
}
