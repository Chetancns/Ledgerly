import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotesToDebtUpdates1756600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dbo.debt_updates
      ADD COLUMN notes TEXT
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN dbo.debt_updates.notes IS 'Optional user-entered note for a payment (e.g. bank transfer reference)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE dbo.debt_updates
      DROP COLUMN IF EXISTS notes
    `);
  }
}
