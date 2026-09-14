import { Global, Module } from '@nestjs/common';

import {
  PostgresDatabase,
  postgresConnectionStringFromEnvironment,
  postgresRuntimeRoleFromEnvironment,
  type SqlDatabase,
} from './postgres-database';

export const POSTGRES_DATABASE = Symbol('POSTGRES_DATABASE');

/**
 * One process-wide database pool for all application adapters.
 *
 * The provider intentionally resolves to `undefined` when no runtime
 * connection string is configured.  That keeps the scaffold fail-closed in
 * local unit tests while allowing every feature module to select its typed
 * unconfigured adapter without creating a separate pool.
 */
@Global()
@Module({
  providers: [
    {
      provide: POSTGRES_DATABASE,
      useFactory: (): SqlDatabase | undefined => {
        const connectionString = postgresConnectionStringFromEnvironment();
        return connectionString
          ? new PostgresDatabase({
              connectionString,
              runtimeRole: postgresRuntimeRoleFromEnvironment(),
            })
          : undefined;
      },
    },
  ],
  exports: [POSTGRES_DATABASE],
})
export class DatabaseModule {}
