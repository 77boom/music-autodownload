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

## 4. Matching Algorithm

Status: complete for this checkpoint.

Scope:

- ISRC exact match as the strongest signal.
- Normalized title matching.
- Normalized artist matching.
- Duration tolerance.
- One candidate file can be matched to only one Spotify track.
- Generate matched and missing groups for review.

Out of scope:

- Manual match override UI.
- Fuzzy album matching beyond the current track-level score.

## 5. Copy-Only Sync

Status: complete for this checkpoint.

Scope:

- Build a plan from reviewed matches.
- Copy accepted local files to the selected output folder.
- Never delete or modify source files.
- Sanitize output filenames.
- Preserve the candidate audio extension.
- Add stable suffixes for filename collisions.
- Skip missing and blocked items.
- Block remote manifest candidates during this copy-only checkpoint.

Out of scope:

- Downloading remote manifest candidates.
- Deleting stale files from the output folder.
- Mirroring source directory structure.

## Next Checkpoint

6. Provider plugin system.

Planned scope:

- Legal download manifest execution review.
- Custom provider detection.
- LX Music-style script risk reporting only.
