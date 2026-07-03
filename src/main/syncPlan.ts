import { join } from 'node:path';
import type { MatchResult, SyncPlan, SyncPlanItem } from '../shared/types';

export function buildSyncPlan(matches: MatchResult[], outputRoot: string): SyncPlan {
  const usedOutputPaths = new Set<string>();
  const items: SyncPlanItem[] = matches.map((match) => {
    const extension = inferExtension(match);
    const outputPath = reserveOutputPath(outputRoot, match, extension, usedOutputPaths);

    if (!match.candidate) {
      return {
        track: match.track,
        outputPath,
        action: 'missing',
        reasons: match.reasons
      };
    }

    if ('filePath' in match.candidate) {
      if (match.candidate.quality.status !== 'accepted') {
        return {
          track: match.track,
          sourcePath: match.candidate.filePath,
          outputPath,
          action: 'blocked',
          reasons: match.candidate.quality.reasons
        };
      }

      return {
        track: match.track,
        sourcePath: match.candidate.filePath,
        outputPath,
        action: 'copy',
        reasons: match.reasons
      };
    }

    return {
      track: match.track,
      outputPath,
      action: 'blocked',
      reasons: ['Remote manifest downloads are out of scope for copy-only sync', ...match.reasons]
    };
  });

  return { outputRoot, items };
}

function reserveOutputPath(
  outputRoot: string,
  match: MatchResult,
  extension: string,
  usedOutputPaths: Set<string>
): string {
  const baseName = sanitizeFileName(`${match.track.artists[0] ?? 'Unknown Artist'} - ${match.track.title}`);
  const initialPath = join(outputRoot, `${baseName}${extension}`);
  if (!usedOutputPaths.has(initialPath)) {
    usedOutputPaths.add(initialPath);
    return initialPath;
  }

  const suffix = sanitizeFileName(match.track.id).slice(0, 8) || String(usedOutputPaths.size + 1);
  const suffixedPath = join(outputRoot, `${baseName} (${suffix})${extension}`);
  usedOutputPaths.add(suffixedPath);
  return suffixedPath;
}

function inferExtension(match: MatchResult): string {
  const candidate = match.candidate;
  if (!candidate) return '.flac';
  if ('quality' in candidate) {
    if (candidate.quality.format === 'alac') return '.m4a';
    if (candidate.quality.format === 'aiff') return '.aiff';
    return `.${candidate.quality.format}`;
  }
  if (candidate.format === 'alac') return '.m4a';
  if (candidate.format === 'aiff') return '.aiff';
  return `.${candidate.format}`;
}

function sanitizeFileName(value: string): string {
  const sanitized = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
  return sanitized || 'Untitled';
}
