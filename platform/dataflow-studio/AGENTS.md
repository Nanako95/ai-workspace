# DataFlow Agent Guide

## Goal

Maintain a compact, practical Chinese CSV cleaning application. Preserve local-only data processing unless the user explicitly requests a backend.

## Commands

```powershell
npm install
npm run dev -- --port 4317
npm run build -- --base=./
```

## Product Rules

- Keep the interface dense and work-focused; avoid oversized cards and headings.
- Cleaning rules must support add, delete, enable/disable, drag reorder, and multi-field selection.
- Never send imported CSV contents to a server.
- Keep GitHub Pages deployment working with a relative Vite base.
- Validate changes with a production build and a desktop/mobile browser check.

## Key Files

- `src/main.jsx`: data model, cleaning behavior, and React UI
- `src/styles.css`: base application styling
- `src/compact-rules.css`, `src/drag-rules.css`, `src/multi-field.css`: rule editor styling
- `public/manifest.webmanifest`, `public/sw.js`: installable/offline app support
- `.github/workflows/deploy-pages.yml`: GitHub Pages deployment
