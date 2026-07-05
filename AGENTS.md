# Sia — Agent Guide

## Identity
Browser extension for collecting, managing, and copying prompt skills from [skills.sh](https://skills.sh).

## Stack
- WXT + React 19 + TypeScript
- Dexie.js (IndexedDB) with live queries via `useLiveQuery`
- CSS Modules with a custom dark design system

## Architecture

| Layer | File |
|---|---|
| Popup UI | `entrypoints/popup/App.tsx` |
| Background worker | `entrypoints/background.ts` — manages import window, relays messages |
| Content script | `entrypoints/content.ts` — scrapes skills.sh pages |
| Import UI | `entrypoints/import/App.tsx` — React preview + drag-and-drop flow |
| DB schema | `utils/models/db.ts` — Skill: name, source, content, hash, savedAt, origin |
| CRUD + hashing | `utils/skills.ts` |
| Scraper logic | `utils/scraper.ts` — handles RSC payload "Show more" |
| React hooks | `utils/hooks.ts` — `useSkills(search, originFilter)` live query |

## CSS Design System
Use CSS variables from `App.module.css`:
- `--bg-app` / `--bg-card` — dark backgrounds
- `--border-subtle` — 1px border color
- `--accent-local` / `--accent-remote` — origin badge colors
- `--font-ui` / `--font-mono` — font stacks
- No box-shadows; only 1px borders for separation

## Coding Conventions
- React functional components with explicit prop interfaces
- CSS Modules, kebab-case class names (`.skillListEmpty`, `.cardMetaRow`)
- Imports use `@/` path alias
- No comments in source code
- SVGs for icons (no emoji text characters)
- `opacity` for hover states on secondary actions (copy icon: 0.5 / 1)
- Expand/collapse uses `max-height` + `visibility` transitions (not grid rows)

## Key Decisions
- `source` stores the origin string (e.g. `"org/repo"`); `origin` is `"local"` or `"remote"`
- `"local"` skills skip redundant source text in meta; remote skills show `org/repo [remote]`
- Empty state: default "No skills yet..." ; "No matches found" when a filter/search is active
- Import flow converted to React for clean state management (idle → preview → done → auto-close)
- Expanded card content uses `max-height` + `visibility` (not `grid-template-rows`) to avoid subpixel content bleeding

## Scripts
- `npm run dev` — Chromium dev server
- `npm run compile` — `tsc --noEmit`
- `npm run build` — prod build
