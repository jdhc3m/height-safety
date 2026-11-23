import { Pool, type PoolClient } from 'pg';

export interface SqlResult<Row extends Record<string, unknown>> {
  readonly rows: readonly Row[];
  readonly rowCount: number | null;
}

export interface SqlTransaction {
  query<Row extends Record<string, unknown>>(
    text: string,
    values: readonly unknown[],
  ): Promise<SqlResult<Row>>;
}

export interface SqlDatabase {
  transaction<T>(work: (transaction: SqlTransaction) => Promise<T>): Promise<T>;
}

export interface PostgresDatabaseOptions {
  readonly connectionString: string;
  readonly runtimeRole?: string;
  readonly max?: number;
  readonly connectionTimeoutMillis?: number;
}

/**
 * Owns PostgreSQL connections and applies the database runtime role before
 * handing a transaction to an application adapter. The adapter must still
 * bind the company context inside that transaction.
 */
export class PostgresDatabase implements SqlDatabase {
  private readonly pool: Pool;
  private readonly runtimeRole: string;

  constructor(options: PostgresDatabaseOptions) {
    this.pool = new Pool({
      connectionString: options.connectionString,
      max: options.max ?? 10,
      connectionTimeoutMillis: options.connectionTimeoutMillis ?? 5_000,
    });
    this.runtimeRole = assertRoleIdentifier(
      options.runtimeRole ?? 'height_safety_runtime',
    );
  }

  async transaction<T>(
    work: (transaction: SqlTransaction) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL ROLE ${this.runtimeRole}`);
      const result = await work(createTransaction(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

function createTransaction(client: PoolClient): SqlTransaction {
  return {
    async query<Row extends Record<string, unknown>>(
      text: string,
      values: readonly unknown[],
    ): Promise<SqlResult<Row>> {
      return client.query<Row>(text, [...values]);
    },
  };
}

export function postgresConnectionStringFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const configured =
    environment.HEIGHT_SAFETY_POSTGRES_URL ?? environment.DATABASE_URL;
  const normalized = configured?.trim();
  return normalized || undefined;
}

export function postgresRuntimeRoleFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  return assertRoleIdentifier(
    environment.HEIGHT_SAFETY_POSTGRES_RUNTIME_ROLE ?? 'height_safety_runtime',
  );
}

function assertRoleIdentifier(value: string): string {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(value)) {
    throw new Error('PostgreSQL runtime role must be a safe identifier');
  }
  return value;
}
