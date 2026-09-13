# Scraping refactor plan — capture the discarded SKILL.md preview

Status: planned, not implemented. Base: `7d56464` on `feat/scraper-fallback`.

## Problem

`expandSkillContent()` in `utils/scraper.ts` returns the RSC `restHtml` payload
only when a "Show more" button is present, discarding the on-page `.prose`
preview. Harness runs (`node debug_scraper.mjs testPages/*.html`) prove
preview and rest are complementary, not overlapping:

| Fixture | Preview | Rest | Full (preview + rest) |
|---|---|---|---|
| agent-browser.html (SAME `payload[0]`) | 772 | 1,471 | ~2.2k |
| fd.html (NEXT `payload[11]`) | 1,459 | 2,414 | ~3.9k |
| ica.html (NEXT `payload[8]`) | 1,063 | 3,857 | ~4.9k |

Boundary evidence (preview tail flows into rest head, no overlap):

- agent-browser: `…points at skills get core. / Specialized skills` →
  `Load a specialized skill…`
- fd: `…Meticulously refined in every detail` →
  `Frontend Aesthetics Guidelines`
- ica: `…note where you experience friction:` →
  `Where does understanding…`

The dropped 772–1,459 chars include the h1, install command, and intro —
roughly 20–30% of each skill. The pre-rewrite harness's
`preview + "\n" + rest` was the correct behavior, lost when `scraper.ts`
was rewritten to return rest only (`a25330c`).

A second issue lives in the same function: production slices the combined
RSC stream to end (`combined.slice(contentStart)`), leaking trailing Flight
JSON (`2e:["$","div"…`, sidebar/meta records) into saved content. The
`cutFlightTail` fix exists only in the `debug_scraper.mjs` harness.

## Decisions already taken

- Join rule: containment check — concatenate only when neither side
  contains the other; otherwise return the longer one.
- No data migration: not meaningfully deployed, so old rest-only hashes
  simply won't dedupe against re-scrapes. Accepted.

## Changes

All in `utils/scraper.ts` unless noted; no signature changes, so
`entrypoints/content.ts` and `entrypoints/popup/App.tsx` need no edits.

1. Add `cutFlightTail(rawHtml: string): string` — port from
   `debug_scraper.mjs` `cutFlightTail` (typed):
   - Stage 1: cut at whitespace Flight-record boundary
     (`/\s[0-9a-zA-Z]{1,4}:(?:\["|I\[|[0-9n])/`).
   - Stage 2: cut at inline `ID:["$",` when index > 200 and earlier than
     the stage-1 boundary (covers `</p>2e:["$",` with no preceding space,
     the agent-browser single-payload layout).
   - Stage 3: truncate after the last HTML close tag when the remaining
     tail matches `/\\?"\]|className|"\$L\d/`.
2. Rework `extractRestHtmlFromRSC()` to handle BOTH layouts (port the
   harness `extractRestHtmlFromRSC`): per-payload loop trying SAME-payload
   inline HTML first (`afterInSame` starts with `<`, length > 100), then
   NEXT-payload, each through `cutFlightTail` + `div.innerHTML` →
   `textContent`; keep combined-slice with `cutFlightTail` as final
   fallback. Signature stays `(): string`.
3. Add `joinSkillContent(preview, rest): string`:
   - Either empty → return the other.
   - `rest.includes(preview)` or `preview.includes(rest)` → return the
     longer (containment guard for future pages that embed preview).
   - Else → `` `${preview}\n${rest}` ``.
4. Update `expandSkillContent()`: `if (restContent) return {
   content: joinSkillContent(previewContent, restContent) }`. Other
   branches unchanged (no "Show more" → preview only; RSC failure →
   preview + truncation warning).
5. Re-sync the `debug_scraper.mjs` mirror: same `cutFlightTail` +
   `joinSkillContent`, and report `preview / rest / final` lengths plus
   `joined: concatenated | contained` mode. CLI/URL logic untouched.

## Verification

- `node debug_scraper.mjs` on all three `testPages/*.html`: expect finals
  ~2.2k / ~3.9k / ~4.9k chars, `leak: no`, exit 0; first/last 120 chars
  remain clean prose.
- `npm run compile` (`tsc --noEmit`) passes.
- Out of scope: `debug-scraper.cjs`, `check-entry-locations.cjs`,
  popup/content messaging, Dexie schema and dossier.
