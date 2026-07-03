import { extname } from 'node:path';
import { parseFile } from 'music-metadata';
import type {
  AudioInspectionInput,
  AudioQualityPolicy,
  AudioQualityResult,
  LosslessFormat,
  RejectedFormat
} from '../shared/types';

const FORMAT_BY_EXTENSION = new Map<string, LosslessFormat | RejectedFormat>([
  ['.flac', 'flac'],
  ['.wav', 'wav'],
  ['.wave', 'wav'],
  ['.aiff', 'aiff'],
  ['.aif', 'aiff'],
  ['.m4a', 'unknown'],
  ['.alac', 'alac'],
  ['.dsf', 'dsf'],
  ['.dff', 'dff'],
  ['.mp3', 'mp3'],
  ['.aac', 'aac'],
  ['.ogg', 'ogg'],
  ['.opus', 'opus']
]);

const LOSSY_CODEC_MARKERS = ['mp3', 'aac', 'mpeg', 'opus', 'vorbis', 'ogg'];

export function inspectAudioCandidate(
  input: AudioInspectionInput,
  policy: AudioQualityPolicy
): AudioQualityResult {
  const extension = normalizeExtension(input.extension ?? input.filePath);
  const container = (input.container ?? '').toLowerCase();
  const codec = (input.codec ?? '').toLowerCase();
  const inferredFormat = inferFormat(extension, container, codec);
  const reasons: string[] = [];

  if (isLossyCodec(codec) || (inferredFormat !== 'alac' && isLossyContainer(extension, container))) {
    reasons.push(`Lossy codec or container detected: ${input.codec ?? input.container ?? extension}`);
    return result('rejected', inferredFormat, reasons, input);
  }

  if (!policy.allowedFormats.includes(inferredFormat as LosslessFormat)) {
    reasons.push(`Format is not in the allowed lossless list: ${inferredFormat}`);
    return result('rejected', inferredFormat, reasons, input);
  }

  if (input.sampleRate == null) {
    reasons.push('Sample rate is missing');
  } else if (input.sampleRate < policy.minimumSampleRate) {
    reasons.push(`Sample rate ${input.sampleRate} is below ${policy.minimumSampleRate}`);
  }

  if (input.bitDepth == null) {
    reasons.push('Bit depth is missing');
  } else if (input.bitDepth < policy.minimumBitDepth) {
    reasons.push(`Bit depth ${input.bitDepth} is below ${policy.minimumBitDepth}`);
  }

  if (reasons.length > 0) {
    return result(policy.strictMetadata ? 'rejected' : 'needs-review', inferredFormat, reasons, input);
  }

  return result('accepted', inferredFormat, ['Lossless quality verified'], input);
}

export async function inspectAudioFile(
  filePath: string,
  policy: AudioQualityPolicy
): Promise<AudioQualityResult> {
  try {
    const metadata = await parseFile(filePath, {
      duration: true,
      skipCovers: true
    });

    return inspectAudioCandidate(
      {
        filePath,
        container: metadata.format.container,
        codec: metadata.format.codec,
        bitDepth: metadata.format.bitsPerSample,
        sampleRate: metadata.format.sampleRate,
        durationMs: metadata.format.duration
          ? Math.round(metadata.format.duration * 1000)
          : undefined
      },
      policy
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown metadata error';
    return {
      status: 'rejected',
      format: inferFormat(normalizeExtension(filePath), '', ''),
      reasons: [`Could not read audio metadata: ${message}`]
    };
  }
}

export function isAudioExtension(filePath: string): boolean {
  return FORMAT_BY_EXTENSION.has(normalizeExtension(filePath));
}

function normalizeExtension(pathOrExtension?: string): string {
  if (!pathOrExtension) return '';
  const ext = pathOrExtension.startsWith('.') ? pathOrExtension : extname(pathOrExtension);
  return ext.toLowerCase();
}

function inferFormat(
  extension: string,
  container: string,
  codec: string
): LosslessFormat | RejectedFormat {
  if (codec.includes('alac') || codec.includes('apple lossless')) return 'alac';
  if (codec.includes('flac') || container.includes('flac')) return 'flac';
  if (container.includes('wave') || container.includes('wav')) return 'wav';
  if (container.includes('aiff') || container.includes('aif')) return 'aiff';
  if (container.includes('dsf')) return 'dsf';
  if (container.includes('dsdiff') || container.includes('dff')) return 'dff';
  if (codec.includes('aac')) return 'aac';
  if (codec.includes('mp3') || codec.includes('mpeg')) return 'mp3';
  if (codec.includes('opus')) return 'opus';
  if (codec.includes('vorbis')) return 'vorbis';
  return FORMAT_BY_EXTENSION.get(extension) ?? 'unknown';
}

function isLossyCodec(codec: string): boolean {
  if (!codec) return false;
  if (codec.includes('alac')) return false;
  return LOSSY_CODEC_MARKERS.some((marker) => codec.includes(marker));
}

function isLossyContainer(extension: string, container: string): boolean {
  return (
    extension === '.mp3' ||
    extension === '.aac' ||
    extension === '.ogg' ||
    extension === '.opus' ||
    container.includes('mpeg')
  );
}

function result(
  status: AudioQualityResult['status'],
  format: AudioQualityResult['format'],
  reasons: string[],
  input: AudioInspectionInput
): AudioQualityResult {
  return {
    status,
    format,
    reasons,
    bitDepth: input.bitDepth,
    sampleRate: input.sampleRate,
    durationMs: input.durationMs
  };
}
