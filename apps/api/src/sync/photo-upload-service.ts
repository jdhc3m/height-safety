import { timingSafeEqual } from 'node:crypto';

import {
  createTenantContext,
  setTenantContextStatement,
} from '../database/tenant-context';
import type {
  SqlDatabase,
  SqlTransaction,
} from '../database/postgres-database';
import type { AuthPrincipal } from '../identity/auth.types';
import {
  PhotoObjectOffsetError,
  type PhotoObjectStore,
} from './private-photo-object-store';
import { PhotoUploadFailure } from './sync.types';
import type { PhotoUploadChunkDto } from './sync.dto';

interface PhotoRow extends Record<string, unknown> {
  readonly local_id: unknown;
  readonly anchor_inspection_id: unknown;
  readonly upload_state: unknown;
  readonly object_key: unknown;
  readonly content_type: unknown;
  readonly byte_size: unknown;
  readonly sha256: unknown;
  readonly inspector_user_id: unknown;
}

export interface PhotoUploadResult {
  readonly mediaId: string;
  readonly nextOffset: number;
  readonly uploaded: boolean;
}

export interface PhotoUploadServiceLike {
  uploadChunk(
    principal: AuthPrincipal,
    mediaId: string,
    input: PhotoUploadChunkDto,
    recovery?: boolean,
  ): Promise<PhotoUploadResult>;
}

export const PHOTO_UPLOAD_SERVICE = Symbol('PHOTO_UPLOAD_SERVICE');

function firstRow<Row extends Record<string, unknown>>(result: {
  readonly rows: readonly Row[];
}): Row | undefined {
  return result.rows[0];
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new PhotoUploadFailure(
      'PERSISTENCE_UNAVAILABLE',
      `photo persistence returned invalid ${field}`,
    );
  }
  return value;
}

function asNumber(value: unknown, field: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new PhotoUploadFailure(
      'PERSISTENCE_UNAVAILABLE',
      `photo persistence returned invalid ${field}`,
    );
  }
  return number;
}

function equalChecksum(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, 'utf8');
  const rightBytes = Buffer.from(right, 'utf8');
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

/** Application-owned resumable photo transport backed by private local files. */
export class PhotoUploadService implements PhotoUploadServiceLike {
  constructor(
    private readonly database: SqlDatabase,
    private readonly objects: PhotoObjectStore,
  ) {}

