/** Detects allowed media types from magic bytes; the client-declared MIME type is not trusted. */
export type MediaKind = 'audio' | 'image';

export interface DetectedType {
  kind: MediaKind;
  mime: string;
  ext: string;
}

const startsWith = (buf: Buffer, bytes: number[], offset = 0) => bytes.every((b, i) => buf[offset + i] === b);
const ascii = (buf: Buffer, start: number, end: number) => buf.subarray(start, end).toString('latin1');

export function detectFileType(buf: Buffer): DetectedType | null {
  if (buf.length < 12) return null;
  // Images
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return { kind: 'image', mime: 'image/png', ext: 'png' };
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { kind: 'image', mime: 'image/jpeg', ext: 'jpg' };
  if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 12) === 'WEBP')
    return { kind: 'image', mime: 'image/webp', ext: 'webp' };
  if (ascii(buf, 4, 8) === 'ftyp' && ['avif', 'avis'].includes(ascii(buf, 8, 12)))
    return { kind: 'image', mime: 'image/avif', ext: 'avif' };
  if (ascii(buf, 0, 6) === 'GIF87a' || ascii(buf, 0, 6) === 'GIF89a')
    return { kind: 'image', mime: 'image/gif', ext: 'gif' };
  // Audio
  if (ascii(buf, 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1]! & 0xe0) === 0xe0))
    return { kind: 'audio', mime: 'audio/mpeg', ext: 'mp3' };
  if (ascii(buf, 0, 4) === 'OggS') return { kind: 'audio', mime: 'audio/ogg', ext: 'ogg' };
  if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 12) === 'WAVE')
    return { kind: 'audio', mime: 'audio/wav', ext: 'wav' };
  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) return { kind: 'audio', mime: 'audio/webm', ext: 'webm' };
  if (
    ascii(buf, 4, 8) === 'ftyp' &&
    ['M4A ', 'mp41', 'mp42', 'isom', 'iso5', 'iso6', 'dash'].includes(ascii(buf, 8, 12))
  ) {
    return { kind: 'audio', mime: 'audio/mp4', ext: 'm4a' };
  }
  return null;
}

export const MAX_BYTES: Record<MediaKind, number> = { audio: 5 * 1024 * 1024, image: 3 * 1024 * 1024 };
