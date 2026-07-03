import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { DEFAULT_QUALITY_POLICY } from './defaults';
import { executeSyncPlan } from './syncExecutor';
import type { SyncPlan } from '../shared/types';

describe('executeSyncPlan', () => {
  it('copies matched local files to the target folder without deleting the source', async () => {
    const root = await mkdtemp(join(tmpdir(), 'liked-lossless-sync-'));
    const sourceDir = join(root, 'source');
    const outputDir = join(root, 'output');
    await mkdir(sourceDir);
    const sourcePath = join(sourceDir, 'Radiohead - No Surprises.flac');
    const outputPath = join(outputDir, 'Radiohead - No Surprises.flac');
    await writeFile(sourcePath, 'lossless-placeholder');

    const plan: SyncPlan = {
      outputRoot: outputDir,
      items: [
        {
          track: {
            id: 'spotify-track',
            uri: 'spotify:track:1',
            title: 'No Surprises',
            artists: ['Radiohead'],
            album: 'OK Computer',
            durationMs: 229000
          },
          sourcePath,
          outputPath,
          action: 'copy',
          reasons: ['Title is very similar']
        }
      ]
    };

    const report = await executeSyncPlan(plan, DEFAULT_QUALITY_POLICY);

    expect(report.completed).toBe(1);
    expect(report.failed).toBe(0);
    expect(await readFile(outputPath, 'utf8')).toBe('lossless-placeholder');
    await expect(stat(sourcePath)).resolves.toMatchObject({ isFile: expect.any(Function) });
  });

  it('skips missing and blocked items without writing files', async () => {
    const root = await mkdtemp(join(tmpdir(), 'liked-lossless-sync-'));
    const outputDir = join(root, 'output');
    const plan: SyncPlan = {
      outputRoot: outputDir,
      items: [
        {
          track: {
            id: 'missing-track',
            uri: 'spotify:track:missing',
            title: 'Missing Song',
            artists: ['Missing Artist'],
            album: 'Missing Album',
            durationMs: 180000
          },
          outputPath: join(outputDir, 'Missing Artist - Missing Song.flac'),
          action: 'missing',
          reasons: ['No candidate passed the minimum match score']
        }
      ]
    };

    const report = await executeSyncPlan(plan, DEFAULT_QUALITY_POLICY);

    expect(report.completed).toBe(0);
    expect(report.skipped).toBe(1);
    expect(report.items[0].status).toBe('skipped');
  });
});
