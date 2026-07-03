# Liked Lossless Sync

An open-source desktop tool for syncing Spotify saved-track metadata with legal lossless audio sources.

Spotify is used only as a metadata source. The app does not download Spotify audio, bypass DRM, or fetch copyrighted audio from unverified third-party services.

## What it does

- Connects to Spotify with Authorization Code + PKCE.
- Reads your saved tracks with the `user-library-read` scope.
- Scans local folders for lossless files.
- Imports authorized source manifests with direct lossless download URLs.
- Detects LX Music-style JavaScript source scripts and marks them as unsupported unless converted into an authorized manifest.
- Verifies audio quality before copying or accepting files.
- Generates missing and rejected reports.

## Current checkpoint

This repository is being built in small, inspectable versions.

Completed:

- Project skeleton: Electron, React, TypeScript, README, docs, CI, tests.
- Spotify metadata: PKCE login URL, token flow, saved-track pagination, metadata mapping.
- Local lossless scan: recursive folder scan, lossless quality gate, lossy rejection, scan errors.
- Matching algorithm: ISRC first, then normalized title, artist, and duration.
- Copy-only sync: matched local files are copied into the output folder; source files are never deleted.

Not started as a checkpoint yet:

- Provider plugin system beyond manifest/script recognition.
- Release packaging.

See [`docs/checkpoints.md`](docs/checkpoints.md) for the staged plan.

## Supported audio targets

Accepted by default:

- FLAC
- ALAC in M4A
- WAV
- AIFF or AIF
- DSF
- DFF

Rejected by default:

- MP3
- AAC
- OGG
- OPUS
- Vorbis
- Unknown codec or missing quality metadata when strict mode is enabled

## Spotify setup

Create a Spotify app in the Spotify Developer Dashboard and set the redirect URI to:

```text
http://127.0.0.1:43888/callback
```

The desktop app only needs your Client ID. It uses PKCE, so it does not store a Client Secret.

The app requests only `user-library-read` and reads `/me/tracks` metadata. It does not request playback, playlist write, or audio download permissions.

## Local lossless scan

The local scanner recursively walks selected folders, ignores non-audio files, and inspects audio metadata before accepting a candidate.

Accepted formats currently include FLAC, ALAC in M4A, WAV, and AIFF/AIF. MP3, AAC, OGG Vorbis, and OPUS are rejected. With strict metadata enabled, files without bit depth or sample-rate metadata are rejected instead of guessed.

## Authorized source manifests

Remote downloads are supported through a manifest format:

```json
{
  "schema": "liked-lossless-sync.source-manifest.v1",
  "name": "My Authorized Lossless Store",
  "license": "Purchased / user-owned / authorized",
  "tracks": [
    {
      "title": "Song Title",
      "artists": ["Artist"],
      "album": "Album",
      "isrc": "USRC17607839",
      "durationMs": 213000,
      "url": "https://example.com/authorized/song.flac",
      "format": "flac",
      "bitDepth": 24,
      "sampleRate": 96000
    }
  ]
}
```

LX Music-style scripts are recognized for transparency, but the app does not execute them or use them for automated downloads. Convert legal sources into the manifest format instead.

See [`docs/source-manifest.example.json`](docs/source-manifest.example.json) for a standalone example.

Remote manifest downloads are intentionally blocked during the current copy-only sync checkpoint. Download-capable providers will be reviewed in a later checkpoint.

## Matching and Sync

Matching prefers exact ISRC matches. If ISRC is missing, it falls back to normalized song title, artist names, and duration tolerance. The match report separates matched and missing tracks so the user can review gaps before any file operation.

The current sync step is copy-only:

- Copies only accepted local lossless candidates.
- Keeps source files untouched.
- Writes into the selected output folder.
- Sanitizes invalid filename characters.
- Adds a stable suffix when duplicate tracks would create the same output filename.
- Blocks rejected files, missing tracks, and remote manifest candidates.

## Development

```bash
pnpm install
pnpm dev
```

## Verification

```bash
pnpm test
pnpm typecheck
pnpm build
```

## License

MIT
