# Checkpoints

This project is intentionally built as small, inspectable versions. Each checkpoint should run, have tests, and be understandable before moving to the next one.

## 1. Project Skeleton

Status: complete.

Scope:

- Electron + React + TypeScript project.
- README with legal boundary.
- Basic GUI shell.
- Unit test and build commands.
- GitHub Actions workflow.

Verification:

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## 2. Spotify Metadata

Status: complete for this checkpoint.

Scope:

- Authorization Code with PKCE.
- User-provided Spotify Client ID.
- Redirect URI callback listener.
- `user-library-read` scope only.
- `/me/tracks` pagination.
- Saved-track metadata mapping: Spotify ID, URI, title, artists, album, duration, ISRC, artwork, saved date.

Out of scope:

- Downloading Spotify audio.
- Playback control.
- Playlist write permissions.
- Client Secret storage.

Primary references:

- https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
- https://developer.spotify.com/documentation/web-api/reference/get-users-saved-tracks

## 3. Local Lossless Music Scan

Status: complete for this checkpoint.

Scope:

- Select one or more local folders.
- Recursively walk nested folders.
- Ignore non-audio files.
- Inspect audio metadata with `music-metadata`.
- Accept FLAC, ALAC, WAV, and AIFF when the quality policy is satisfied.
- Reject MP3, AAC, OGG Vorbis, and OPUS.
- Report unreadable folders or files without failing the whole scan.
- Show accepted, rejected, skipped, and error counts in the GUI.

Out of scope:

- Matching scanned files to Spotify tracks.
- Copying files to the output folder.
- Deleting or modifying source files.

## Next Checkpoint

4. Matching algorithm.

Planned scope:

- ISRC match.
- Title and artist normalization.
- Duration tolerance.
- Matched and missing reports.
