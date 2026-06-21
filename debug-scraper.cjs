#!/usr/bin/env node
const fs = require("fs")
const path = require("path")

const filePath = process.argv[2]
if (!filePath) {
  console.error("Usage: node debug-scraper.js <path-to-html-file>")
  process.exit(1)
}

const html = fs.readFileSync(filePath, "utf-8")
console.log("=".repeat(60))
console.log("RSC Payload Scraper — Debug Mode")
console.log("File:", path.basename(filePath))
console.log("Size:", html.length, "bytes")
console.log("=".repeat(60))

// ── 1. Find all script tags ──
const scriptRegex = /<script>([\s\S]*?)<\/script>/gi
const rawScripts = []
let m
while ((m = scriptRegex.exec(html)) !== null) {
  rawScripts.push(m[1].trim())
}
console.log(`\n[STEP 1] Found ${rawScripts.length} <script> tags total`)

// ── 2. Filter for push calls ──
const pushScripts = rawScripts.filter((s) =>
  s.startsWith("self.__next_f.push"),
)
console.log(`[STEP 2] Push script tags: ${pushScripts.length}`)

if (pushScripts.length === 0) {
  console.log("\n❌ No push calls found. Page may not use RSC streaming.")
  console.log(
    "  First 5 script tag previews:",
    rawScripts.slice(0, 5).map((s) => s.slice(0, 60) + "..."),
  )
  process.exit(0)
}

// ── 3. Parse each push payload ──
const payloads = []
let parseFailures = 0

for (let i = 0; i < pushScripts.length; i++) {
  const raw = pushScripts[i]
  const pushCall = raw.slice("self.__next_f.push(".length)
  const arrStr = pushCall.replace(/\);?\s*$/, "")

  try {
    const arr = JSON.parse(arrStr)
    if (Array.isArray(arr) && arr.length >= 2) {
      payloads.push(String(arr[1]))
    } else {
      console.log(`  ⚠  Push [${i}] parsed but not an array with 2+ items`)
      parseFailures++
    }
  } catch (e) {
    console.log(`  ❌ Push [${i}] JSON.parse failed: ${e.message.slice(0, 80)}`)
    console.log(`     raw end: ...${raw.slice(-40)}`)
    parseFailures++
  }
}

console.log(`[STEP 3] Parsed payloads: ${payloads.length}, failures: ${parseFailures}`)

if (payloads.length === 0) {
  console.log("\n❌ No payloads extracted — check JSON.parse errors above")
  process.exit(0)
}

// ── 4. Log all payload types ──
console.log(`\n[STEP 4] All ${payloads.length} payloads:`)
for (let i = 0; i < payloads.length; i++) {
  const p = payloads[i]
  const first = p.slice(0, 50)
  const entryMatch = p.match(/^(\w+):/)
  const entryId = entryMatch ? entryMatch[1] : "?"
  const type = p.startsWith("\\u") ? "HTML content"
    : p.startsWith("[") || p.startsWith("{") ? "RSC data"
    : /^\w+:T[\da-f]+,$/.test(p) ? "Entry def"
    : /:\w+\[/.test(p) ? "RSC data" : "raw"

  const endsWith = `...${p.slice(-20)}`
  console.log(
    `  [${i.toString().padStart(2)}] ${type.padEnd(12)} id=${entryId}  ${first.slice(0, 50)}  ${endsWith}`,
  )
}

// ── 5. Find restHtml reference ──
console.log(`\n[STEP 5] Searching for restHtml reference ...`)
const combined = payloads.join("")
const restMatch = combined.match(/"restHtml"\s*:\s*"\$(\w+)"/)

if (!restMatch) {
  console.log("  ❌ restHtml reference NOT FOUND in combined payloads")
  // Try to find restHtml anywhere
  const idx = combined.indexOf("restHtml")
  if (idx >= 0) {
    console.log(`  Found 'restHtml' at position ${idx}, context:`)
    console.log(`  ${combined.slice(Math.max(0, idx - 20), idx + 60)}`)
  } else {
    console.log("  String 'restHtml' not found anywhere in payloads")
    // Check if previewHtml exists instead
    const prevMatch = combined.match(/"previewHtml"\s*:\s*"\$(\w+)"/)
    if (prevMatch) {
      console.log(`  Found previewHtml referencing $${prevMatch[1]} but no restHtml`)
    }
  }
  process.exit(0)
}

const entryId = restMatch[1]
console.log(`  ✅ restHtml references entry: $${entryId}`)

// ── 6. Find the referenced entry's content ──
console.log(`\n[STEP 6] Looking for entry definition '${entryId}:T...' ...`)

let foundEntry = false
let restHtml = ""

const entryDef = new RegExp(`\\b${entryId}:T[0-9a-f]+,`)
for (let i = 0; i < payloads.length - 1; i++) {
  if (entryDef.test(payloads[i])) {
    foundEntry = true
    restHtml = payloads[i + 1] || ""
    console.log(`  ✅ Found at payloads[${i}]: ${payloads[i]}`)
    console.log(`  Content payloads[${i + 1}]: ${restHtml.length} chars`)
    console.log(`  Content preview: ${restHtml.slice(0, 100).replace(/\n/g, "\\n")}`)
    break
  }
}

if (!foundEntry) {
  console.log(`  ❌ Entry definition '${entryId}:T...' not found in payloads`)
  // Search for any occurrence of the entry ID in payloads
  const similar = payloads.filter((p) => p.includes(`${entryId}:T`))
  console.log(`  Payloads containing '${entryId}:T':`, similar)
  process.exit(0)
}

if (!restHtml || restHtml.length < 10) {
  console.log(`  ❌ Content too short (${restHtml?.length || 0} chars)`)
  process.exit(0)
}

// ── 7. Check if page has "Show more" button ──
console.log(`\n[STEP 7] Checking for "Show more" button in HTML ...`)
const hasShowMore = html.includes("Show more")
console.log(`  Show more button: ${hasShowMore ? "YES" : "NO (content may already be expanded)"}`)

// ── 8. Extract preview content from DOM ──
console.log(`\n[STEP 8] Checking for .prose content in HTML ...`)
const proseMatch = html.match(/<div[^>]*class="[^"]*prose[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div\s+class="relative"/)
if (proseMatch) {
  const proseContent = proseMatch[1].replace(/<[^>]+>/g, "").trim()
  console.log(`  .prose text content: ${proseContent.length} chars`)
  console.log(`  Preview: ${proseContent.slice(0, 80).replace(/\n/g, "\\n")}...`)
} else {
  console.log("  .prose div not found via regex (may be different structure)")
}

// ── 9. Decode rest HTML to text ──
console.log(`\n[STEP 9] Decoding rest HTML to text ...`)

// Convert HTML entities
function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
}

// Strip HTML tags
const restText = restHtml.replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim()
const cleanText = decodeHtmlEntities(restText)

console.log(`  Rest text content: ${cleanText.length} chars`)
console.log(`  Preview: ${cleanText.slice(0, 100)}...`)

// ── 10. Output final result ──
console.log("\n" + "=".repeat(60))
console.log("FINAL EXTRACTED CONTENT")
console.log("=".repeat(60))
console.log(`\n${cleanText}`)
console.log("\n" + "=".repeat(60))
console.log(`Total rest content length: ${cleanText.length} chars`)
console.log("=".repeat(60))
