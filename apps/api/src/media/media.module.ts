import { Controller, Get, Global, Inject, Injectable, Module, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import { Public } from '../auth/decorators';
import { ENV, type Env } from '../config/env';
import { Errors } from '../common/errors';
import { PrismaService } from '../infra/infra.module';
import { detectFileType, MAX_BYTES, type MediaKind } from './file-type';
import { STORAGE, assertSafeKey, createStorage, type StorageProvider } from './storage';

const MIME_BY_EXT: Record<string, string> = {
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  webm: 'audio/webm',
  m4a: 'audio/mp4',
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
};

@Injectable()
export class MediaService {
  constructor(
    @Inject(STORAGE) private readonly storage: StorageProvider,
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  url(key: string | null | undefined): string | null {
    if (!key) return null;
    return `${this.env.MEDIA_PUBLIC_URL ?? '/api/v1/media'}/${key}`;
  }

  /** Validates by magic bytes and size, stores under a random key, and records the asset. */
  async upload(
    expected: MediaKind,
    file: { buffer: Buffer; originalname?: string },
    meta: { uploadedById: string; caption?: string | null; alt?: Record<string, string> | null },
  ) {
    const type = detectFileType(file.buffer);
    if (!type || type.kind !== expected) {
      throw Errors.badRequest(
        'UNSUPPORTED_FILE',
        expected === 'audio'
          ? 'Upload MP3, OGG, WAV, WebM or M4A audio'
          : 'Upload PNG, JPEG, WebP, AVIF or GIF images',
      );
    }
    if (file.buffer.length > MAX_BYTES[expected]) {
      throw Errors.badRequest('FILE_TOO_LARGE', `Max ${MAX_BYTES[expected] / 1024 / 1024} MB`);
    }
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const month = new Date().toISOString().slice(0, 7);
    const key = `${expected}/${month}/${randomUUID()}.${type.ext}`;
    await this.storage.put(key, file.buffer, type.mime);
    if (expected === 'audio') {
      return this.prisma.audioAsset.create({
        data: {
          storageKey: key,
          mime: type.mime,
          bytes: file.buffer.length,
          sha256,
          caption: meta.caption ?? null,
          uploadedById: meta.uploadedById,
        },
      });
    }
    return this.prisma.imageAsset.create({
      data: {
        storageKey: key,
        mime: type.mime,
        bytes: file.buffer.length,
        sha256,
        alt: meta.alt ?? { en: '' },
        uploadedById: meta.uploadedById,
      },
    });
  }

  async remove(key: string) {
    await this.storage.delete(key);
  }
}

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(@Inject(STORAGE) private readonly storage: StorageProvider) {}

  @Public()
  @Get(':kind/:month/:file')
  async get(
    @Param('kind') kind: string,
    @Param('month') month: string,
    @Param('file') file: string,
    @Res() res: Response,
  ) {
    const key = `${kind}/${month}/${file}`;
    try {
      assertSafeKey(key);
    } catch {
      throw Errors.notFound('Media');
    }
    const found = await this.storage.get(key);
    if (!found) throw Errors.notFound('Media');
    const ext = file.split('.').pop() ?? '';
    res.setHeader('Content-Type', MIME_BY_EXT[ext] ?? 'application/octet-stream');
    res.setHeader('Content-Length', String(found.size));
    // Keys are random and never reused, so the content is immutable.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    found.stream.pipe(res);
  }
}

@Global()
@Module({
  controllers: [MediaController],
  providers: [
    { provide: STORAGE, inject: [ENV], useFactory: (env: Env) => createStorage(env) },
    MediaService,
  ],
  exports: [MediaService, STORAGE],
})
export class MediaModule {}
