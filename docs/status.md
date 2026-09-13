# Current Status

## Task
Finish GitHub SKILL.md blob import with three-tier fetch: raw → Contents API → DOM.

## Blocker Resolved
- Injected `fetch` to `raw.githubusercontent.com` on Firefox was blocked by page CSP (`TypeError: NetworkError`).
- Implemented three-tier fallback in `fetchBlobSkillMd`:
  1. `raw.githubusercontent.com` fetch.
  2. `api.github.com/repos/:owner/:repo/contents/:path` fetch (allowed by GitHub page CSP) with base64 decoding.
  3. Enhanced DOM extraction: extracts clean unrendered markdown from `react-app.embeddedData` (`codeViewBlobLayoutRoute.StyledBlob.rawLines`) before falling back to `.markdown-body` text content, preventing frontmatter-as-table distortion.
- Logged `via=raw|api|dom` along with `rawError` and `apiError`.
- Verified DOM raw lines extraction and frontmatter parsing against `testPages/github-blob-skill.html`.

## Next
1. Reimport skill on Firefox tab to verify live execution (`npm run dev:firefox`).

