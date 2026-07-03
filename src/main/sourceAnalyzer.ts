import type { SourceAnalysis, SourceManifest } from '../shared/types';

const MANIFEST_SCHEMA = 'liked-lossless-sync.source-manifest.v1';

export async function analyzeSourceUrl(sourceUrl: string): Promise<SourceAnalysis> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    return {
      kind: 'unknown',
      supported: false,
      name: sourceUrl,
      warnings: [`Could not fetch source: HTTP ${response.status}`]
    };
  }

  const text = await response.text();
  return analyzeSourceText(text, sourceUrl);
}

export function analyzeSourceText(text: string, sourceName = 'Pasted source'): SourceAnalysis {
  const trimmed = text.trim();
  const manifest = parseManifest(trimmed);
  if (manifest) {
    return {
      kind: 'download-manifest',
      supported: true,
      name: manifest.name,
      trackCount: manifest.tracks.length,
      manifest,
      warnings: validateManifestWarnings(manifest)
    };
  }

  if (looksLikeLxMusicScript(trimmed)) {
    return {
      kind: 'unsupported-script',
      supported: false,
      name: extractScriptName(trimmed) ?? sourceName,
      detectedAs: 'lx-music-script',
      advertisedQualities: extractAdvertisedQualities(trimmed),
      warnings: [
        'LX Music-style JavaScript source detected.',
        'For safety and copyright compliance, arbitrary music URL scripts are not executed.',
        'Use an authorized source manifest with direct legal download URLs instead.'
      ]
    };
  }

  if (/\bfunction\b|\bconst\b|\blet\b|\bglobalThis\b/.test(trimmed)) {
    return {
      kind: 'unsupported-script',
      supported: false,
      name: extractScriptName(trimmed) ?? sourceName,
      detectedAs: 'javascript-source',
      advertisedQualities: [],
      warnings: [
        'JavaScript source detected.',
        'Only signed or user-authored manifest sources are supported in this version.'
      ]
    };
  }

  return {
    kind: 'unknown',
    supported: false,
    name: sourceName,
    warnings: ['Source is not a supported manifest and was not recognized.']
  };
}

function parseManifest(text: string): SourceManifest | null {
  try {
    const parsed = JSON.parse(text) as Partial<SourceManifest>;
    if (parsed.schema !== MANIFEST_SCHEMA) return null;
    if (!parsed.name || !parsed.license || !Array.isArray(parsed.tracks)) return null;
    return parsed as SourceManifest;
  } catch {
    return null;
  }
}

function validateManifestWarnings(manifest: SourceManifest): string[] {
  const warnings: string[] = [];
  manifest.tracks.forEach((track, index) => {
    if (!track.url.startsWith('https://') && !track.url.startsWith('http://')) {
      warnings.push(`Track ${index + 1} has a non-HTTP URL.`);
    }
    if (!track.isrc && (!track.title || track.artists.length === 0)) {
      warnings.push(`Track ${index + 1} has weak matching metadata.`);
    }
  });
  return warnings;
}

function looksLikeLxMusicScript(text: string): boolean {
  const signals = [
    /globalThis\.lx/,
    /EVENT_NAMES\.request/,
    /musicUrl/,
    /MUSIC_QUALITY/,
    /handleGetMusicUrl/,
    /lx-music/i
  ];
  return signals.filter((signal) => signal.test(text)).length >= 2;
}

function extractScriptName(text: string): string | null {
  const blockName = text.match(/@name\s+([^\n*]+)/);
  if (blockName?.[1]) return blockName[1].trim();
  const constName = text.match(/name:\s*['"]([^'"]+)['"]/);
  return constName?.[1]?.trim() ?? null;
}

function extractAdvertisedQualities(text: string): string[] {
  const jsonMatch = text.match(/MUSIC_QUALITY\s*=\s*JSON\.parse\(['"](.+?)['"]\)/);
  const rawJson = jsonMatch?.[1]?.replace(/\\"/g, '"');
  if (!rawJson) return [];

  try {
    const parsed = JSON.parse(rawJson) as Record<string, string[]>;
    return [...new Set(Object.values(parsed).flat())].sort();
  } catch {
    return [];
  }
}
