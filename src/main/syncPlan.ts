import { join } from 'node:path';
import type { MatchResult, SyncPlan, SyncPlanItem } from '../shared/types';

export function buildSyncPlan(matches: MatchResult[], outputRoot: string): SyncPlan {
  const items: SyncPlanItem[] = matches.map((match) => {
    const extension = inferExtension(match);
    const filename = sanitizeFileName(`${match.track.artists[0] ?? 'Unknown Artist'} - ${match.track.title}${extension}`);
    const outputPath = join(outputRoot, filename);

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
      downloadUrl: match.candidate.url,
      outputPath,
      action: 'download',
      reasons: ['Authorized manifest download candidate', ...match.reasons]
    };
  });

  return { outputRoot, items };
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
  return value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
}
