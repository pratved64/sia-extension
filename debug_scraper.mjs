import { existsSync, readFileSync } from "fs"
import { basename, resolve } from "path"
import { JSDOM } from "jsdom"

const FALLBACK_URLS = {
  "agent-browser.html": "https://www.skills.sh/vercel-labs/agent-browser/agent-browser",
  "fd.html": "https://www.skills.sh/anthropics/skills/frontend-design",
  "ica.html": "https://www.skills.sh/mattpocock/skills/improve-codebase-architecture",
}

function usage() {
  console.error("Usage: node debug_scraper.mjs <fixture.html> [page-url]")
  console.error("Examples:")
  console.error("  node debug_scraper.mjs testPages/fd.html")
  console.error("  node debug_scraper.mjs testPages/fd.html https://www.skills.sh/anthropics/skills/frontend-design")
  console.error("  npm run scrape:debug -- testPages/fd.html")
}

const fixtureArg = process.argv[2]
if (!fixtureArg) {
  usage()
  process.exit(2)
}

const fixturePath = resolve(process.cwd(), fixtureArg)
if (!existsSync(fixturePath)) {
  console.error(`Fixture not found: ${fixturePath}`)
  usage()
  process.exit(2)
}

const html = readFileSync(fixturePath, "utf-8")
const explicitUrl = process.argv[3]
const canonicalMatch = html.match(/rel="canonical" href="([^"]+)"/)
const fallbackUrl = FALLBACK_URLS[basename(fixturePath)] ?? "https://www.skills.sh/anthropics/skills/frontend-design"
const pageUrl = explicitUrl ?? canonicalMatch?.[1] ?? fallbackUrl

console.log("=".repeat(60))
console.log("Scraper Harness — JSDOM Mode")
console.log("File:", basename(fixturePath))
console.log("Size:", html.length, "bytes")
console.log("URL:", pageUrl, explicitUrl ? "(explicit)" : canonicalMatch ? "(canonical)" : "(fallback)")
console.log("=".repeat(60))

const dom = new JSDOM(html, { url: pageUrl })
const document = dom.window.document

function findSkillSection() {
  return (
    Array.from(document.querySelectorAll(".bg-background")).find((s) =>
      s.textContent?.includes("SKILL.md"),
    ) ?? null
  )
}

function readSkillMdContent() {
  const section = findSkillSection()
  if (!section) return ""
  const prose = section.querySelector(".prose")
  return prose?.textContent?.trim() ?? ""
}

function findShowMoreButton() {
  const section = findSkillSection()
  if (!section) return null
  return (
    Array.from(section.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Show more",
    ) ?? null
  )
}

function collectRscPayloads() {
  const payloads = []
  let failures = 0
  for (const script of document.querySelectorAll("script")) {
    const text = script.textContent?.trim() || ""
    if (!text.startsWith("self.__next_f.push")) continue
    const arrStr = text.slice("self.__next_f.push(".length).replace(/\);?\s*$/, "")
    try {
      const arr = JSON.parse(arrStr)
      if (Array.isArray(arr) && arr.length >= 2) {
        payloads.push(String(arr[1]))
      } else {
        failures++
      }
    } catch {
      failures++
    }
  }
  return { payloads, failures }
}

