import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import type { Readable } from 'node:stream';
import type { Env } from '../config/env';

/** File storage abstraction: local disk on a single VPS, S3-compatible object storage when scaled out. */
export interface StorageProvider {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ stream: Readable; size: number } | null>;
  delete(key: string): Promise<void>;
  ping(): Promise<boolean>;
}

const SAFE_KEY = /^[a-z0-9][a-z0-9/_.-]{0,200}$/;

export function assertSafeKey(key: string) {
  if (!SAFE_KEY.test(key) || key.includes('..')) throw new Error(`Unsafe storage key: ${key}`);
}

export class LocalStorage implements StorageProvider {
  constructor(private readonly root: string) {}

  private path(key: string) {
    assertSafeKey(key);
    const p = normalize(join(this.root, key));
    if (!p.startsWith(normalize(this.root))) throw new Error('Path escapes storage root');
    return p;
  }

  async put(key: string, body: Buffer) {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, body);
  }

  async get(key: string) {
    const p = this.path(key);
    try {
      const s = await stat(p);
      return { stream: createReadStream(p), size: s.size };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    await rm(this.path(key), { force: true });
  }

  async ping() {
    await mkdir(this.root, { recursive: true });
    return true;
  }
}

/** S3/MinIO/R2 via the AWS SDK, loaded only when configured. */
export class S3Storage implements StorageProvider {
  private client: unknown;
  constructor(private readonly env: Env) {}

  private async sdk() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = await import('@aws-sdk/client-s3').catch(() => {
      throw new Error('STORAGE_DRIVER=s3 requires the @aws-sdk/client-s3 package');
    });
    this.client ??= new mod.S3Client({
      region: this.env.S3_REGION,
      endpoint: this.env.S3_ENDPOINT,
      forcePathStyle: Boolean(this.env.S3_ENDPOINT),
      credentials: {
        accessKeyId: this.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: this.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    return { mod, client: this.client as InstanceType<typeof mod.S3Client> };
  }

  async put(key: string, body: Buffer, contentType: string) {
    assertSafeKey(key);
    const { mod, client } = await this.sdk();
    await client.send(
      new mod.PutObjectCommand({
        Bucket: this.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  async get(key: string) {
    assertSafeKey(key);
    const { mod, client } = await this.sdk();
    try {
      const out = await client.send(new mod.GetObjectCommand({ Bucket: this.env.S3_BUCKET, Key: key }));
      return { stream: out.Body as Readable, size: Number(out.ContentLength ?? 0) };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    assertSafeKey(key);
    const { mod, client } = await this.sdk();
    await client.send(new mod.DeleteObjectCommand({ Bucket: this.env.S3_BUCKET, Key: key }));
  }

  async ping() {
    const { mod, client } = await this.sdk();
    await client.send(new mod.HeadBucketCommand({ Bucket: this.env.S3_BUCKET }));
    return true;
  }
}

export function createStorage(env: Env): StorageProvider {
  return env.STORAGE_DRIVER === 's3' ? new S3Storage(env) : new LocalStorage(env.STORAGE_LOCAL_DIR);
}

export const STORAGE = Symbol('STORAGE');
