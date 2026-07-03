export type LosslessFormat = 'flac' | 'alac' | 'wav' | 'aiff' | 'dsf' | 'dff';

export type RejectedFormat =
  | 'mp3'
  | 'aac'
  | 'ogg'
  | 'opus'
  | 'vorbis'
  | 'unknown'
  | 'unsupported';

export type QualityStatus = 'accepted' | 'rejected' | 'needs-review';

export type AudioQualityPolicy = {
  minimumBitDepth: number;
  minimumSampleRate: number;
  strictMetadata: boolean;
  allowedFormats: LosslessFormat[];
};

export type AudioInspectionInput = {
  filePath?: string;
  extension?: string;
  container?: string;
  codec?: string;
  bitDepth?: number;
  sampleRate?: number;
  durationMs?: number;
};

export type AudioQualityResult = {
  status: QualityStatus;
  format: LosslessFormat | RejectedFormat;
  reasons: string[];
  bitDepth?: number;
  sampleRate?: number;
  durationMs?: number;
};

export type LikedTrack = {
  id: string;
  uri: string;
  title: string;
  artists: string[];
  album: string;
  durationMs: number;
  isrc?: string;
  spotifyUrl?: string;
  addedAt?: string;
  artworkUrl?: string;
};

export type AudioCandidate = {
  id: string;
  filePath: string;
  title?: string;
  artists: string[];
  album?: string;
  durationMs?: number;
  isrc?: string;
  quality: AudioQualityResult;
};

export type FileScanReport = {
  roots: string[];
  accepted: AudioCandidate[];
  rejected: AudioCandidate[];
  scannedFiles: number;
  skippedFiles: number;
  errors: FileScanError[];
};

export type FileScanError = {
  path: string;
  message: string;
};

export type SourceProviderKind =
  | 'local-library'
  | 'download-manifest'
  | 'unsupported-script';

export type SourceAnalysis =
  | {
      kind: 'download-manifest';
      supported: true;
      name: string;
      trackCount: number;
      manifest: SourceManifest;
      warnings: string[];
    }
  | {
      kind: 'unsupported-script';
      supported: false;
      name: string;
      detectedAs: 'lx-music-script' | 'javascript-source';
      advertisedQualities: string[];
      warnings: string[];
    }
  | {
      kind: 'unknown';
      supported: false;
      name: string;
      warnings: string[];
    };

export type SourceManifestTrack = {
  title: string;
  artists: string[];
  album?: string;
  isrc?: string;
  durationMs?: number;
  url: string;
  format: LosslessFormat;
  bitDepth?: number;
  sampleRate?: number;
  sha256?: string;
};

export type SourceManifest = {
  schema: 'liked-lossless-sync.source-manifest.v1';
  name: string;
  license: string;
  tracks: SourceManifestTrack[];
};

export type MatchConfidence = 'exact' | 'strong' | 'weak' | 'missing';

export type MatchResult = {
  track: LikedTrack;
  candidate?: AudioCandidate | SourceManifestTrack;
  confidence: MatchConfidence;
  score: number;
  reasons: string[];
};

export type SyncPlanItem = {
  track: LikedTrack;
  sourcePath?: string;
  downloadUrl?: string;
  outputPath: string;
  action: 'copy' | 'download' | 'missing' | 'blocked';
  reasons: string[];
};

export type SyncPlan = {
  outputRoot: string;
  items: SyncPlanItem[];
};

export type SyncExecutionItem = SyncPlanItem & {
  status: 'done' | 'skipped' | 'failed';
  message: string;
};

export type SyncExecutionReport = {
  completed: number;
  skipped: number;
  failed: number;
  items: SyncExecutionItem[];
};

export type SpotifyAuthConfig = {
  clientId: string;
  redirectUri: string;
  scope: string;
};

export type SpotifyTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
};

export type AppSettings = {
  spotifyClientId: string;
  spotifyRedirectUri: string;
  sourceFolders: string[];
  outputFolder: string;
  qualityPolicy: AudioQualityPolicy;
  spotifyTokens?: SpotifyTokenSet;
};

export type AppApi = {
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  chooseFolders: () => Promise<string[]>;
  chooseOutputFolder: () => Promise<string | null>;
  connectSpotify: (clientId: string, redirectUri: string) => Promise<SpotifyTokenSet>;
  fetchLikedTracks: () => Promise<LikedTrack[]>;
  scanLibrary: (folders: string[], policy: AudioQualityPolicy) => Promise<FileScanReport>;
  analyzeSourceUrl: (url: string) => Promise<SourceAnalysis>;
  analyzeSourceText: (text: string) => Promise<SourceAnalysis>;
  buildMatches: (
    tracks: LikedTrack[],
    candidates: Array<AudioCandidate | SourceManifestTrack>
  ) => Promise<MatchResult[]>;
  buildSyncPlan: (matches: MatchResult[], outputRoot: string) => Promise<SyncPlan>;
  executeSyncPlan: (plan: SyncPlan, policy: AudioQualityPolicy) => Promise<SyncExecutionReport>;
};
