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

  it('accepts WAV and AIFF when they meet the minimum quality policy', () => {
    const wav = inspectAudioCandidate(
      {
        extension: '.wav',
        container: 'WAVE',
        codec: 'PCM',
        bitDepth: 16,
        sampleRate: 44100
      },
      DEFAULT_QUALITY_POLICY
    );
    const aiff = inspectAudioCandidate(
      {
        extension: '.aiff',
        container: 'AIFF',
        codec: 'PCM',
        bitDepth: 24,
        sampleRate: 48000
      },
      DEFAULT_QUALITY_POLICY
    );

    expect(wav.status).toBe('accepted');
    expect(wav.format).toBe('wav');
    expect(aiff.status).toBe('accepted');
    expect(aiff.format).toBe('aiff');
  });

  it('rejects OGG Vorbis and OPUS as lossy sources', () => {
    const ogg = inspectAudioCandidate(
      {
        extension: '.ogg',
        container: 'Ogg',
        codec: 'Vorbis',
        bitDepth: 16,
        sampleRate: 44100
      },
      DEFAULT_QUALITY_POLICY
    );
    const opus = inspectAudioCandidate(
      {
        extension: '.opus',
        container: 'Ogg',
        codec: 'Opus',
        bitDepth: 16,
        sampleRate: 48000
      },
      DEFAULT_QUALITY_POLICY
    );

    expect(ogg.status).toBe('rejected');
    expect(ogg.format).toBe('vorbis');
    expect(opus.status).toBe('rejected');
    expect(opus.format).toBe('opus');
  });
});
