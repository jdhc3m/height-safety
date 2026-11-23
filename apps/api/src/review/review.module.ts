import { Module } from '@nestjs/common';

import { AuthModule } from '../identity/auth.module';
import { DatabaseModule, POSTGRES_DATABASE } from '../database/database.module';
import type { SqlDatabase } from '../database/postgres-database';
import {
  LocalPrivatePhotoObjectStore,
  privatePhotoObjectRootFromEnvironment,
} from '../sync/private-photo-object-store';
import { ReviewController } from './review.controller';
import { ReviewService } from './review-service';
import {
  secureReviewIdGenerator,
  systemReviewClock,
  type AnchorHistoryReader,
  type PrivatePhotoObjectReader,
  type ReviewClock,
  type ReviewIdGenerator,
  type ReviewStore,
  type SubmittedEvidenceReader,
  type SubmittedPhotoMediaReader,
  UnconfiguredAnchorHistoryReader,
  UnconfiguredPrivatePhotoObjectReader,
  UnconfiguredReviewStore,
  UnconfiguredSubmittedEvidenceReader,
  UnconfiguredSubmittedPhotoMediaReader,
} from './review.types';
import { PostgresAnchorHistoryReader } from './postgres-anchor-history-reader';
import { PostgresReviewStore } from './postgres-review-store';
import { PostgresSubmittedEvidenceReader } from './postgres-submitted-evidence-reader';
import { PostgresSubmittedPhotoMediaReader } from './postgres-submitted-photo-media-reader';

export const REVIEW_STORE = Symbol('REVIEW_STORE');
export const REVIEW_CLOCK = Symbol('REVIEW_CLOCK');
export const REVIEW_ID_GENERATOR = Symbol('REVIEW_ID_GENERATOR');
export const SUBMITTED_EVIDENCE_READER = Symbol('SUBMITTED_EVIDENCE_READER');
export const ANCHOR_HISTORY_READER = Symbol('ANCHOR_HISTORY_READER');
export const SUBMITTED_PHOTO_MEDIA_READER = Symbol(
  'SUBMITTED_PHOTO_MEDIA_READER',
);
export const PRIVATE_PHOTO_OBJECT_READER = Symbol(
  'PRIVATE_PHOTO_OBJECT_READER',
);

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
    {
      provide: SUBMITTED_EVIDENCE_READER,
      useFactory: (
        database: SqlDatabase | undefined,
      ): SubmittedEvidenceReader =>
        database
          ? new PostgresSubmittedEvidenceReader(database)
          : new UnconfiguredSubmittedEvidenceReader(),
      inject: [POSTGRES_DATABASE],
    },
    {
      provide: ANCHOR_HISTORY_READER,
      useFactory: (database: SqlDatabase | undefined): AnchorHistoryReader =>
        database
          ? new PostgresAnchorHistoryReader(database)
          : new UnconfiguredAnchorHistoryReader(),
      inject: [POSTGRES_DATABASE],
    },
    {
      provide: SUBMITTED_PHOTO_MEDIA_READER,
      useFactory: (
        database: SqlDatabase | undefined,
      ): SubmittedPhotoMediaReader =>
        database
          ? new PostgresSubmittedPhotoMediaReader(database)
          : new UnconfiguredSubmittedPhotoMediaReader(),
      inject: [POSTGRES_DATABASE],
    },
    {
      provide: PRIVATE_PHOTO_OBJECT_READER,
      useFactory: (
        database: SqlDatabase | undefined,
      ): PrivatePhotoObjectReader =>
        database
          ? new LocalPrivatePhotoObjectStore(
              privatePhotoObjectRootFromEnvironment(),
            )
          : new UnconfiguredPrivatePhotoObjectReader(),
      inject: [POSTGRES_DATABASE],
    },
    { provide: REVIEW_CLOCK, useValue: systemReviewClock },
    { provide: REVIEW_ID_GENERATOR, useValue: secureReviewIdGenerator },
    {
      provide: ReviewService,
      useFactory: (
        store: ReviewStore,
        evidenceReader: SubmittedEvidenceReader,
        anchorHistoryReader: AnchorHistoryReader,
        photoMediaReader: SubmittedPhotoMediaReader,
        photoObjects: PrivatePhotoObjectReader,
        clock: ReviewClock,
        idGenerator: ReviewIdGenerator,
      ) =>
        new ReviewService({
          store,
          evidenceReader,
          anchorHistoryReader,
          photoMediaReader,
          photoObjects,
          clock,
          idGenerator,
        }),
      inject: [
        REVIEW_STORE,
        SUBMITTED_EVIDENCE_READER,
        ANCHOR_HISTORY_READER,
        SUBMITTED_PHOTO_MEDIA_READER,
        PRIVATE_PHOTO_OBJECT_READER,
        REVIEW_CLOCK,
        REVIEW_ID_GENERATOR,
      ],
    },
  ],
  exports: [ReviewService],
})
export class ReviewModule {}
