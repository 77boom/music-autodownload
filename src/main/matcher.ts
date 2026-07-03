import type {
  AudioCandidate,
  LikedTrack,
  MatchConfidence,
  MatchReport,
  MatchResult,
  SourceManifestTrack
} from '../shared/types';

export function buildMatches(
  tracks: LikedTrack[],
  candidates: Array<AudioCandidate | SourceManifestTrack>
): MatchResult[] {
  return buildMatchReport(tracks, candidates).results;
}

export function buildMatchReport(
  tracks: LikedTrack[],
  candidates: Array<AudioCandidate | SourceManifestTrack>
): MatchReport {
  const usedCandidateKeys = new Set<string>();
  const results: MatchResult[] = tracks.map((track) => {
    const scored = candidates
      .map((candidate) => scoreCandidate(track, candidate))
      .filter((scoredCandidate) => !usedCandidateKeys.has(candidateKey(scoredCandidate.candidate)))
      .sort((a, b) => b.score - a.score);
    const best = scored[0];

    if (!best || best.score < 55) {
      return {
        track,
        confidence: 'missing',
        score: 0,
        reasons: ['No candidate passed the minimum match score']
      };
    }

    usedCandidateKeys.add(candidateKey(best.candidate));
    const confidence: MatchConfidence =
      best.score >= 100 ? 'exact' : best.score >= 78 ? 'strong' : 'weak';

    return {
      track,
      candidate: best.candidate,
      confidence,
      score: best.score,
      reasons: best.reasons
    };
  });

  return {
    results,
    matched: results.filter((match) => match.confidence !== 'missing'),
    missing: results.filter((match) => match.confidence === 'missing')
  };
}

function scoreCandidate(
  track: LikedTrack,
  candidate: AudioCandidate | SourceManifestTrack
): { candidate: AudioCandidate | SourceManifestTrack; score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  if (track.isrc && candidate.isrc && normalizeIsrc(track.isrc) === normalizeIsrc(candidate.isrc)) {
    reasons.push('ISRC exact match');
    score += 100;
  }

  const titleScore = similarity(normalizeText(track.title), normalizeText(candidate.title ?? ''));
  const artistScore = similarity(
    normalizeText(track.artists.join(' ')),
    normalizeText(candidate.artists.join(' '))
  );

  score += titleScore * 42;
  score += artistScore * 38;

  if (titleScore > 0.82) reasons.push('Title is very similar');
  if (artistScore > 0.82) reasons.push('Artist is very similar');

  if (track.durationMs && candidate.durationMs) {
    const difference = Math.abs(track.durationMs - candidate.durationMs);
    if (difference <= 2500) {
      score += 12;
      reasons.push('Duration is within 2.5 seconds');
    } else if (difference <= 8000) {
      score += 5;
      reasons.push('Duration is close');
    }
  }

  return {
    candidate,
    score: Math.min(100, Math.round(score)),
    reasons
  };
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)|\[[^\]]*]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(remaster(ed)?|explicit|mono|stereo|version|radio edit)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeIsrc(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function candidateKey(candidate: AudioCandidate | SourceManifestTrack): string {
  if ('filePath' in candidate) return `file:${candidate.filePath}`;
  return `url:${candidate.url}`;
}

function similarity(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftTokens = new Set(left.split(' '));
  const rightTokens = new Set(right.split(' '));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  const tokenScore = union === 0 ? 0 : intersection / union;
  const distanceScore = 1 - levenshtein(left, right) / Math.max(left.length, right.length);
  return Math.max(tokenScore, distanceScore * 0.85);
}

function levenshtein(left: string, right: string): number {
  const matrix = Array.from({ length: left.length + 1 }, () => new Array<number>(right.length + 1));
  for (let i = 0; i <= left.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[left.length][right.length];
}
