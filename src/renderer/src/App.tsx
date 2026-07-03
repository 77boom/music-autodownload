import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  FolderOpen,
  Library,
  Link,
  Loader2,
  Music2,
  Play,
  Plug,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type {
  AppSettings,
  AppApi,
  AudioCandidate,
  AudioQualityPolicy,
  FileScanReport,
  LikedTrack,
  MatchResult,
  SourceAnalysis,
  SourceManifestTrack,
  SyncExecutionReport,
  SyncPlan
} from '../../shared/types';

const defaultPolicy: AudioQualityPolicy = {
  minimumBitDepth: 16,
  minimumSampleRate: 44100,
  strictMetadata: true,
  allowedFormats: ['flac', 'alac', 'wav', 'aiff', 'dsf', 'dff']
};

const defaultSettings: AppSettings = {
  spotifyClientId: '',
  spotifyRedirectUri: 'http://127.0.0.1:43888/callback',
  sourceFolders: [],
  outputFolder: '',
  qualityPolicy: defaultPolicy
};

type ViewKey = 'spotify' | 'sources' | 'match' | 'sync' | 'reports' | 'settings';

const navItems: Array<{ key: ViewKey; label: string; icon: typeof Music2 }> = [
  { key: 'spotify', label: 'Spotify', icon: Music2 },
  { key: 'sources', label: 'Sources', icon: Library },
  { key: 'match', label: 'Match', icon: Search },
  { key: 'sync', label: 'Sync', icon: Download },
  { key: 'reports', label: 'Reports', icon: FileText },
  { key: 'settings', label: 'Settings', icon: Settings }
];

