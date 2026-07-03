# Release

This project uses GitHub Actions for verification and release packaging.

## Local Checks

Run these before creating a release tag:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Local packaging commands:

```bash
pnpm dist:mac
pnpm dist:win
pnpm dist:linux
```

Platform notes:

- Build macOS `.dmg` on macOS.
- Build Windows `.exe` on Windows.
- Build Linux `.AppImage` on Linux.
- Code signing and notarization are not configured yet.

## GitHub Actions

`.github/workflows/build.yml` runs on pull requests, pushes to `main`, and manual dispatch. It verifies the app across Ubuntu, macOS, and Windows.

`.github/workflows/release.yml` runs on tags matching `v*` and manual dispatch. It:

1. Runs typecheck and tests.
2. Packages platform artifacts on native runners.
3. Uploads artifacts with `actions/upload-artifact`.
4. Creates a GitHub Release for tag builds and attaches the packaged files.

## Creating a Release

After the repository is ready:

```bash
git checkout main
git pull
git tag v0.1.0
git push origin v0.1.0
```

The tag starts the release workflow. The generated release should include:

- `Liked Lossless Sync-0.1.0-mac-*.dmg`
- `Liked Lossless Sync-0.1.0-win-*.exe`
- `Liked Lossless Sync-0.1.0-linux-*.AppImage`

## References

- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Workflow artifacts: https://docs.github.com/en/actions/tutorials/store-and-share-data
- `GITHUB_TOKEN` permissions: https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
