import { describe, expect, it } from 'vitest';
import type { AudioCandidate, LikedTrack } from '../shared/types';
import { buildMatches } from './matcher';

describe('buildMatches', () => {
  it('uses ISRC exact matches as the strongest signal', () => {
    const track: LikedTrack = {
      id: 'spotify-track',
      uri: 'spotify:track:1',
      title: 'No Surprises',
      artists: ['Radiohead'],
      album: 'OK Computer',
      durationMs: 229000,
      isrc: 'GBAYE9700386'
    };
    const candidate: AudioCandidate = {
      id: 'local-file',
      filePath: '/music/file.flac',
      title: 'Different Title',
      artists: ['Different Artist'],
      durationMs: 1000,
      isrc: 'GBAYE9700386',
      quality: {
        status: 'accepted',
        format: 'flac',
        reasons: ['Lossless quality verified']
      }
    };

    const [match] = buildMatches([track], [candidate]);

    expect(match.confidence).toBe('exact');
    expect(match.score).toBe(100);
  });

  it('marks tracks missing when no candidate is close enough', () => {
    const [match] = buildMatches(
      [
        {
          id: 'spotify-track',
          uri: 'spotify:track:1',
          title: 'Song A',
          artists: ['Artist A'],
          album: 'Album A',
          durationMs: 180000
        }
      ],
      []
    );

    expect(match.confidence).toBe('missing');
  });
});
