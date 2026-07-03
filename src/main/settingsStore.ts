import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { AppSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from './defaults';

export class SettingsStore {
  private readonly settingsPath: string;

  constructor() {
    this.settingsPath = join(app.getPath('userData'), 'settings.json');
  }

  async get(): Promise<AppSettings> {
    try {
      const raw = await readFile(this.settingsPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return mergeSettings(parsed);
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async save(patch: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    const next = mergeSettings({ ...current, ...patch });
    await mkdir(dirname(this.settingsPath), { recursive: true });
    await writeFile(this.settingsPath, JSON.stringify(next, null, 2), 'utf8');
    return next;
  }
}

function mergeSettings(value: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    qualityPolicy: {
      ...DEFAULT_SETTINGS.qualityPolicy,
      ...value.qualityPolicy
    },
    sourceFolders: value.sourceFolders ?? [],
    outputFolder: value.outputFolder ?? ''
  };
}
