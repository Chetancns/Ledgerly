import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1756568523385 implements MigrationInterface {
    name = 'Init1756568523385'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "dbo"."accounts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying(100) NOT NULL, "type" character varying(30) NOT NULL, "balance" numeric(12,2) NOT NULL DEFAULT '0', "currency" character varying(10) NOT NULL DEFAULT 'USD', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3aa23c0a6d107393e8b40e3e2a" ON "dbo"."accounts" ("userId") `);
        await queryRunner.query(`CREATE TABLE "dbo"."categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "name" character varying(100) NOT NULL, "type" character varying(20) NOT NULL, "icon" character varying(50), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_13e8b2a21988bec6fdcbb1fa74" ON "dbo"."categories" ("userId") `);
        await queryRunner.query(`CREATE TABLE "dbo"."transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "accountId" uuid, "categoryId" uuid, "amount" numeric(12,2) NOT NULL, "type" character varying(20) NOT NULL, "description" text, "transactionDate" date NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6bb58f2b6e30cb51a6504599f4" ON "dbo"."transactions" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_65a91cee6272cc0da149807869" ON "dbo"."transactions" ("transactionDate") `);
        await queryRunner.query(`CREATE TABLE "dbo"."budgets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "categoryId" uuid, "amount" numeric(12,2) NOT NULL, "period" character varying(20) NOT NULL, "startDate" date, "endDate" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9c8a51748f82387644b773da482" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_27e688ddf1ff3893b43065899f" ON "dbo"."budgets" ("userId") `);
        await queryRunner.query(`CREATE TABLE "dbo"."recurring_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "accountId" uuid, "categoryId" uuid, "amount" numeric(12,2) NOT NULL, "type" character varying(20) NOT NULL, "frequency" character varying(20) NOT NULL, "nextOccurrence" date NOT NULL, "description" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6485db3243762a54992dc0ce3b7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ab59c63725771bd11c6e1d719a" ON "dbo"."recurring_transactions" ("userId") `);
        await queryRunner.query(`CREATE TABLE "dbo"."users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100), "email" character varying(150) NOT NULL, "passwordHash" text NOT NULL, "currency" character varying(10) NOT NULL DEFAULT 'USD', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "dbo"."users" ("email") `);
        await queryRunner.query(`ALTER TABLE "dbo"."accounts" ADD CONSTRAINT "FK_3aa23c0a6d107393e8b40e3e2a6" FOREIGN KEY ("userId") REFERENCES "dbo"."dbo"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."categories" ADD CONSTRAINT "FK_13e8b2a21988bec6fdcbb1fa741" FOREIGN KEY ("userId") REFERENCES "dbo"."dbo"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."transactions" ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41" FOREIGN KEY ("userId") REFERENCES "dbo"."dbo"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."transactions" ADD CONSTRAINT "FK_26d8aec71ae9efbe468043cd2b9" FOREIGN KEY ("accountId") REFERENCES "dbo"."accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."transactions" ADD CONSTRAINT "FK_86e965e74f9cc66149cf6c90f64" FOREIGN KEY ("categoryId") REFERENCES "dbo"."categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."budgets" ADD CONSTRAINT "FK_27e688ddf1ff3893b43065899f9" FOREIGN KEY ("userId") REFERENCES "dbo"."dbo"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."budgets" ADD CONSTRAINT "FK_3ece6e1292b7a86ba82145775a7" FOREIGN KEY ("categoryId") REFERENCES "dbo"."categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."recurring_transactions" ADD CONSTRAINT "FK_ab59c63725771bd11c6e1d719a2" FOREIGN KEY ("userId") REFERENCES "dbo"."dbo"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."recurring_transactions" ADD CONSTRAINT "FK_5d1add5e7ab6d1578e71409fafa" FOREIGN KEY ("accountId") REFERENCES "dbo"."accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."recurring_transactions" ADD CONSTRAINT "FK_d7578f10f8eeaec6241f19dd6e4" FOREIGN KEY ("categoryId") REFERENCES "dbo"."categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dbo"."recurring_transactions" DROP CONSTRAINT "FK_d7578f10f8eeaec6241f19dd6e4"`);
        await queryRunner.query(`ALTER TABLE "dbo"."recurring_transactions" DROP CONSTRAINT "FK_5d1add5e7ab6d1578e71409fafa"`);
        await queryRunner.query(`ALTER TABLE "dbo"."recurring_transactions" DROP CONSTRAINT "FK_ab59c63725771bd11c6e1d719a2"`);
        await queryRunner.query(`ALTER TABLE "dbo"."budgets" DROP CONSTRAINT "FK_3ece6e1292b7a86ba82145775a7"`);
        await queryRunner.query(`ALTER TABLE "dbo"."budgets" DROP CONSTRAINT "FK_27e688ddf1ff3893b43065899f9"`);
        await queryRunner.query(`ALTER TABLE "dbo"."transactions" DROP CONSTRAINT "FK_86e965e74f9cc66149cf6c90f64"`);
        await queryRunner.query(`ALTER TABLE "dbo"."transactions" DROP CONSTRAINT "FK_26d8aec71ae9efbe468043cd2b9"`);
        await queryRunner.query(`ALTER TABLE "dbo"."transactions" DROP CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41"`);
        await queryRunner.query(`ALTER TABLE "dbo"."categories" DROP CONSTRAINT "FK_13e8b2a21988bec6fdcbb1fa741"`);
        await queryRunner.query(`ALTER TABLE "dbo"."accounts" DROP CONSTRAINT "FK_3aa23c0a6d107393e8b40e3e2a6"`);
        await queryRunner.query(`DROP INDEX "dbo"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "dbo"."users"`);
        await queryRunner.query(`DROP INDEX "dbo"."IDX_ab59c63725771bd11c6e1d719a"`);
        await queryRunner.query(`DROP TABLE "dbo"."recurring_transactions"`);
        await queryRunner.query(`DROP INDEX "dbo"."IDX_27e688ddf1ff3893b43065899f"`);
        await queryRunner.query(`DROP TABLE "dbo"."budgets"`);
        await queryRunner.query(`DROP INDEX "dbo"."IDX_65a91cee6272cc0da149807869"`);
        await queryRunner.query(`DROP INDEX "dbo"."IDX_6bb58f2b6e30cb51a6504599f4"`);
        await queryRunner.query(`DROP TABLE "dbo"."transactions"`);
        await queryRunner.query(`DROP INDEX "dbo"."IDX_13e8b2a21988bec6fdcbb1fa74"`);
        await queryRunner.query(`DROP TABLE "dbo"."categories"`);
        await queryRunner.query(`DROP INDEX "dbo"."IDX_3aa23c0a6d107393e8b40e3e2a"`);
        await queryRunner.query(`DROP TABLE "dbo"."accounts"`);
    }

}
