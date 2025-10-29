import { DataSource, EntityManager, QueryRunner } from 'typeorm';

/**
 * Safely runs operations inside a SERIALIZABLE transaction.
 * Rolls back automatically if any step fails.
 */
export async function withTransaction<T>(
  dataSource: DataSource,
  runInTransaction: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  const queryRunner: QueryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction('SERIALIZABLE'); // 🧱 strictest consistency

  try {
    const result = await runInTransaction(queryRunner.manager);
    await queryRunner.commitTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
