export interface ScrapedSkill {
  name: string
  content: string
  source: string
  warning?: string
}

function findSkillSection(): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>(".bg-background")).find(
      (s) => s.textContent?.includes("SKILL.md"),
    ) ?? null
  )
}

function readSkillMdContent(): string {
  const section = findSkillSection()
  if (!section) return ""
  const prose = section.querySelector<HTMLElement>(".prose")
  return prose?.textContent?.trim() ?? ""
}

function findShowMoreButton(): HTMLButtonElement | null {
  const section = findSkillSection()
  if (!section) return null
  return (
    Array.from(section.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Show more",
    ) ?? null
  )
}

function extractRestHtmlFromRSC(): string {
  const payloads: string[] = []

  for (const script of document.querySelectorAll("script")) {
    const text = script.textContent?.trim() || ""
    if (!text.startsWith("self.__next_f.push")) continue

    const arrStr = text.slice("self.__next_f.push(".length).replace(/\);?\s*$/, '')
    try {
      const arr = JSON.parse(arrStr)
      if (Array.isArray(arr) && arr.length >= 2) {
        payloads.push(String(arr[1]))
      }
    } catch {
      // skip malformed pushes
    }
  }

  if (payloads.length === 0) return ""

  const combined = payloads.join("")
  const restMatch = combined.match(/"restHtml"\s*:\s*"\$(\w+)"/)
  if (!restMatch) return ""

  const entryId = restMatch[1]

  const entryDef = new RegExp(`\\b${entryId}:T[0-9a-f]+,`)
  for (let i = 0; i < payloads.length - 1; i++) {
    if (entryDef.test(payloads[i])) {
      const html = payloads[i + 1]
      if (!html || html.length < 10) continue
      const div = document.createElement("div")
      div.innerHTML = html
      return div.textContent?.trim() || ""
    }
  }

  return ""
}

async function expandSkillContent(): Promise<{ content: string; warning?: string }> {
  const previewContent = readSkillMdContent()

  const showMore = findShowMoreButton()
  if (!showMore) {
    console.log("[scraper] No Show more button — content is already expanded")
    return { content: previewContent }
  }

  console.log("[scraper] Extracting rest content from RSC payload...")
  const restContent = extractRestHtmlFromRSC()

  if (restContent) {
    const fullContent = previewContent + "\n" + restContent
    console.log("[scraper] Full content assembled — length:", fullContent.length)
    return { content: fullContent }
  }

  console.warn("[scraper] RSC extraction returned nothing, using preview only")
  return { content: previewContent, warning: "Content may be truncated — check the skill" }
}

export async function scrapeSkillPage(): Promise<ScrapedSkill | null> {
  const pathParts = window.location.pathname.split("/").filter(Boolean)
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

  const { content, warning } = await expandSkillContent()
  if (!content) {
    console.warn("[scraper] No content extracted from SKILL.md section")
    return null
  }

  console.log("[scraper] Scraped — name:", name, "content length:", content.length)
  return { name, content, source, ...(warning ? { warning } : {}) }
}
