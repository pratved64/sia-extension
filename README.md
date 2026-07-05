# Sia

```
███████╗██╗ █████╗ 
██╔════╝██║██╔══██╗
███████╗██║███████║
╚════██║██║██╔══██║
███████║██║██║  ██║
╚══════╝╚═╝╚═╝  ╚═╝
```

A browser extension for collecting, managing, and copying prompt skills from [skills.sh](https://skills.sh) to your clipboard.

## Getting Started

```bash
npm install
npm run dev
```

## Stack

- **Framework:** WXT + React 19 + TypeScript
- **Storage:** Dexie.js (IndexedDB)
- **UI:** CSS Modules

## Features

- Import `.md`/`.txt` skill files from your local machine
- Scrape skills directly from skills.sh pages — the content script detects skill pages and extracts the markdown content
- Copy skill content to clipboard with one click
- Expandable cards with token estimates, origin badges (local/remote), and markdown preview
- Duplicate detection via SHA-256 content hashing
- Filter skills by name or origin (local/remote) via a combined search bar and dropdown
- Import via drag-and-drop with preview, editable skill names, and duplicate warnings
- Dark-themed UI using CSS custom properties (no shadows, minimal borders)
- ASCII logo displayed in the popup and import window

## Project Structure

```
AGENTS.md         Guidance for AI assistants and contributors
assets/
  logo.txt          ASCII art logo (imported as raw text)
entrypoints/
  popup/          Main popup UI — skill list, copy, delete, scraped skill banner
  background.ts   Service worker — manages import window, relays messages
  content.ts      Content script injected on skills.sh — scrapes SKILL.md
  import/         Separate popup for importing .md/.txt files from disk
components/       React components (SkillCard, SkillList, Toast, etc.)
utils/
  models/db.ts    Dexie schema and database instance
  skills.ts       CRUD operations for skills (add, delete, hash)
  scraper.ts      DOM scraper for skills.sh (handles "Show more" via RSC payloads)
  hooks.ts        React hooks (useSkills live query)
```

## Scripts

```bash
npm run dev          # Start dev server (Chromium)
npm run dev:firefox  # Start dev server (Firefox)
npm run build        # Production build (Chromium)
npm run build:firefox# Production build (Firefox)
npm run compile      # TypeScript type-check
```
