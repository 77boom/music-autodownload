# Code Signing and Notarization

This project is signing-ready, but real signing credentials are intentionally not stored in the repository.

## macOS

For distribution outside the Mac App Store, Apple uses Developer ID signing plus notarization. Apple says Developer ID signed and notarized software lets Gatekeeper verify that the app is not known malware and has not been tampered with.

You need:

- An Apple Developer Program membership.
- A `Developer ID Application` certificate.
- An App Store Connect API key for notarization.

GitHub repository secrets:

- `MAC_CSC_LINK`: base64-encoded `.p12` exported from Keychain, or another `CSC_LINK` value supported by electron-builder.
- `MAC_CSC_KEY_PASSWORD`: password for that `.p12`.
- `APPLE_API_KEY_BASE64`: base64-encoded `.p8` App Store Connect API key.
- `APPLE_API_KEY_ID`: key ID.
- `APPLE_API_ISSUER`: issuer ID.

The release workflow decodes the `.p8` into the runner temp directory and sets `APPLE_API_KEY` for `@electron/notarize`. The app uses `build/afterSign.cjs`, so notarization runs after electron-builder signs the `.app`.

Local signing example:

```bash
export CSC_LINK="$(base64 -i DeveloperIDApplication.p12)"
export CSC_KEY_PASSWORD="p12-password"
export APPLE_API_KEY="/absolute/path/AuthKey_XXXXXXXXXX.p8"
export APPLE_API_KEY_ID="XXXXXXXXXX"
export APPLE_API_ISSUER="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
pnpm dist:mac
```

Unsigned local test builds can still run with:

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm dist:mac
```

## Windows

Windows installer signing uses Authenticode. Microsoft SignTool signs files, timestamps signatures, and verifies signatures. Current SignTool versions require SHA-256 digest options when signing or timestamping.

For this Electron app, the simplest CI path is electron-builder with a Windows code signing certificate:

- `WIN_CSC_LINK`: base64-encoded `.pfx`, file URL, HTTPS URL, or other `CSC_LINK` style value.
- `WIN_CSC_KEY_PASSWORD`: password for that certificate.

The release workflow passes those secrets only to the Windows packaging job.

Important certificate notes:

- An OV code signing certificate can work, but Windows SmartScreen reputation usually builds over time.
- An EV certificate can establish reputation faster, but EV/private keys are commonly hardware-backed and may not be exportable as `.pfx`.
- If your CA gives you cloud/HSM signing instead of a PFX, use a provider-specific integration such as Azure Artifact Signing or the CA's signing tool. That is a separate workflow checkpoint.

## References

- electron-builder code signing: https://www.electron.build/code-signing
- electron-builder macOS signing: https://www.electron.build/code-signing-mac
- electron-builder Windows signing: https://www.electron.build/code-signing-win
- Apple Developer ID certificates: https://developer.apple.com/help/account/certificates/create-developer-id-certificates
- Apple notarization: https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
- Microsoft SignTool: https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool
- Azure Artifact Signing: https://learn.microsoft.com/en-us/azure/artifact-signing/
