import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddTagsAndTransactionTags1735431600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tags table
    await queryRunner.createTable(
      new Table({
        name: 'dbo.tags',
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
            name: 'name',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'normalizedName',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '20',
            default: "'#3B82F6'",
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isDeleted',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add indexes on tags table
    await queryRunner.createIndex(
      'dbo.tags',
      new TableIndex({
        name: 'IDX_TAGS_USER_ID',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'dbo.tags',
      new TableIndex({
        name: 'IDX_TAGS_NAME',
        columnNames: ['name'],
      }),
    );

    await queryRunner.createIndex(
      'dbo.tags',
      new TableIndex({
        name: 'IDX_TAGS_NORMALIZED_NAME',
        columnNames: ['normalizedName'],
      }),
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'dbo.tags',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'dbo.users',
        onDelete: 'CASCADE',
      }),
    );

    // Create transaction_tags junction table
    await queryRunner.createTable(
      new Table({
        name: 'dbo.transaction_tags',
        columns: [
          {
            name: 'transactionId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tagId',
            type: 'uuid',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Add composite primary key on junction table
    await queryRunner.query(
      `ALTER TABLE "dbo"."transaction_tags" ADD CONSTRAINT "PK_transaction_tags" PRIMARY KEY ("transactionId", "tagId")`,
    );

    // Add indexes on junction table
    await queryRunner.createIndex(
      'dbo.transaction_tags',
      new TableIndex({
        name: 'IDX_TRANSACTION_TAGS_TRANSACTION_ID',
        columnNames: ['transactionId'],
      }),
    );

    await queryRunner.createIndex(
      'dbo.transaction_tags',
      new TableIndex({
        name: 'IDX_TRANSACTION_TAGS_TAG_ID',
        columnNames: ['tagId'],
      }),
    );

    // Add foreign keys on junction table
    await queryRunner.createForeignKey(
      'dbo.transaction_tags',
      new TableForeignKey({
        columnNames: ['transactionId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'dbo.transactions',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'dbo.transaction_tags',
      new TableForeignKey({
        columnNames: ['tagId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'dbo.tags',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop junction table first
    await queryRunner.dropTable('dbo.transaction_tags', true);

    // Drop tags table
    await queryRunner.dropTable('dbo.tags', true);
  }
}
