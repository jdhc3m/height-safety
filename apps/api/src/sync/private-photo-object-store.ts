import { createHash } from 'node:crypto';
import { mkdir, open, stat } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

export interface PhotoObjectStore {
  size(objectKey: string): Promise<number>;
  writeChunk(
    objectKey: string,
    offset: number,
    bytes: Uint8Array,
  ): Promise<number>;
  sha256(objectKey: string): Promise<string>;
}

/**
 * Local private object implementation for development and controlled tests.
 * The API owns the object-key convention so a later Cloud Storage adapter can
 * preserve the same tenant-prefixed semantics without changing the contract.
 */
export class LocalPrivatePhotoObjectStore implements PhotoObjectStore {
  private readonly root: string;

  constructor(rootDirectory: string) {
    this.root = resolve(rootDirectory);
  }

  async size(objectKey: string): Promise<number> {
    try {
      const result = await stat(this.pathFor(objectKey));
      return result.isFile() ? result.size : 0;
    } catch (error) {
      if (isNotFound(error)) return 0;
      throw error;
    }
  }

  async writeChunk(
    objectKey: string,
    offset: number,
    bytes: Uint8Array,
  ): Promise<number> {
    if (!Number.isSafeInteger(offset) || offset < 0) {
      throw new Error('photo object offset is invalid');
    }
    const path = this.pathFor(objectKey);
    await mkdir(dirname(path), { recursive: true });
    const handle = await open(path, 'a+');
    try {
      const currentSize = (await handle.stat()).size;
      if (currentSize !== offset) {
        throw new PhotoObjectOffsetError(currentSize);
      }
      await handle.write(bytes, 0, bytes.byteLength, offset);
      await handle.sync();
      return (await handle.stat()).size;
    } finally {
      await handle.close();
    }
  }

  async sha256(objectKey: string): Promise<string> {
    const path = this.pathFor(objectKey);
    const digest = createHash('sha256');
    const handle = await open(path, 'r');
    try {
      const buffer = Buffer.allocUnsafe(64 * 1024);
      let position = 0;
      while (true) {
        const result = await handle.read(buffer, 0, buffer.length, position);
        if (result.bytesRead === 0) break;
        digest.update(buffer.subarray(0, result.bytesRead));
        position += result.bytesRead;
      }
    } finally {
      await handle.close();
    }
    return digest.digest('hex');
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
      throw new Error('photo object key is invalid');
    }
    const candidate = resolve(this.root, objectKey);
    const rootRelative = relative(this.root, candidate);
    if (rootRelative.startsWith('..') || rootRelative.includes('..' + '/')) {
      throw new Error('photo object key escapes private object root');
    }
    return candidate;
  }
}

export class PhotoObjectOffsetError extends Error {
  constructor(readonly currentOffset: number) {
    super('photo object offset does not match the durable server offset');
    this.name = 'PhotoObjectOffsetError';
  }
}

function isNotFound(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}

export function privatePhotoObjectRootFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  return (
    environment.HEIGHT_SAFETY_OBJECT_ROOT?.trim() || '.height-safety-objects'
  );
}
