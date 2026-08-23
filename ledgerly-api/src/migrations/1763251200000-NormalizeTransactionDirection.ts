import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizeTransactionDirection1763251200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE dbo.transactions AS t
      SET type = c.type
      FROM dbo.categories AS c
      WHERE t."categoryId" = c.id
        AND (t.type IS NULL OR t.type = '' OR t.type NOT IN ('expense', 'income', 'savings', 'transfer'))
        AND c.type IN ('expense', 'income', 'savings')
    `);

    await queryRunner.query(`
      UPDATE dbo.transactions
      SET type = 'expense'
      WHERE type IS NULL OR type = '' OR type NOT IN ('expense', 'income', 'savings', 'transfer')
    `);
  }

  public async down(): Promise<void> {
    // Irreversible data normalization.
  }
}
