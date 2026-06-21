import { readFileSync } from "fs"
import { JSDOM } from "jsdom"

const html = readFileSync(new URL("sample.html", import.meta.url), "utf-8")
const dom = new JSDOM(html, { url: "https://skills.sh/anthropics/skills/frontend-design" })
const document = dom.window.document

// --- extractRestHtmlFromRSC (exact copy from scraper.ts) ---
function extractRestHtmlFromRSC() {
  const payloads = []

  for (const script of document.querySelectorAll("script")) {
    const text = script.textContent?.trim() || ""
    if (!text.startsWith("self.__next_f.push")) continue

    const arrStr = text.slice("self.__next_f.push(".length).replace(/\);?\s*$/, "")
    try {
      const arr = JSON.parse(arrStr)
      if (Array.isArray(arr) && arr.length >= 2) {
        payloads.push(String(arr[1]))
      }
    } catch {
      console.log("  [SKIP] JSON.parse failed for:", text.slice(0, 60) + "...")
    }
  }

  console.log("\nAll parsed payloads:")
  for (let i = 0; i < payloads.length; i++) {
    const p = payloads[i]
    console.log(`  [${i}] len=${p.length} preview: ${p.slice(0, 80)}`)
  }

  if (payloads.length === 0) return ""

  const combined = payloads.join("")
  const restMatch = combined.match(/"restHtml"\s*:\s*"\$(\w+)"/)
  if (!restMatch) {
    console.log("\nNo restHtml reference found in combined payloads!")
    console.log("Searching combined string for 'restHtml'...")
    const idx = combined.indexOf("restHtml")
    if (idx >= 0) {
      console.log("Found at position", idx, "context:", combined.slice(idx, idx + 40))
    } else {
      console.log("'restHtml' not found at all!")
    }
    return ""
  }

  const entryId = restMatch[1]
  console.log(`\nFound restHtml entry: $${entryId}`)

  for (let i = 0; i < payloads.length - 1; i++) {
    if (payloads[i].startsWith(`${entryId}:T`)) {
      const html = payloads[i + 1]
      if (!html || html.length < 10) continue
      const div = document.createElement("div")
      div.innerHTML = html
      const textContent = div.textContent?.trim() || ""
      console.log(`Content for entry $${entryId} (raw HTML, ${html.length} chars)`)
      console.log("  Raw HTML starts:", html.slice(0, 120))
      console.log("  Text content starts:", textContent.slice(0, 120))
      return textContent
    }
  }

  console.log(`No content found for entry $${entryId}`)
  return ""
}

// --- findSkillSection / readSkillMdContent (exact copy) ---
function findSkillSection() {
  const sections = document.querySelectorAll(".bg-background")
  for (const s of sections) {
    if (s.textContent?.includes("SKILL.md")) return s
  }
  return null
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
  const buttons = section.querySelectorAll("button")
  for (const b of buttons) {
    if (b.textContent?.trim() === "Show more") return b
  }
  return null
}

// --- expandSkillContent (exact copy) ---
async function expandSkillContent() {
  const previewContent = readSkillMdContent()
  console.log("\nPreview content from DOM .prose:")
  console.log("  Length:", previewContent.length)
  console.log("  Last 80 chars:", previewContent.slice(-80))

  const showMore = findShowMoreButton()
  console.log("\nShow more button found:", !!showMore)

  if (!showMore) {
    console.log("[scraper] No Show more button — content is already expanded")
    return previewContent
  }

  console.log("[scraper] Extracting rest content from RSC payload...")
  const restContent = extractRestHtmlFromRSC()

  if (restContent) {
    const fullContent = previewContent + "\n" + restContent
    console.log("\nFinal assembled content:")
    console.log("  Total length:", fullContent.length)
    console.log("  Contains 'Frontend Aesthetics Guidelines':", fullContent.includes("Frontend Aesthetics Guidelines"))
    console.log("  Contains 'Meticulously refined in every detail':", fullContent.includes("Meticulously refined in every detail"))
    console.log("  Contains 'creatively and make unexpected choices':", fullContent.includes("creatively and make unexpected choices"))
    return fullContent
  }

  console.warn("[scraper] RSC extraction returned nothing, using preview only")
  return previewContent
}

// --- scrapeSkillPage (exact copy) ---
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
  console.log("Page info: org=%s repo=%s slug=%s name=%s", org, repo, slug, name)

  if (!findSkillSection()) {
    console.warn("[scraper] SKILL.md section not found on page")
    return null
  }

  const content = await expandSkillContent()
  if (!content) {
    console.warn("[scraper] No content extracted from SKILL.md section")
    return null
  }

  console.log("\n=== SCRAPE RESULT ===")
  console.log("name:", name)
  console.log("source:", source)
  console.log("content length:", content.length)
  console.log("content:", content)

  return { name, content, source }
}

scrapeSkillPage().catch(console.error)
