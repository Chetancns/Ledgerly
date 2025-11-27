import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddAiInsightsTable1732630000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ai_insights',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'periodStart',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'periodEnd',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'fullAnalysis',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'sections',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'insightsSnapshot',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Add index for faster lookups by user and period
    await queryRunner.createIndex(
      'ai_insights',
      new TableIndex({
        name: 'IDX_AI_INSIGHTS_USER_PERIOD',
        columnNames: ['userId', 'periodStart', 'periodEnd'],
      }),
    );

    // Add index for monthly usage tracking
    await queryRunner.createIndex(
      'ai_insights',
      new TableIndex({
        name: 'IDX_AI_INSIGHTS_USER_CREATED',
        columnNames: ['userId', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ai_insights');
  }
}
