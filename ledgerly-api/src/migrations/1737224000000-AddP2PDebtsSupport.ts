import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddP2PDebtsSupport1737224000000 implements MigrationInterface {
  name = 'AddP2PDebtsSupport1737224000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add debtType column to debts table
    await queryRunner.query(`
      ALTER TABLE "dbo"."debts" 
      ADD "debtType" character varying NOT NULL DEFAULT 'institutional'
    `);

    // Add personName column to debts table
    await queryRunner.query(`
      ALTER TABLE "dbo"."debts" 
      ADD "personName" character varying
    `);

    // Create person_names table
    await queryRunner.query(`
      CREATE TABLE "dbo"."person_names" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "name" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_person_names_id" PRIMARY KEY ("id")
      )
    `);

    // Create indexes on person_names
    await queryRunner.query(`
      CREATE INDEX "IDX_person_names_userId" ON "dbo"."person_names" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_person_names_name" ON "dbo"."person_names" ("name")
    `);

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "dbo"."person_names" 
      ADD CONSTRAINT "FK_person_names_user" 
      FOREIGN KEY ("userId") REFERENCES "dbo"."users"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Add check constraint for debtType
    await queryRunner.query(`
      ALTER TABLE "dbo"."debts" 
      ADD CONSTRAINT "CHK_debts_debtType" 
      CHECK ("debtType" IN ('institutional', 'borrowed', 'lent'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop check constraint
    await queryRunner.query(`
      ALTER TABLE "dbo"."debts" 
      DROP CONSTRAINT "CHK_debts_debtType"
    `);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "dbo"."person_names" 
      DROP CONSTRAINT "FK_person_names_user"
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX "dbo"."IDX_person_names_name"
    `);

    await queryRunner.query(`
      DROP INDEX "dbo"."IDX_person_names_userId"
    `);

    // Drop person_names table
    await queryRunner.query(`
      DROP TABLE "dbo"."person_names"
    `);

    // Drop columns from debts table
    await queryRunner.query(`
      ALTER TABLE "dbo"."debts" 
      DROP COLUMN "personName"
    `);

    await queryRunner.query(`
      ALTER TABLE "dbo"."debts" 
      DROP COLUMN "debtType"
    `);
  }
}
