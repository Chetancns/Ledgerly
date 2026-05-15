import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDebtUpdateIntentAndNotes1763238000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dbo.debt_updates
      ADD COLUMN intent VARCHAR(20) NOT NULL DEFAULT 'payment'
    `);

    await queryRunner.query(`
      ALTER TABLE dbo.debt_updates
      ADD COLUMN note TEXT
    `);

    await queryRunner.query(`
      ALTER TABLE dbo.debt_updates
      ADD CONSTRAINT CHK_debt_updates_intent
      CHECK (intent IN ('payment', 'promise', 'reminder', 'note'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dbo.debt_updates
      DROP CONSTRAINT CHK_debt_updates_intent
    `);

    await queryRunner.query(`
      ALTER TABLE dbo.debt_updates
      DROP COLUMN note
    `);

    await queryRunner.query(`
      ALTER TABLE dbo.debt_updates
      DROP COLUMN intent
    `);
  }
}
