import type { AppSettings, AudioQualityPolicy } from '../shared/types';

export const DEFAULT_QUALITY_POLICY: AudioQualityPolicy = {
  minimumBitDepth: 16,
  minimumSampleRate: 44100,
  strictMetadata: true,
  allowedFormats: ['flac', 'alac', 'wav', 'aiff', 'dsf', 'dff']
};

export const DEFAULT_SETTINGS: AppSettings = {
  spotifyClientId: '',
  spotifyRedirectUri: 'http://127.0.0.1:43888/callback',
  sourceFolders: [],
  outputFolder: '',
  qualityPolicy: DEFAULT_QUALITY_POLICY
};
