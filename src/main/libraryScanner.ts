import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseFile } from 'music-metadata';
import type { AudioCandidate, AudioQualityPolicy, FileScanError, FileScanReport } from '../shared/types';
import { inspectAudioFile, isAudioExtension } from './quality';

type CandidateInspector = (
  filePath: string,
  policy: AudioQualityPolicy
) => Promise<AudioCandidate>;

export type LibraryScannerOptions = {
  inspectFile?: CandidateInspector;
};

export async function scanLibrary(
  roots: string[],
  policy: AudioQualityPolicy,
  options: LibraryScannerOptions = {}
): Promise<FileScanReport> {
  const accepted: AudioCandidate[] = [];
  const rejected: AudioCandidate[] = [];
  const errors: FileScanError[] = [];
  const inspectFile = options.inspectFile ?? inspectCandidate;
  let scannedFiles = 0;
  let skippedFiles = 0;

  for (const root of roots) {
    const files = await walk(root, errors);
    for (const filePath of files) {
      if (!isAudioExtension(filePath)) {
        skippedFiles += 1;
        continue;
      }
      scannedFiles += 1;
      try {
        const candidate = await inspectFile(filePath, policy);
        if (candidate.quality.status === 'accepted') accepted.push(candidate);
        else rejected.push(candidate);
      } catch (error) {
        errors.push({ path: filePath, message: errorMessage(error) });
      }
    }
  }

  return {
    roots,
    accepted,
    rejected,
    scannedFiles,
    skippedFiles,
    errors
  };
}

async function walk(root: string, errors: FileScanError[]): Promise<string[]> {
  const files: string[] = [];
  let entries;

  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    errors.push({ path: root, message: errorMessage(error) });
    return files;
  }

  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath, errors)));
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown filesystem error';
}