export function App() {
  const api = getApi();
  const [view, setView] = useState<ViewKey>('spotify');
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [likedTracks, setLikedTracks] = useState<LikedTrack[]>([]);
  const [scanReport, setScanReport] = useState<FileScanReport | null>(null);
  const [sourceAnalysis, setSourceAnalysis] = useState<SourceAnalysis | null>(null);
  const [manifestTracks, setManifestTracks] = useState<SourceManifestTrack[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [syncPlan, setSyncPlan] = useState<SyncPlan | null>(null);
  const [executionReport, setExecutionReport] = useState<SyncExecutionReport | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const acceptedCandidates = scanReport?.accepted ?? [];
  const rejectedCandidates = scanReport?.rejected ?? [];
  const allCandidates = useMemo(
    () => [...acceptedCandidates, ...manifestTracks],
    [acceptedCandidates, manifestTracks]
  );

  const exactMatches = matches.filter((match) => match.confidence === 'exact').length;
  const strongMatches = matches.filter((match) => match.confidence === 'strong').length;
  const weakMatches = matches.filter((match) => match.confidence === 'weak').length;
  const missingMatches = matches.filter((match) => match.confidence === 'missing').length;

  useEffect(() => {
    void runTask('load-settings', async () => {
      setSettings(await api.getSettings());
    });
  }, []);

  async function runTask(label: string, task: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await task();
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Unknown error');
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings(patch: Partial<AppSettings>) {
    const next = await api.saveSettings(patch);
    setSettings(next);
  }

  const connectSpotify = () =>
    runTask('connect-spotify', async () => {
      const tokens = await api.connectSpotify(
        settings.spotifyClientId.trim(),
        settings.spotifyRedirectUri.trim()
      );
      setSettings({ ...settings, spotifyTokens: tokens });
    });

  const fetchLikedTracks = () =>
    runTask('fetch-liked', async () => {
      setLikedTracks(await api.fetchLikedTracks());
    });

  const chooseFolders = () =>
    runTask('choose-folders', async () => {
      const selected = await api.chooseFolders();
      if (selected.length > 0) await saveSettings({ sourceFolders: selected });
    });

  const chooseOutput = () =>
    runTask('choose-output', async () => {
      const selected = await api.chooseOutputFolder();
      if (selected) await saveSettings({ outputFolder: selected });
    });

  const scanLibrary = () =>
    runTask('scan-library', async () => {
      setScanReport(await api.scanLibrary(settings.sourceFolders, settings.qualityPolicy));
    });

  const analyzeSource = () =>
    runTask('analyze-source', async () => {
      const analysis = await api.analyzeSourceUrl(sourceUrl.trim());
      setSourceAnalysis(analysis);
      if (analysis.kind === 'download-manifest') {
        setManifestTracks(analysis.manifest.tracks);
      }
    });

  const buildMatches = () =>
    runTask('build-matches', async () => {
      setMatches(await api.buildMatches(likedTracks, allCandidates));
    });

  const buildPlan = () =>
    runTask('build-plan', async () => {
      setSyncPlan(await api.buildSyncPlan(matches, settings.outputFolder));
    });

  const executePlan = () =>
    runTask('execute-plan', async () => {
      if (!syncPlan) return;
      setExecutionReport(await api.executeSyncPlan(syncPlan, settings.qualityPolicy));
    });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="brand-title">Liked Lossless</div>
            <div className="brand-subtitle">Sync workbench</div>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`nav-item ${view === item.key ? 'is-active' : ''}`}
                type="button"
                onClick={() => setView(item.key)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-status">
          <StatusRow label="Spotify" state={settings.spotifyTokens ? 'Connected' : 'Not connected'} />
          <StatusRow label="Tracks" state={likedTracks.length ? String(likedTracks.length) : 'None'} />
          <StatusRow label="Sources" state={String(acceptedCandidates.length + manifestTracks.length)} />
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <h1>{navItems.find((item) => item.key === view)?.label}</h1>
            <p>{headerCopy(view)}</p>
          </div>
          <div className="topbar-actions">
            {busy && (
              <span className="busy-pill">
                <Loader2 size={14} />
                Working
              </span>
            )}
            <button className="button secondary" type="button" onClick={() => void fetchLikedTracks()}>
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="notice danger">
            <XCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <section className="summary-strip">
          <Metric label="Liked" value={likedTracks.length} />
          <Metric label="Accepted files" value={acceptedCandidates.length} />
          <Metric label="Manifest tracks" value={manifestTracks.length} />
          <Metric label="Missing" value={missingMatches} tone={missingMatches ? 'warning' : 'neutral'} />
        </section>

        {view === 'spotify' && (
          <WorkflowPanel
            title="Spotify metadata"
            actions={
              <>
                <button className="button primary" type="button" onClick={() => void connectSpotify()}>
                  <Plug size={16} />
                  Connect
                </button>
                <button className="button secondary" type="button" onClick={() => void fetchLikedTracks()}>
                  <Music2 size={16} />
                  Fetch liked
                </button>
              </>
            }
          >
            <div className="form-grid two">
              <label>
                <span>Client ID</span>
                <input
                  value={settings.spotifyClientId}
                  onChange={(event) =>
                    setSettings({ ...settings, spotifyClientId: event.currentTarget.value })
                  }
                  onBlur={() => void saveSettings({ spotifyClientId: settings.spotifyClientId })}
                  placeholder="Spotify app Client ID"
                />
              </label>
              <label>
                <span>Redirect URI</span>
                <input
                  value={settings.spotifyRedirectUri}
                  onChange={(event) =>
                    setSettings({ ...settings, spotifyRedirectUri: event.currentTarget.value })
                  }
                  onBlur={() => void saveSettings({ spotifyRedirectUri: settings.spotifyRedirectUri })}
                />
              </label>
            </div>

            <TrackTable tracks={likedTracks.slice(0, 10)} emptyLabel="No Spotify tracks loaded" />
          </WorkflowPanel>
        )}

        {view === 'sources' && (
          <WorkflowPanel
            title="Sources"
            actions={
              <>
                <button className="button secondary" type="button" onClick={() => void chooseFolders()}>
                  <FolderOpen size={16} />
                  Add folders
                </button>
                <button className="button primary" type="button" onClick={() => void scanLibrary()}>
                  <Search size={16} />
                  Scan
                </button>
              </>
            }
          >
            <div className="folder-list">
              {settings.sourceFolders.length === 0 ? (
                <div className="empty-row">No local folders selected</div>
              ) : (
                settings.sourceFolders.map((folder) => (
                  <div className="path-row" key={folder}>
                    <FolderOpen size={16} />
                    <span>{folder}</span>
                  </div>
                ))
              )}
            </div>

            <div className="source-url-row">
              <input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.currentTarget.value)}
                placeholder="Authorized source manifest URL or source script URL"
              />
              <button className="button secondary" type="button" onClick={() => void analyzeSource()}>
                <Link size={16} />
                Analyze
              </button>
            </div>

            {sourceAnalysis && <SourceAnalysisPanel analysis={sourceAnalysis} />}

            <div className="quality-grid">
              <Metric label="Accepted" value={acceptedCandidates.length} tone="success" />
              <Metric label="Rejected" value={rejectedCandidates.length} tone={rejectedCandidates.length ? 'danger' : 'neutral'} />
              <Metric label="Scanned files" value={scanReport?.scannedFiles ?? 0} />
            </div>
          </WorkflowPanel>
        )}

        {view === 'match' && (
          <WorkflowPanel
            title="Match review"
            actions={
              <button className="button primary" type="button" onClick={() => void buildMatches()}>
                <Search size={16} />
                Build matches
              </button>
            }
          >
            <div className="match-summary">
              <Metric label="Exact" value={exactMatches} tone="success" />
              <Metric label="Strong" value={strongMatches} />
              <Metric label="Weak" value={weakMatches} tone={weakMatches ? 'warning' : 'neutral'} />
              <Metric label="Missing" value={missingMatches} tone={missingMatches ? 'danger' : 'neutral'} />
            </div>
            <MatchTable matches={matches.slice(0, 30)} />
          </WorkflowPanel>
        )}

        {view === 'sync' && (
          <WorkflowPanel
            title="Sync plan"
            actions={
              <>
                <button className="button secondary" type="button" onClick={() => void chooseOutput()}>
                  <FolderOpen size={16} />
                  Output
                </button>
                <button className="button secondary" type="button" onClick={() => void buildPlan()}>
                  <FileText size={16} />
                  Plan
                </button>
                <button className="button primary" type="button" onClick={() => void executePlan()}>
                  <Play size={16} />
                  Run
                </button>
              </>
            }
          >
            <div className="path-row strong">
              <FolderOpen size={16} />
              <span>{settings.outputFolder || 'No output folder selected'}</span>
            </div>
            <PlanTable plan={syncPlan} />
          </WorkflowPanel>
        )}

        {view === 'reports' && (
          <WorkflowPanel title="Reports">
            <ReportPanel
              rejected={rejectedCandidates}
              matches={matches}
              executionReport={executionReport}
            />
          </WorkflowPanel>
        )}

        {view === 'settings' && (
          <WorkflowPanel title="Quality policy">
            <div className="form-grid three">
              <label>
                <span>Minimum bit depth</span>
                <input
                  type="number"
                  min={16}
                  value={settings.qualityPolicy.minimumBitDepth}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      qualityPolicy: {
                        ...settings.qualityPolicy,
                        minimumBitDepth: Number(event.currentTarget.value)
                      }
                    })
                  }
                  onBlur={() => void saveSettings({ qualityPolicy: settings.qualityPolicy })}
                />
              </label>
              <label>
                <span>Minimum sample rate</span>
                <input
                  type="number"
                  min={44100}
                  step={1000}
                  value={settings.qualityPolicy.minimumSampleRate}
                  onChange={(event) =>
                    setSettings({
                      ...settings,
                      qualityPolicy: {
                        ...settings.qualityPolicy,
                        minimumSampleRate: Number(event.currentTarget.value)
                      }
                    })
                  }
                  onBlur={() => void saveSettings({ qualityPolicy: settings.qualityPolicy })}
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={settings.qualityPolicy.strictMetadata}
                  onChange={(event) =>
                    void saveSettings({
                      qualityPolicy: {
                        ...settings.qualityPolicy,
                        strictMetadata: event.currentTarget.checked
                      }
                    })
                  }
                />
                <span>Strict metadata</span>
              </label>
            </div>
          </WorkflowPanel>
        )}
      </main>
    </div>
  );
}