function cutFlightTail(raw) {
  let cut = raw
  let boundary = cut.search(/\s[0-9a-zA-Z]{1,4}:(?:\["|I\[|[0-9n])/)
  const inline = cut.search(/[0-9a-zA-Z]{1,4}:\["\$",/)
  if (inline > 200 && (boundary < 0 || inline < boundary)) boundary = inline
  if (boundary > 0) cut = cut.slice(0, boundary).trim()
  const closeRe = /<\/(?:p|ul|ol|li|pre|h1|h2|h3|code|span|div|table|thead|tbody|tr|td|th)>/g
  let lastEnd = -1
  let m
  while ((m = closeRe.exec(cut)) !== null) {
    const after = cut.slice(m.index + m[0].length, m.index + m[0].length + 10)
    if (after.trim() && !after.trimStart().startsWith("<")) {
      lastEnd = m.index + m[0].length
    } else if (m.index + m[0].length === cut.length || m.index + m[0].length > lastEnd) {
      lastEnd = m.index + m[0].length
    }
  }
  if (lastEnd > 0) {
    const tail = cut.slice(lastEnd)
    if (tail.length > 0 && /\\?"\]|className|"\$L\d/.test(tail)) {
      cut = cut.slice(0, lastEnd).trim()
    }
  }
  return cut
}

function htmlToText(rawHtml) {
  const div = document.createElement("div")
  div.innerHTML = rawHtml
  return div.textContent?.trim() ?? ""
}

function extractRestHtmlFromRSC(payloads) {
  const combined = payloads.join("\n")
  const restMatch = combined.match(/"restHtml"\s*:\s*"\$(\w+)"/)
  if (!restMatch) return { text: "", entryId: null, strategy: "no-restHtml-ref" }
  const entryId = restMatch[1]
  const defRe = new RegExp(`\\b${entryId}:T([0-9a-f]+),`)

  for (let i = 0; i < payloads.length; i++) {
    const defMatch = payloads[i].match(defRe)
    if (!defMatch || defMatch.index === undefined) continue
    const afterInSame = payloads[i].slice(defMatch.index + defMatch[0].length).trim()
    if (afterInSame.length > 100 && afterInSame.startsWith("<")) {
      const cut = cutFlightTail(afterInSame)
      const text = htmlToText(cut)
      if (text.length >= 10) return { text, entryId, strategy: `SAME payload[${i}]` }
    }
    const next = payloads[i + 1]
    if (next && next.length > 100) {
      const cut = cutFlightTail(next.trim())
      if (cut.startsWith("<")) {
        const text = htmlToText(cut)
        if (text.length >= 10) return { text, entryId, strategy: `NEXT payload[${i + 1}]` }
      }
    }
  }

  const defMatch = combined.match(defRe)
  if (!defMatch || defMatch.index === undefined) {
    return { text: "", entryId, strategy: "entry-def-not-found" }
  }
  const raw = cutFlightTail(combined.slice(defMatch.index + defMatch[0].length).trim())
  if (raw.length < 10) return { text: "", entryId, strategy: "combined-too-short" }
  const text = htmlToText(raw)
  if (!text) return { text: "", entryId, strategy: "combined-unparseable" }
  return { text, entryId, strategy: "combined-slice" }
}

function joinSkillContent(preview, rest) {
  if (!preview) return { content: rest, mode: "rest-only" }
  if (!rest) return { content: preview, mode: "preview-only" }
  if (rest.includes(preview) || preview.includes(rest)) {
    return {
      content: rest.length >= preview.length ? rest : preview,
      mode: "contained",
    }
  }
  return { content: `${preview}\n${rest}`, mode: "concatenated" }
}

async function expandSkillContent() {
  const previewContent = readSkillMdContent()
  const showMore = findShowMoreButton()
  if (!showMore) return { content: previewContent, previewContent, restText: "", strategy: "no-show-more", mode: "preview-only" }
  const { payloads } = collectRscPayloads()
  const { text: restText, strategy } = extractRestHtmlFromRSC(payloads)
  if (restText) {
    const { content, mode } = joinSkillContent(previewContent, restText)
    return { content, previewContent, restText, strategy, mode }
  }
  return {
    content: previewContent,
    previewContent,
    restText: "",
    strategy,
    mode: "preview-only",
    warning: "Content may be truncated — check the skill",
  }
}

async function scrapeSkillPage() {
  const pathParts = dom.window.location.pathname.split("/").filter(Boolean)
  if (pathParts.length < 3) {
    console.log("[scraper] Not a skill page — < 3 path segments")
    return null
  }
  const org = pathParts[0]
  const repo = pathParts[1]
  const slug = pathParts[2]
  const h1 = document.querySelector("h1")
  const name = h1?.textContent?.trim() ?? slug
  const source = `${org}/${repo}`
  if (!findSkillSection()) {
    console.warn("[scraper] SKILL.md section not found on page")
    return null
  }
  const { content, warning, previewContent, restText, strategy, mode } = await expandSkillContent()
  if (!content) {
    console.warn("[scraper] No content extracted from SKILL.md section")
    return null
  }
  return { name, source, content, warning, previewContent, restText, strategy, mode }
}

const { payloads, failures } = collectRscPayloads()
console.log(`\n[STEP 1] Push payloads: ${payloads.length}, parse failures: ${failures}`)
payloads.forEach((p, i) => {
  const entryMatch = p.match(/^(\w+):/)
  console.log(`  [${i}] len=${p.length} id=${entryMatch ? entryMatch[1] : "?"} preview=${p.slice(0, 60).replace(/\n/g, "\\n")}`)
})

const section = findSkillSection()
console.log(`\n[STEP 2] SKILL.md section: ${section ? "FOUND" : "MISSING"}`)
console.log(`[STEP 3] Show more button: ${findShowMoreButton() ? "YES" : "NO"}`)

const result = await scrapeSkillPage()
if (!result) {
  console.error("\nSCRAPE RESULT: null (see warnings above)")
  process.exit(1)
}

const leakPattern = /:\["\$",null|className":"(grid|bg-background)/
const leaked = leakPattern.test(result.content)
console.log("\n=== SCRAPE RESULT ===")
console.log("name:", result.name)
console.log("source:", result.source)
console.log("strategy:", result.strategy)
console.log("joined:", result.mode)
console.log("preview length:", result.previewContent.length)
console.log("rest text length:", result.restText.length)
console.log("final content length:", result.content.length)
console.log("rest longer than preview:", result.restText.length > result.previewContent.length)
console.log("Flight JSON leak:", leaked ? "YES — tail not cut cleanly" : "no")
console.log("warning:", result.warning ?? "(none)")
console.log("first 120 chars:", result.content.slice(0, 120).replace(/\n/g, "\\n"))
console.log("last 120 chars:", result.content.slice(-120).replace(/\n/g, "\\n"))

if (leaked) process.exit(1)
