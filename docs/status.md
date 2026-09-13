# Current Status

## Task
Finish GitHub SKILL.md blob import with three-tier fetch: raw → Contents API → DOM.

## Last Blocker
Firefox injected fetch failed (`TypeError: NetworkError`) causing DOM fallback and frontmatter-as-prose in body. Both URLs load in browser, so it's a content-script fetch reliability issue.

## Next
1. Extend `fetchBlobSkillMd` to raw → API → DOM
2. Log `via=raw|api|dom` and errors
3. Add regression fixture for failing blob page
4. Verify via Node tests + `npm run compile`
5. Reimport problematic skill on Firefox after fix