function getApi(): AppApi {
  if (window.losslessSync) return window.losslessSync;
  return previewApi;
}

const previewTracks: LikedTrack[] = [
  {
    id: 'preview-1',
    uri: 'spotify:track:preview-1',
    title: 'No Surprises',
    artists: ['Radiohead'],
    album: 'OK Computer',
    durationMs: 229000,
    isrc: 'GBAYE9700386'
  },
  {
    id: 'preview-2',
    uri: 'spotify:track:preview-2',
    title: 'Digital Love',
    artists: ['Daft Punk'],
    album: 'Discovery',
    durationMs: 301000,
    isrc: 'GBDUW0000059'
  }
];

const previewApi: AppApi = {
  getSettings: async () => defaultSettings,
  saveSettings: async (patch) => ({ ...defaultSettings, ...patch }),
  chooseFolders: async () => ['/Music/Lossless Library'],
  chooseOutputFolder: async () => '/Music/Spotify Liked Lossless',
  connectSpotify: async () => ({
    accessToken: 'preview',
    expiresAt: Date.now() + 3600_000,
    scope: 'user-library-read'
  }),
  fetchLikedTracks: async () => previewTracks,
  scanLibrary: async (_folders, policy) => ({
    roots: ['/Music/Lossless Library'],
    scannedFiles: 2,
    accepted: [
      {
        id: 'candidate-1',
        filePath: '/Music/Lossless Library/Radiohead - No Surprises.flac',
        title: 'No Surprises',
        artists: ['Radiohead'],
        album: 'OK Computer',
        durationMs: 229000,
        isrc: 'GBAYE9700386',
        quality: {
          status: 'accepted',
          format: 'flac',
          bitDepth: policy.minimumBitDepth,
          sampleRate: policy.minimumSampleRate,
          reasons: ['Lossless quality verified']
        }
      }
    ],
    rejected: [
      {
        id: 'candidate-2',
        filePath: '/Music/Lossless Library/Daft Punk - Digital Love.mp3',
        title: 'Digital Love',
        artists: ['Daft Punk'],
        quality: {
          status: 'rejected',
          format: 'mp3',
          reasons: ['Lossy codec or container detected: MP3']
        }
      }
    ]
  }),
  analyzeSourceUrl: async (url) => ({
    kind: 'unsupported-script',
    supported: false,
    name: url || 'LX style source',
    detectedAs: 'lx-music-script',
    advertisedQualities: ['128k', '320k', 'flac', 'hires'],
    warnings: [
      'LX Music-style JavaScript source detected.',
      'For safety and copyright compliance, arbitrary music URL scripts are not executed.',
      'Use an authorized source manifest with direct legal download URLs instead.'
    ]
  }),
  analyzeSourceText: async () => ({
    kind: 'unknown',
    supported: false,
    name: 'Preview',
    warnings: ['No source text in preview mode']
  }),
  buildMatches: async (tracks, candidates) =>
    tracks.map((track, index) => ({
      track,
      candidate: candidates[index],
      confidence: candidates[index] ? (index === 0 ? 'exact' : 'weak') : 'missing',
      score: candidates[index] ? (index === 0 ? 100 : 60) : 0,
      reasons: candidates[index] ? ['Preview match'] : ['No preview candidate']
    })),
  buildSyncPlan: async (matches, outputRoot) => ({
    outputRoot,
    items: matches.map((match) => ({
      track: match.track,
      outputPath: `${outputRoot || '/output'}/${match.track.artists[0]} - ${match.track.title}.flac`,
      action: match.candidate ? 'copy' : 'missing',
      reasons: match.reasons
    }))
  }),
  executeSyncPlan: async (plan) => ({
    completed: plan.items.filter((item) => item.action === 'copy').length,
    skipped: plan.items.filter((item) => item.action !== 'copy').length,
    failed: 0,
    items: plan.items.map((item) => ({
      ...item,
      status: item.action === 'copy' ? 'done' : 'skipped',
      message: item.action === 'copy' ? 'Preview copy' : 'Preview skipped'
    }))
  })
};

