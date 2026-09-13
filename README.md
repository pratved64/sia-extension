# Skill Injection Application (SIA)

```
███████╗██╗ █████╗ 
██╔════╝██║██╔══██╗
███████╗██║███████║
╚════██║██║██╔══██║
███████║██║██║  ██║
╚══════╝╚═╝╚═╝  ╚═╝
```

A browser extension for collecting, managing, and copying prompt skills from [skills.sh](https://skills.sh) and GitHub to your clipboard.

## Screenshots

<!-- Place screenshots in docs/screenshots/ -->

| Popup & Skill Management | GitHub Import & Scanning |
| :---: | :---: |
| ![Popup UI](docs/screenshots/popup.png) | ![GitHub Import](docs/screenshots/github-scan.png) |
| *Browse, filter, and 1-click copy skills* | *Automatic repository scanning & blob detection* |

| Drag & Drop Import | Skill Editing |
| :---: | :---: |
| ![Import Flow](docs/screenshots/import.png) | ![Edit Skill](docs/screenshots/edit.png) |
| *Batch import local `.md`/`.txt` files* | *Inline skill editing with duplicate detection* |

## Installation

```bash
npm install
npm run build
npm run build:firefox # for Firefox users
```

Then, go to your browser's extension page, pick `Load Unpacked` and select the directory from the `.output` folder generated (`.output/chrome-mv3` or `.output/firefox-mv2`).

## Stack

- **Framework:** WXT + React 19 + TypeScript
- **Storage:** Dexie.js (IndexedDB)
- **UI:** CSS Modules (Dark theme)

## Features

- **skills.sh Scraping:** Scrape prompt skills directly from [skills.sh](https://skills.sh) pages with Next.js Flight/RSC payload recovery for truncated "Show more" content.
- **GitHub Import & Discovery:** Detect active GitHub tabs, scan repositories for `SKILL.md` files via the GitHub Contents API, and import `SKILL.md` blob pages via a three-tier fetch fallback (`raw` → `api.github.com` → embedded DOM `rawLines`).
- **Local File Import:** Batch import `.md` and `.txt` files with drag-and-drop, preview, editable names, and duplicate warnings.
- **Skill Editing:** Dedicated edit window to update skill names and content with real-time SHA-256 duplicate collision checks.
- **Backup & Export:** Download your entire skill library as a ZIP archive formatted with standard YAML frontmatter (`name`, `source`, `origin`).
- **Manual Selection Capture:** Highlight text on any supported active tab and capture it directly as a skill.
- **Fast Filtering & Search:** Search skills by keyword or filter by origin (`all`, `local`, `remote`).
- **Card Inspector:** Expandable skill cards showing approximate token counts, origin tags, and clean Markdown text.
- **One-Click Copy:** Copy prompt skill content straight to the clipboard.
- **Duplicate Prevention:** Automatic SHA-256 content hashing to prevent duplicate entries.

## Project Structure

```
AGENTS.md         Guidance for AI assistants and contributors
assets/
  icons/          Extension icons (16, 32, 48, 96, 128px)
  logo.txt        ASCII art logo
docs/             Status logs and scraping refactor documentation
entrypoints/
  popup/          Main popup UI — skill list, search, filter, scrape banner
  background.ts   Service worker — manages popup windows and relays messages
  content.ts      Content script injected on skills.sh
  import/         Standalone popup for drag-and-drop batch importing
  edit/           Standalone popup for editing existing skills
components/       React components (SkillCard, SkillList, FilterBar, Toast, etc.)
utils/
  models/db.ts    Dexie schema and database instance
  skills.ts       CRUD operations and SHA-256 hashing
  scraper.ts      DOM scraper for skills.sh with RSC Flight tail trimming
  github.ts       GitHub URL parser, Contents API scanner, and three-tier blob fetcher
  backup.ts       ZIP backup exporter and YAML frontmatter parser
  hooks.ts        React hooks (useSkills live query)
testPages/        Offline HTML regression fixtures (skills.sh and GitHub)
```

## Scripts

```bash
npm run dev           # Start dev server (Chromium)
npm run dev:firefox   # Start dev server (Firefox)
npm run build         # Production build (Chromium)
npm run build:firefox # Production build (Firefox)
npm run zip           # Create production zip (Chromium)
npm run zip:firefox   # Create production zip (Firefox)
npm run compile       # TypeScript type-check
npm run scrape:debug  # Run offline scraper test harness against fixtures
```
