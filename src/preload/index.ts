import { contextBridge, ipcRenderer } from 'electron';
import type {
  AppApi,
  AppSettings,
  AudioCandidate,
  AudioQualityPolicy,
  LikedTrack,
  MatchResult,
  SourceManifestTrack,
  SyncPlan
} from '../shared/types';

const api: AppApi = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('settings:save', settings),
  chooseFolders: () => ipcRenderer.invoke('dialog:choose-folders'),
  chooseOutputFolder: () => ipcRenderer.invoke('dialog:choose-output-folder'),
  connectSpotify: (clientId: string, redirectUri: string) =>
    ipcRenderer.invoke('spotify:connect', clientId, redirectUri),
  fetchLikedTracks: () => ipcRenderer.invoke('spotify:liked'),
  scanLibrary: (folders: string[], policy: AudioQualityPolicy) =>
    ipcRenderer.invoke('library:scan', folders, policy),
  analyzeSourceUrl: (url: string) => ipcRenderer.invoke('source:analyze-url', url),
  analyzeSourceText: (text: string) => ipcRenderer.invoke('source:analyze-text', text),
  buildMatches: (tracks: LikedTrack[], candidates: Array<AudioCandidate | SourceManifestTrack>) =>
    ipcRenderer.invoke('match:build', tracks, candidates),
  buildSyncPlan: (matches: MatchResult[], outputRoot: string) =>
    ipcRenderer.invoke('sync:plan', matches, outputRoot),
  executeSyncPlan: (plan: SyncPlan, policy: AudioQualityPolicy) =>
    ipcRenderer.invoke('sync:execute', plan, policy)
};

contextBridge.exposeInMainWorld('losslessSync', api);