function WorkflowPanel({
  title,
  actions,
  children
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="workflow-panel">
      <div className="panel-header">
        <h2>{title}</h2>
        <div className="panel-actions">{actions}</div>
      </div>
      {children}
    </section>
  );
}

function SourceAnalysisPanel({ analysis }: { analysis: SourceAnalysis }) {
  const supported = analysis.supported;
  return (
    <div className={`notice ${supported ? 'success' : 'warning'}`}>
      {supported ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
      <div>
        <strong>{analysis.name}</strong>
        <div className="notice-detail">
          {analysis.kind === 'download-manifest'
            ? `${analysis.trackCount} authorized manifest tracks`
            : analysis.warnings.join(' ')}
        </div>
        {analysis.kind === 'unsupported-script' && analysis.advertisedQualities.length > 0 && (
          <div className="chip-row">
            {analysis.advertisedQualities.map((quality) => (
              <span className="chip warning" key={quality}>
                {quality}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusRow({ label, state }: { label: string; state: string }) {
  return (
    <div className="status-row">
      <span>{label}</span>
      <strong>{state}</strong>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = 'neutral'
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TrackTable({ tracks, emptyLabel }: { tracks: LikedTrack[]; emptyLabel: string }) {
  if (tracks.length === 0) return <div className="empty-row">{emptyLabel}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Artist</th>
            <th>Album</th>
            <th>ISRC</th>
          </tr>
        </thead>
        <tbody>
          {tracks.map((track) => (
            <tr key={track.id}>
              <td>{track.title}</td>
              <td>{track.artists.join(', ')}</td>
              <td>{track.album}</td>
              <td>{track.isrc ?? 'None'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchTable({ matches }: { matches: MatchResult[] }) {
  if (matches.length === 0) return <div className="empty-row">No matches built</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Track</th>
            <th>Confidence</th>
            <th>Score</th>
            <th>Candidate</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => (
            <tr key={match.track.id}>
              <td>
                <strong>{match.track.title}</strong>
                <span>{match.track.artists.join(', ')}</span>
              </td>
              <td>
                <span className={`chip ${match.confidence}`}>{match.confidence}</span>
              </td>
              <td>{match.score}</td>
              <td>{candidateLabel(match.candidate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlanTable({ plan }: { plan: SyncPlan | null }) {
  if (!plan) return <div className="empty-row">No sync plan built</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>Track</th>
            <th>Output</th>
          </tr>
        </thead>
        <tbody>
          {plan.items.slice(0, 40).map((item) => (
            <tr key={`${item.track.id}-${item.outputPath}`}>
              <td>
                <span className={`chip ${item.action}`}>{item.action}</span>
              </td>
              <td>{item.track.title}</td>
              <td>{item.outputPath}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportPanel({
  rejected,
  matches,
  executionReport
}: {
  rejected: AudioCandidate[];
  matches: MatchResult[];
  executionReport: SyncExecutionReport | null;
}) {
  const missing = matches.filter((match) => match.confidence === 'missing');
  return (
    <div className="report-grid">
      <ReportList title="Rejected files" items={rejected.map((item) => `${item.filePath}: ${item.quality.reasons.join('; ')}`)} />
      <ReportList title="Missing tracks" items={missing.map((item) => `${item.track.artists.join(', ')} - ${item.track.title}`)} />
      <ReportList
        title="Last sync"
        items={
          executionReport
            ? executionReport.items.map((item) => `${item.status}: ${item.track.title} (${item.message})`)
            : []
        }
      />
    </div>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="report-section">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <div className="empty-row compact">No entries</div>
      ) : (
        <ul>
          {items.slice(0, 20).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function candidateLabel(candidate: MatchResult['candidate']) {
  if (!candidate) return 'None';
  if ('filePath' in candidate) return candidate.filePath;
  return `${candidate.artists.join(', ')} - ${candidate.title}`;
}

function headerCopy(view: ViewKey): string {
  switch (view) {
    case 'spotify':
      return 'Read saved-track metadata with PKCE authorization.';
    case 'sources':
      return 'Scan local files and inspect authorized source manifests.';
    case 'match':
      return 'Review confidence before any file operation.';
    case 'sync':
      return 'Copy or download verified lossless files into one folder.';
    case 'reports':
      return 'Check missing tracks, rejected files, and sync results.';
    case 'settings':
      return 'Set the minimum lossless quality gate.';
  }
}
