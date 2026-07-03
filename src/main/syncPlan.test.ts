import { describe, expect, it } from 'vitest';
import type { AudioCandidate, LikedTrack, MatchResult, SourceManifestTrack } from '../shared/types';
import { buildSyncPlan } from './syncPlan';

const track: LikedTrack = {
  id: 'spotify-track',
  uri: 'spotify:track:1',
  title: 'No Surprises',
  artists: ['Radiohead'],
  album: 'OK Computer',
  durationMs: 229000
};

const acceptedCandidate: AudioCandidate = {
  id: 'local-file',
  filePath: '/source/Radiohead - No Surprises.flac',
  title: 'No Surprises',
  artists: ['Radiohead'],
  album: 'OK Computer',
  durationMs: 229000,
  quality: {
    status: 'accepted',
    format: 'flac',
    reasons: ['Lossless quality verified']
  }
};

describe('buildSyncPlan', () => {
  it('creates copy-only plan items for accepted local matches', () => {
    const match: MatchResult = {
      track,
      candidate: acceptedCandidate,
      confidence: 'strong',
      score: 92,
      reasons: ['Title is very similar']
    };

    const plan = buildSyncPlan([match], '/output');

    expect(plan.outputRoot).toBe('/output');
    expect(plan.items).toEqual([
      {
        track,
        sourcePath: '/source/Radiohead - No Surprises.flac',
        outputPath: '/output/Radiohead - No Surprises.flac',
        action: 'copy',
        reasons: ['Title is very similar']
      }
    ]);
  });

  it('sanitizes invalid filename characters and keeps files in the output folder', () => {
    const match: MatchResult = {
      track: {
        ...track,
        title: 'Song: With / Invalid * Characters?',
        artists: ['AC/DC']
      },
      candidate: {
        ...acceptedCandidate,
        quality: { ...acceptedCandidate.quality, format: 'alac' }
      },
      confidence: 'strong',
      score: 88,
      reasons: ['Title is very similar']
    };

    const plan = buildSyncPlan([match], '/output');

    expect(plan.items[0].outputPath).toBe('/output/AC_DC - Song_ With _ Invalid _ Characters_.m4a');
  });

  it('adds a stable suffix when multiple tracks would write to the same filename', () => {
    const first: MatchResult = {
      track: { ...track, id: 'first-track' },
      candidate: acceptedCandidate,
      confidence: 'strong',
      score: 90,
      reasons: ['Title is very similar']
    };
    const second: MatchResult = {
      track: { ...track, id: 'second-track' },
      candidate: { ...acceptedCandidate, id: 'second-file', filePath: '/source/duplicate.flac' },
      confidence: 'strong',
      score: 90,
      reasons: ['Title is very similar']
    };

    const plan = buildSyncPlan([first, second], '/output');

    expect(plan.items.map((item) => item.outputPath)).toEqual([
      '/output/Radiohead - No Surprises.flac',
      '/output/Radiohead - No Surprises (second-t).flac'
    ]);
  });

  it('blocks rejected local candidates instead of copying them', () => {
    const match: MatchResult = {
      track,
      candidate: {
        ...acceptedCandidate,
        quality: {
          status: 'rejected',
          format: 'mp3',
          reasons: ['Lossy codec or container detected: MP3']
        }
      },
      confidence: 'weak',
      score: 60,
      reasons: ['Weak metadata match']
    };

    const plan = buildSyncPlan([match], '/output');

    expect(plan.items[0].action).toBe('blocked');
    expect(plan.items[0].sourcePath).toBe('/source/Radiohead - No Surprises.flac');
  });

  it('blocks remote manifest candidates during the copy-only checkpoint', () => {
    const manifestCandidate: SourceManifestTrack = {
      title: 'No Surprises',
      artists: ['Radiohead'],
      album: 'OK Computer',
      durationMs: 229000,
      url: 'https://example.com/no-surprises.flac',
      format: 'flac'
    };
    const match: MatchResult = {
      track,
      candidate: manifestCandidate,
      confidence: 'strong',
      score: 90,
      reasons: ['Title is very similar']
    };

    const plan = buildSyncPlan([match], '/output');

    expect(plan.items[0].action).toBe('blocked');
    expect(plan.items[0].downloadUrl).toBeUndefined();
    expect(plan.items[0].reasons[0]).toBe('Remote manifest downloads are out of scope for copy-only sync');
  });
});
