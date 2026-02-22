import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotesToDebtUpdates1756600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dbo"."debt_updates" ADD COLUMN IF NOT EXISTS "notes" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "dbo"."debt_updates" DROP COLUMN IF EXISTS "notes"`,
    );
  }
}
