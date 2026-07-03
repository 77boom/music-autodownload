import { describe, expect, it } from 'vitest';
import { analyzeSourceText } from './sourceAnalyzer';

describe('analyzeSourceText', () => {
  it('accepts the authorized source manifest format', () => {
    const analysis = analyzeSourceText(
      JSON.stringify({
        schema: 'liked-lossless-sync.source-manifest.v1',
        name: 'Purchased library',
        license: 'User owned',
        tracks: [
          {
            title: 'Example',
            artists: ['Artist'],
            isrc: 'USRC17607839',
            url: 'https://example.com/example.flac',
            format: 'flac'
          }
        ]
      })
    );

    expect(analysis.kind).toBe('download-manifest');
    expect(analysis.supported).toBe(true);
  });

  it('detects LX Music-style source scripts without enabling execution', () => {
    const analysis = analyzeSourceText(`
      /*! * @name ikun source */
      const MUSIC_QUALITY = JSON.parse('{"kw":["128k","flac","hires"]}');
      const { EVENT_NAMES, request, on, send } = globalThis.lx;
      const handleGetMusicUrl = async () => {};
      on(EVENT_NAMES.request, ({ action }) => action === "musicUrl");
    `);

    expect(analysis.kind).toBe('unsupported-script');
    expect(analysis.supported).toBe(false);
    if (analysis.kind === 'unsupported-script') {
      expect(analysis.detectedAs).toBe('lx-music-script');
      expect(analysis.advertisedQualities).toContain('flac');
      expect(analysis.warnings.join(' ')).toContain('not executed');
    }
  });
});
