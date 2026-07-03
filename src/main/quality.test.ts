import { describe, expect, it } from 'vitest';
import { DEFAULT_QUALITY_POLICY } from './defaults';
import { inspectAudioCandidate } from './quality';

describe('inspectAudioCandidate', () => {
  it('accepts verified FLAC that meets the quality policy', () => {
    const result = inspectAudioCandidate(
      {
        extension: '.flac',
        container: 'FLAC',
        codec: 'FLAC',
        bitDepth: 24,
        sampleRate: 96000
      },
      DEFAULT_QUALITY_POLICY
    );

    expect(result.status).toBe('accepted');
    expect(result.format).toBe('flac');
  });

  it('rejects AAC even when it is inside an m4a container', () => {
    const result = inspectAudioCandidate(
      {
        extension: '.m4a',
        container: 'MPEG-4',
        codec: 'AAC',
        bitDepth: 16,
        sampleRate: 44100
      },
      DEFAULT_QUALITY_POLICY
    );

    expect(result.status).toBe('rejected');
    expect(result.format).toBe('aac');
  });

  it('accepts ALAC inside m4a when metadata is explicit', () => {
    const result = inspectAudioCandidate(
      {
        extension: '.m4a',
        container: 'MPEG-4',
        codec: 'ALAC',
        bitDepth: 16,
        sampleRate: 44100
      },
      DEFAULT_QUALITY_POLICY
    );

    expect(result.status).toBe('accepted');
    expect(result.format).toBe('alac');
  });
});
