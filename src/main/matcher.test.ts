import { describe, expect, it } from 'vitest';
import type { AudioCandidate, LikedTrack } from '../shared/types';
import { buildMatchReport, buildMatches } from './matcher';

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

  it('matches by normalized title, artist, and close duration when ISRC is missing', () => {
    const track: LikedTrack = {
      id: 'spotify-track',
      uri: 'spotify:track:2',
      title: 'Digital Love - Radio Edit',
      artists: ['Daft Punk'],
      album: 'Discovery',
      durationMs: 301000
    };
    const candidate: AudioCandidate = {
      id: 'local-file',
      filePath: '/music/Daft Punk - Digital Love.flac',
      title: 'Digital Love',
      artists: ['Daft Punk'],
      durationMs: 300200,
      quality: {
        status: 'accepted',
        format: 'flac',
        reasons: ['Lossless quality verified']
      }
    };

    const [match] = buildMatches([track], [candidate]);

    expect(match.confidence).toBe('strong');
    expect(match.candidate).toBe(candidate);
    expect(match.reasons).toContain('Title is very similar');
    expect(match.reasons).toContain('Artist is very similar');
    expect(match.reasons).toContain('Duration is within 2.5 seconds');
  });

  it('does not reuse one candidate for multiple Spotify tracks', () => {
    const tracks: LikedTrack[] = [
      {
        id: 'spotify-track-a',
        uri: 'spotify:track:a',
        title: 'Teardrop',
        artists: ['Massive Attack'],
        album: 'Mezzanine',
        durationMs: 330000
      },
      {
        id: 'spotify-track-b',
        uri: 'spotify:track:b',
        title: 'Teardrop',
        artists: ['Massive Attack'],
        album: 'Mezzanine',
        durationMs: 330000
      }
    ];
    const candidate: AudioCandidate = {
      id: 'local-file',
      filePath: '/music/Massive Attack - Teardrop.flac',
      title: 'Teardrop',
      artists: ['Massive Attack'],
      durationMs: 330000,
      quality: {
        status: 'accepted',
        format: 'flac',
        reasons: ['Lossless quality verified']
      }
    };

    const report = buildMatchReport(tracks, [candidate]);

    expect(report.matched).toHaveLength(1);
    expect(report.missing).toHaveLength(1);
    expect(report.results.map((match) => match.confidence)).toEqual(['strong', 'missing']);
  });

  it('generates matched and missing groups for review', () => {
    const matchedTrack: LikedTrack = {
      id: 'spotify-track-a',
      uri: 'spotify:track:a',
      title: 'No Surprises',
      artists: ['Radiohead'],
      album: 'OK Computer',
      durationMs: 229000,
      isrc: 'GBAYE9700386'
    };
    const missingTrack: LikedTrack = {
      id: 'spotify-track-b',
      uri: 'spotify:track:b',
      title: 'Missing Song',
      artists: ['Missing Artist'],
      album: 'Missing Album',
      durationMs: 200000
    };
    const candidate: AudioCandidate = {
      id: 'local-file',
      filePath: '/music/Radiohead - No Surprises.flac',
      title: 'No Surprises',
      artists: ['Radiohead'],
      durationMs: 229000,
      isrc: 'GBAYE9700386',
      quality: {
        status: 'accepted',
        format: 'flac',
        reasons: ['Lossless quality verified']
      }
    };

    const report = buildMatchReport([matchedTrack, missingTrack], [candidate]);

    expect(report.results).toHaveLength(2);
    expect(report.matched.map((match) => match.track.id)).toEqual(['spotify-track-a']);
    expect(report.missing.map((match) => match.track.id)).toEqual(['spotify-track-b']);
  });
});
