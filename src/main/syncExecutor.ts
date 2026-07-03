import { copyFile, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AudioQualityPolicy, SyncExecutionItem, SyncExecutionReport, SyncPlan } from '../shared/types';
import { inspectAudioFile } from './quality';

export async function executeSyncPlan(
  plan: SyncPlan,
  policy: AudioQualityPolicy
): Promise<SyncExecutionReport> {
  const items: SyncExecutionItem[] = [];

  for (const item of plan.items) {
    if (item.action === 'missing' || item.action === 'blocked') {
      items.push({ ...item, status: 'skipped', message: item.reasons.join('; ') });
      continue;
    }

    try {
      await mkdir(dirname(item.outputPath), { recursive: true });

      if (item.action === 'copy' && item.sourcePath) {
        await copyFile(item.sourcePath, item.outputPath);
        items.push({ ...item, status: 'done', message: 'Copied' });
        continue;
      }

      if (item.action === 'download' && item.downloadUrl) {
        const tempPath = `${item.outputPath}.part`;
        await downloadFile(item.downloadUrl, tempPath);
        const quality = await inspectAudioFile(tempPath, policy);
        if (quality.status !== 'accepted') {
          await unlink(tempPath).catch(() => undefined);
          items.push({
            ...item,
            status: 'failed',
            message: `Downloaded file failed quality gate: ${quality.reasons.join('; ')}`
          });
          continue;
        }
        await rename(tempPath, item.outputPath);
        items.push({ ...item, status: 'done', message: 'Downloaded and verified' });
      }
    } catch (error) {
      items.push({
        ...item,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown sync error'
      });
    }
  }

  return {
    completed: items.filter((item) => item.status === 'done').length,
    skipped: items.filter((item) => item.status === 'skipped').length,
    failed: items.filter((item) => item.status === 'failed').length,
    items
  };
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, bytes);
}
