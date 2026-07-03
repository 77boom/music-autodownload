# Design

## Visual Theme

Task-focused desktop utility. The interface is calm, dense enough for repeated use, and built around clear panels, tables, and status chips. It should feel closer to a professional file-sync tool than a music app.

Mood phrase: library workbench with a small recording-studio signal light.

## Color Palette

Use OKLCH custom properties.

```css
:root {
  --bg: oklch(1 0 0);
  --surface: oklch(0.972 0.004 255);
  --surface-strong: oklch(0.94 0.008 255);
  --ink: oklch(0.19 0.018 255);
  --muted: oklch(0.46 0.015 255);
  --border: oklch(0.86 0.01 255);
  --primary: oklch(0.55 0.145 45);
  --primary-hover: oklch(0.49 0.15 45);
  --accent: oklch(0.43 0.12 245);
  --success: oklch(0.50 0.11 155);
  --warning: oklch(0.64 0.14 78);
  --danger: oklch(0.54 0.15 28);
  --focus: oklch(0.58 0.16 245);
}
```

## Typography

Use a system sans stack: `Inter`, `SF Pro Text`, `Segoe UI`, `Roboto`, `Arial`, `sans-serif`. Use fixed rem scales, not viewport-fluid type.

## Components

- App shell with a left navigation rail and a main work area.
- Segmented controls for source type and sync mode.
- Icon buttons with text labels for primary workflow actions.
- Status chips for connected, verified, blocked, warning, and missing states.
- Tables for liked tracks, matches, and reports.
- Inline warnings for unsupported source scripts rather than modal-first flows.

## Layout

Desktop-first, responsive down to narrow laptop widths. The main workflow uses full-width panels, not nested cards. Repeated items such as tracks or sources may use compact rows.

## Motion

Use 150-200ms transitions for hover, selected navigation, progress updates, and disclosure. Respect `prefers-reduced-motion`.