  async uploadChunk(
    principal: AuthPrincipal,
    mediaId: string,
    input: PhotoUploadChunkDto,
    recovery = false,
  ): Promise<PhotoUploadResult> {
    this.assertRole(principal, recovery);
    const bytes = decodeChunk(input.bytesBase64);
    if (input.mediaId !== mediaId || input.localId !== mediaId) {
      throw new PhotoUploadFailure(
        'INVALID_INPUT',
        'photo media identity does not match the request path',
      );
    }
    if (bytes.byteLength === 0 || bytes.byteLength > 512 * 1024) {
      throw new PhotoUploadFailure(
        'INVALID_INPUT',
        'photo chunk size is invalid',
      );
    }
    if (input.offset + bytes.byteLength > input.totalBytes) {
      throw new PhotoUploadFailure(
        'INVALID_INPUT',
        'photo chunk exceeds total size',
      );
    }

    return this.withTenant(principal.companyId, async (transaction) => {
      const result = await transaction.query<PhotoRow>(
        `
          SELECT p.local_id, p.anchor_inspection_id, p.upload_state,
                 o.object_key, o.content_type, o.byte_size, o.sha256,
                 i.inspector_user_id
          FROM photos p
          JOIN object_references o
            ON o.company_id = p.company_id AND o.object_id = p.object_id
          JOIN anchor_inspections ai
            ON ai.company_id = p.company_id
           AND ai.anchor_inspection_id = p.anchor_inspection_id
          JOIN inspections i
            ON i.company_id = ai.company_id AND i.inspection_id = ai.inspection_id
          WHERE p.company_id = $1 AND p.local_id = $2
          FOR UPDATE
        `,
        [principal.companyId, mediaId],
      );
      const row = firstRow(result);
      if (!row) {
        throw new PhotoUploadFailure('NOT_FOUND', 'photo upload was not found');
      }
      const localId = asString(row.local_id, 'local_id');
      const objectKey = asString(row.object_key, 'object_key');
      const expectedContentType = asString(row.content_type, 'content_type');
      const expectedBytes = asNumber(row.byte_size, 'byte_size');
      const expectedChecksum = asString(row.sha256, 'sha256');
      const inspectorUserId = asString(
        row.inspector_user_id,
        'inspector_user_id',
      );
      if (!recovery && inspectorUserId !== principal.userId) {
        throw new PhotoUploadFailure(
          'ROLE_FORBIDDEN',
          'photo upload is restricted to the submitting inspector',
        );
      }
      if (
        input.checksum !== expectedChecksum ||
        input.totalBytes !== expectedBytes ||
        (input.contentType ?? 'application/octet-stream') !==
          expectedContentType
      ) {
        throw new PhotoUploadFailure(
          'CONFLICT',
          'photo upload metadata does not match frozen evidence',
        );
      }
      if (row.upload_state === 'uploaded') {
        return { mediaId: localId, nextOffset: expectedBytes, uploaded: true };
      }
      if (expectedBytes <= 0) {
        throw new PhotoUploadFailure(
          'CONFLICT',
          'photo upload has no recorded content size',
        );
      }

      const durableOffset = await this.objects.size(objectKey);
      if (durableOffset !== input.offset) {
        throw new PhotoUploadFailure(
          'CONFLICT',
          `photo upload offset is ${durableOffset}, not ${input.offset}`,
        );
      }
      let nextOffset: number;
      try {
        nextOffset = await this.objects.writeChunk(
          objectKey,
          input.offset,
          bytes,
        );
      } catch (error) {
        if (error instanceof PhotoObjectOffsetError) {
          throw new PhotoUploadFailure(
            'CONFLICT',
            `photo upload offset is ${error.currentOffset}, not ${input.offset}`,
          );
        }
        throw error;
      }
      if (nextOffset > expectedBytes) {
        throw new PhotoUploadFailure(
          'CONFLICT',
          'photo object exceeds recorded size',
        );
      }
      if (nextOffset === expectedBytes) {
        const checksum = await this.objects.sha256(objectKey);
        if (!equalChecksum(checksum, expectedChecksum)) {
          await transaction.query(
            `UPDATE photos SET upload_state = 'failed' WHERE company_id = $1 AND local_id = $2`,
            [principal.companyId, mediaId],
          );
          throw new PhotoUploadFailure(
            'CONFLICT',
            'photo object checksum does not match frozen evidence',
          );
        }
        await transaction.query(
          `UPDATE photos SET upload_state = 'uploaded' WHERE company_id = $1 AND local_id = $2`,
          [principal.companyId, mediaId],
        );
        return { mediaId: localId, nextOffset, uploaded: true };
      }
      return { mediaId: localId, nextOffset, uploaded: false };
    });
  }

  private assertRole(principal: AuthPrincipal, recovery: boolean): void {
    if (recovery) {
      if (principal.role !== 'administrator' || !principal.mfaSatisfied) {
        throw new PhotoUploadFailure(
          'ROLE_FORBIDDEN',
          'Administrator MFA is required for evidence recovery upload',
        );
      }
      return;
    }
    if (principal.role !== 'inspector') {
      throw new PhotoUploadFailure(
        'ROLE_FORBIDDEN',
        'Inspector role is required',
      );
    }
  }

  private async withTenant<T>(
    companyId: string,
    work: (transaction: SqlTransaction) => Promise<T>,
  ): Promise<T> {
    let context;
    try {
      context = createTenantContext(companyId);
    } catch {
      throw new PhotoUploadFailure(
        'INVALID_INPUT',
        'companyId must be a stable lowercase opaque identifier',
      );
    }
    try {
      return await this.database.transaction(async (transaction) => {
        const statement = setTenantContextStatement(context);
        await transaction.query(statement.text, statement.values);
        return work(transaction);
      });
    } catch (error) {
      if (error instanceof PhotoUploadFailure) throw error;
      throw new PhotoUploadFailure(
        'PERSISTENCE_UNAVAILABLE',
        'photo upload persistence is unavailable',
      );
    }
  }
}

export class UnconfiguredPhotoUploadService implements PhotoUploadServiceLike {
  async uploadChunk(): Promise<never> {
    throw new PhotoUploadFailure(
      'PERSISTENCE_UNAVAILABLE',
      'photo upload transport is not configured',
    );
  }
}

function decodeChunk(value: string): Buffer {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    !/^[a-z0-9+/]*={0,2}$/i.test(value)
  ) {
    throw new PhotoUploadFailure(
      'INVALID_INPUT',
      'photo chunk is not valid base64',
    );
  }
  const bytes = Buffer.from(value, 'base64');
  if (
    bytes.length === 0 ||
    bytes.toString('base64').replace(/=+$/, '') !== value.replace(/=+$/, '')
  ) {
    throw new PhotoUploadFailure(
      'INVALID_INPUT',
      'photo chunk is not valid base64',
    );
  }
  return bytes;
}
