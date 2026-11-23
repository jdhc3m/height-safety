import { createHash, randomBytes } from 'node:crypto';
import { link, mkdir, open, readFile, rm, stat } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

import {
  ReportGenerationFailure,
  type ReportArtifactObjectStore,
} from './report-generation.types';

export class LocalPrivateReportObjectStore
  implements ReportArtifactObjectStore
{
  private readonly root: string;

  constructor(rootDirectory: string) {
    this.root = resolve(rootDirectory);
  }

  async putIfAbsent(
    objectKey: string,
    bytes: Uint8Array,
    expectedSha256: string,
  ): Promise<void> {
    const actualSha256 = sha256(bytes);
    if (actualSha256 !== expectedSha256) {
      throw new Error('report object checksum does not match its content');
    }

    const path = this.pathFor(objectKey);
    await mkdir(dirname(path), { recursive: true });
    const temporaryPath = `${path}.${randomBytes(12).toString('hex')}.tmp`;
    const handle = await open(temporaryPath, 'wx', 0o600);
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }

    try {
      await link(temporaryPath, path);
    } catch (error) {
      if (!isAlreadyExists(error)) throw error;
      const existing = await readFile(path);
      if (sha256(existing) !== expectedSha256) {
        throw new Error('report object key already contains different bytes');
      }
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }

  async read(
    objectKey: string,
    signal?: AbortSignal,
  ): Promise<Uint8Array | undefined> {
    const path = this.pathFor(objectKey);
    try {
      const result = await stat(path);
      if (!result.isFile()) return undefined;
      return await readFile(path, signal ? { signal } : undefined);
    } catch (error) {
      if (isNotFound(error)) return undefined;
      throw error;
    }
  }

  private pathFor(objectKey: string): string {
    if (
      typeof objectKey !== 'string' ||
      objectKey.length === 0 ||
      objectKey.includes('\\') ||
      objectKey
        .split('/')
        .some((part) => part.length === 0 || part === '.' || part === '..')
    ) {
      throw new Error('report object key is invalid');
    }
    const candidate = resolve(this.root, objectKey);
    const rootRelative = relative(this.root, candidate);
    if (
      rootRelative.startsWith('..') ||
      rootRelative.includes(`..${resolve('/')}`)
    ) {
      throw new Error('report object key escapes private object root');
    }
    return candidate;
  }
}

export class UnconfiguredReportArtifactObjectStore
  implements ReportArtifactObjectStore
{
  private unavailable(): never {
    throw new ReportGenerationFailure(
      'PERSISTENCE_UNAVAILABLE',
      'private report object storage is not configured',
    );
  }

  async putIfAbsent(
    _objectKey: string,
    _bytes: Uint8Array,
    _expectedSha256: string,
  ): Promise<void> {
    this.unavailable();
  }

  async read(_objectKey: string): Promise<Uint8Array | undefined> {
    this.unavailable();
  }
}

export function reportObjectRootFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  return (
    environment.HEIGHT_SAFETY_OBJECT_ROOT?.trim() || '.height-safety-objects'
  );
}

export function reportArtifactObjectStoreFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): ReportArtifactObjectStore {
  const runtime = environment.NODE_ENV?.trim().toLowerCase();
  if (runtime === 'production') {
    throw new Error(
      'production report object storage requires a configured durable private adapter',
    );
  }
  if (runtime !== 'development' && runtime !== 'test') {
    return new UnconfiguredReportArtifactObjectStore();
  }
  return new LocalPrivateReportObjectStore(
    reportObjectRootFromEnvironment(environment),
  );
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function isAlreadyExists(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'EEXIST'
  );
}

function isNotFound(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}
