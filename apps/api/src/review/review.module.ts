import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { DatabaseModule, POSTGRES_DATABASE } from '../database/database.module';
import type { SqlDatabase } from '../database/postgres-database';
import { ReviewController } from './review.controller';
import { ReviewService } from './review-service';
import {
  secureReviewIdGenerator,
  systemReviewClock,
  type ReviewClock,
  type ReviewIdGenerator,
  type ReviewStore,
  UnconfiguredReviewStore,
} from './review.types';
import { PostgresReviewStore } from './postgres-review-store';

export const REVIEW_STORE = Symbol('REVIEW_STORE');
export const REVIEW_CLOCK = Symbol('REVIEW_CLOCK');
export const REVIEW_ID_GENERATOR = Symbol('REVIEW_ID_GENERATOR');

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ReviewController],
  providers: [
    {
      provide: REVIEW_STORE,
      useFactory: (database: SqlDatabase | undefined): ReviewStore =>
        database
          ? new PostgresReviewStore(database)
          : new UnconfiguredReviewStore(),
      inject: [POSTGRES_DATABASE],
    },
    { provide: REVIEW_CLOCK, useValue: systemReviewClock },
    { provide: REVIEW_ID_GENERATOR, useValue: secureReviewIdGenerator },
    {
      provide: ReviewService,
      useFactory: (
        store: ReviewStore,
        clock: ReviewClock,
        idGenerator: ReviewIdGenerator,
      ) => new ReviewService({ store, clock, idGenerator }),
      inject: [REVIEW_STORE, REVIEW_CLOCK, REVIEW_ID_GENERATOR],
    },
  ],
  exports: [ReviewService],
})
export class ReviewModule {}
