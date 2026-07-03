# Architecture

## Boundary

The app has three separate concerns:

1. Spotify metadata import.
2. Authorized source discovery.
3. Lossless file verification and sync.

No module treats Spotify as an audio source. No module executes arbitrary source scripts to fetch copyrighted audio.

## Source Providers

Providers implement a small interface:

```ts
type SourceProvider = {
  id: string;
  name: string;
  kind: "local-library" | "download-manifest" | "unsupported-script";
  verified: boolean;
};
```

The first implementation supports local folders and JSON manifests. The analyzer can identify LX Music-style JavaScript scripts by looking for LX global bindings, `musicUrl` actions, and quality maps, but these scripts are marked unsupported.

## Spotify

Spotify uses Authorization Code with PKCE. The app requests only `user-library-read` and stores tokens in the app data directory. A future version should move token storage to OS keychain storage.

The metadata importer reads `/me/tracks` pages and maps each saved track into the app's `LikedTrack` type. This checkpoint deliberately avoids playback APIs and any audio retrieval.

## Quality Gate

Every candidate file passes through `inspectAudioCandidate` before it can be synced. The quality gate checks:

- Container or extension.
- Codec, especially ALAC vs AAC in `.m4a`.
- Minimum sample rate.
- Minimum bit depth when available.
- Lossy codec rejection.

The local scanner records four practical counts:

- `scannedFiles`: audio files inspected by the quality gate.
- `accepted`: files that satisfy the lossless policy.
- `rejected`: audio files rejected by codec, container, or missing strict metadata.
- `skippedFiles`: non-audio files ignored during folder walking.

Unreadable folders and thrown inspection errors are collected in `errors` so one bad path does not stop the whole scan.

## Sync

Sync is copy-only. It never deletes source files. The output path is produced from a naming template and sanitized before writing.
