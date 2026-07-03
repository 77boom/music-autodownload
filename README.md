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
