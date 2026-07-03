import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { DEFAULT_QUALITY_POLICY } from './defaults';
import { scanLibrary } from './libraryScanner';
import type { AudioCandidate } from '../shared/types';

describe('scanLibrary', () => {
  it('walks selected folders, scans only audio extensions, and separates accepted from rejected files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'liked-lossless-scan-'));
    const nested = join(root, 'nested');
    await mkdir(nested);
    await writeFile(join(root, 'Radiohead - No Surprises.flac'), '');
    await writeFile(join(root, 'Daft Punk - Digital Love.mp3'), '');
    await writeFile(join(nested, 'Massive Attack - Teardrop.m4a'), '');
    await writeFile(join(root, 'cover.jpg'), '');

    const report = await scanLibrary([root], DEFAULT_QUALITY_POLICY, {
      inspectFile: async (filePath): Promise<AudioCandidate> => {
        const isRejected = filePath.endsWith('.mp3');
        return {
          id: filePath,
          filePath,
          title: filePath.split('/').pop(),
          artists: [],
          quality: {
            status: isRejected ? 'rejected' : 'accepted',
            format: isRejected ? 'mp3' : filePath.endsWith('.m4a') ? 'alac' : 'flac',
            bitDepth: 16,
            sampleRate: 44100,
            reasons: [isRejected ? 'Lossy codec or container detected: MP3' : 'Lossless quality verified']
          }
        };
      }
    });

    expect(report.scannedFiles).toBe(3);
    expect(report.skippedFiles).toBe(1);
    expect(report.accepted.map((item) => item.quality.format).sort()).toEqual(['alac', 'flac']);
    expect(report.rejected).toHaveLength(1);
    expect(report.rejected[0].filePath.endsWith('.mp3')).toBe(true);
    expect(report.errors).toEqual([]);
  });

  it('reports unreadable roots without failing the whole scan', async () => {
    const root = await mkdtemp(join(tmpdir(), 'liked-lossless-scan-'));
    const missing = join(root, 'missing-folder');

    const report = await scanLibrary([missing], DEFAULT_QUALITY_POLICY);

    expect(report.scannedFiles).toBe(0);
    expect(report.accepted).toEqual([]);
    expect(report.rejected).toEqual([]);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0].path).toBe(missing);
  });
});
