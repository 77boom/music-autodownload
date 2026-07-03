# Product

## Register

product

## Users

Music collectors who use Spotify as their taste ledger and maintain a separate legal lossless library. They are working on a desktop computer, comparing metadata, checking audio quality, and organizing files into a durable folder structure.

## Product Purpose

Liked Lossless Sync reads a user's Spotify saved-track metadata, matches it against authorized lossless sources, and copies or downloads verified lossless audio into a unified output folder. Success means the user can see what is matched, what is missing, what failed quality checks, and exactly which source supplied each file.

## Brand Personality

Trustworthy, precise, restrained. The product should feel like a careful library tool rather than a flashy music player.

## Anti-references

Do not look like a streaming clone, a piracy downloader, a neon media player skin, or a one-click black-box scraper. Avoid vague "download from the internet" language; every source must have provenance and a quality result.

## Design Principles

- Metadata first, audio second: Spotify is only a catalog signal, not an audio source.
- Provenance is visible: every matched file shows where it came from and whether that source is verified.
- Lossless means verified: file extension alone is not enough.
- Unsafe sources are recognized, not executed: LX-style scripts can be identified and reported without enabling gray-source downloading.
- Nothing destructive: sync creates copies and reports; it never deletes a user's source files.

## Accessibility & Inclusion

Target WCAG 2.2 AA for contrast, keyboard access, and focus states. Motion should be brief and state-based, with a reduced-motion path. Status color must never be the only signal; use labels and icons alongside color.
