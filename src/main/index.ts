import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { join } from 'node:path';
import type { AppSettings, AudioCandidate, LikedTrack, MatchResult, SourceManifestTrack } from '../shared/types';
import { analyzeSourceText, analyzeSourceUrl } from './sourceAnalyzer';
import { buildMatches } from './matcher';
import { buildSyncPlan } from './syncPlan';
import { connectSpotifyWithPkce, fetchSavedTracks, refreshSpotifyToken } from './spotify';
import { scanLibrary } from './libraryScanner';
import { SettingsStore } from './settingsStore';
import { executeSyncPlan } from './syncExecutor';

const settingsStore = new SettingsStore();
let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 960,
    minHeight: 620,
    title: 'Liked Lossless Sync',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    await mainWindow.loadURL(devUrl);
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function registerIpcHandlers(): void {
  ipcMain.handle('settings:get', () => settingsStore.get());

  ipcMain.handle('settings:save', async (_event, patch: Partial<AppSettings>) => {
    return settingsStore.save(patch);
  });

  ipcMain.handle('dialog:choose-folders', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'multiSelections']
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle('dialog:choose-output-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory', 'createDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('spotify:connect', async (_event, clientId: string, redirectUri: string) => {
    const tokens = await connectSpotifyWithPkce(clientId, redirectUri);
    await settingsStore.save({ spotifyClientId: clientId, spotifyRedirectUri: redirectUri, spotifyTokens: tokens });
    return tokens;
  });

  ipcMain.handle('spotify:liked', async () => {
    const settings = await settingsStore.get();
    const tokens = await ensureSpotifyToken(settings);
    return fetchSavedTracks(tokens);
  });

  ipcMain.handle('library:scan', async (_event, folders: string[], policy) => {
    return scanLibrary(folders, policy);
  });

  ipcMain.handle('source:analyze-url', async (_event, url: string) => analyzeSourceUrl(url));
  ipcMain.handle('source:analyze-text', async (_event, text: string) => analyzeSourceText(text));

  ipcMain.handle(
    'match:build',
    async (
      _event,
      tracks: LikedTrack[],
      candidates: Array<AudioCandidate | SourceManifestTrack>
    ): Promise<MatchResult[]> =>
      buildMatches(tracks, candidates)
  );

  ipcMain.handle('sync:plan', async (_event, matches: MatchResult[], outputRoot: string) => {
    return buildSyncPlan(matches, outputRoot);
  });

  ipcMain.handle('sync:execute', async (_event, plan, policy) => {
    return executeSyncPlan(plan, policy);
  });
}

async function ensureSpotifyToken(settings: AppSettings) {
  if (!settings.spotifyTokens) {
    throw new Error('Spotify is not connected.');
  }

  if (settings.spotifyTokens.expiresAt - Date.now() > 60_000) {
    return settings.spotifyTokens;
  }

  if (!settings.spotifyTokens.refreshToken) {
    throw new Error('Spotify token expired and no refresh token is available.');
  }

  const refreshed = await refreshSpotifyToken(settings.spotifyClientId, settings.spotifyTokens.refreshToken);
  await settingsStore.save({ spotifyTokens: refreshed });
  return refreshed;
}
