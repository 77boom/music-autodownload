import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseFile } from 'music-metadata';
import type { AudioCandidate, AudioQualityPolicy, FileScanReport } from '../shared/types';
import { inspectAudioFile, isAudioExtension } from './quality';

export async function scanLibrary(
  roots: string[],
  policy: AudioQualityPolicy
): Promise<FileScanReport> {
  const accepted: AudioCandidate[] = [];
  const rejected: AudioCandidate[] = [];
  let scannedFiles = 0;

  for (const root of roots) {
    const files = await walk(root);
    for (const filePath of files) {
      if (!isAudioExtension(filePath)) continue;
      scannedFiles += 1;
      const candidate = await inspectCandidate(filePath, policy);
      if (candidate.quality.status === 'accepted') accepted.push(candidate);
      else rejected.push(candidate);
    }
  }

  return {
    roots,
    accepted,
    rejected,
    scannedFiles
  };
}

async function walk(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

async function inspectCandidate(
  filePath: string,
  policy: AudioQualityPolicy
): Promise<AudioCandidate> {
  const quality = await inspectAudioFile(filePath, policy);
  let title: string | undefined;
  let artists: string[] = [];
  let album: string | undefined;
  let isrc: string | undefined;
  let durationMs = quality.durationMs;

  try {
    const metadata = await parseFile(filePath, { duration: true, skipCovers: true });
    title = metadata.common.title;
    artists = metadata.common.artists ?? (metadata.common.artist ? [metadata.common.artist] : []);
    album = metadata.common.album;
    isrc = Array.isArray(metadata.common.isrc)
      ? metadata.common.isrc[0]
      : metadata.common.isrc;
    durationMs =
      durationMs ??
      (metadata.format.duration ? Math.round(metadata.format.duration * 1000) : undefined);
  } catch {
    artists = [];
  }

  return {
    id: randomUUID(),
    filePath,
    title,
    artists,
    album,
    isrc,
    durationMs,
    quality
  };
}
