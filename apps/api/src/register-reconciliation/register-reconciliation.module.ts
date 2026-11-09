import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { DatabaseModule, POSTGRES_DATABASE } from '../database/database.module';
import type { SqlDatabase } from '../database/postgres-database';
import { RegisterReconciliationController } from './register-reconciliation.controller';
import { RegisterReconciliationService } from './register-reconciliation-service';
import {
  secureRegisterReconciliationIdGenerator,
  systemRegisterReconciliationClock,
  UnconfiguredRegisterReconciliationStore,
  type RegisterReconciliationClock,
  type RegisterReconciliationIdGenerator,
  type RegisterReconciliationStore,
} from './register-reconciliation.types';
import { PostgresRegisterReconciliationStore } from './postgres-register-reconciliation-store';

export const REGISTER_RECONCILIATION_STORE = Symbol(
  'REGISTER_RECONCILIATION_STORE',
);
export const REGISTER_RECONCILIATION_CLOCK = Symbol(
  'REGISTER_RECONCILIATION_CLOCK',
);
export const REGISTER_RECONCILIATION_ID_GENERATOR = Symbol(
  'REGISTER_RECONCILIATION_ID_GENERATOR',
);

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [RegisterReconciliationController],
  providers: [
    {
      provide: REGISTER_RECONCILIATION_STORE,
      useFactory: (
        database: SqlDatabase | undefined,
      ): RegisterReconciliationStore =>
        database
          ? new PostgresRegisterReconciliationStore(database)
          : new UnconfiguredRegisterReconciliationStore(),
      inject: [POSTGRES_DATABASE],
    },
    {
      provide: REGISTER_RECONCILIATION_CLOCK,
      useValue: systemRegisterReconciliationClock,
    },
    {
      provide: REGISTER_RECONCILIATION_ID_GENERATOR,
      useValue: secureRegisterReconciliationIdGenerator,
    },
    {
      provide: RegisterReconciliationService,
      useFactory: (
        store: RegisterReconciliationStore,
        clock: RegisterReconciliationClock,
        idGenerator: RegisterReconciliationIdGenerator,
      ) => new RegisterReconciliationService({ store, clock, idGenerator }),
      inject: [
        REGISTER_RECONCILIATION_STORE,
        REGISTER_RECONCILIATION_CLOCK,
        REGISTER_RECONCILIATION_ID_GENERATOR,
      ],
    },
  ],
  exports: [RegisterReconciliationService],
})
export class RegisterReconciliationModule {}
