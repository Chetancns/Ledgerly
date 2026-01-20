import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDebtsForFlexiblePayments1737230000000 implements MigrationInterface {
  name = 'UpdateDebtsForFlexiblePayments1737230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make installmentAmount nullable for P2P debts with flexible payments
    await queryRunner.query(`
      ALTER TABLE "dbo"."debts" 
      ALTER COLUMN "installmentAmount" DROP NOT NULL
    `);

    // Make frequency nullable for P2P debts
    await queryRunner.query(`
      ALTER TABLE "dbo"."debts" 
      ALTER COLUMN "frequency" DROP NOT NULL
    `);

    // Make nextDueDate nullable for P2P debts
    await queryRunner.query(`
      ALTER TABLE "dbo"."debts" 
      ALTER COLUMN "nextDueDate" DROP NOT NULL
    `);

    // Add amount column to debt_updates to track payment amounts
    await queryRunner.query(`
      ALTER TABLE "dbo"."debt_updates" 
      ADD "amount" NUMERIC(12, 2) NOT NULL DEFAULT 0
    `);

    // Update existing debt_updates with amount from their debt's installmentAmount
    await queryRunner.query(`
      UPDATE "dbo"."debt_updates" du
      SET amount = COALESCE(
        (SELECT d."installmentAmount" FROM "dbo"."debts" d WHERE d.id = du."debtId"),
        0
      )
      WHERE du.amount = 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove amount column from debt_updates
    await queryRunner.query(`
      ALTER TABLE "dbo"."debt_updates" 
      DROP COLUMN "amount"
    `);

    // Make nextDueDate required again
    await queryRunner.query(`
      ALTER TABLE "dbo"."debts" 
      ALTER COLUMN "nextDueDate" SET NOT NULL
    `);

    // Make frequency required again
    await queryRunner.query(`
      ALTER TABLE "dbo"."debts" 
      ALTER COLUMN "frequency" SET NOT NULL
    `);

    // Make installmentAmount required again
    await queryRunner.query(`
      ALTER TABLE "dbo"."debts" 
      ALTER COLUMN "installmentAmount" SET NOT NULL
    `);
  }
}
