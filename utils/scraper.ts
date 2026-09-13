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

function cutFlightTail(raw: string): string {
  let cut = raw
  let boundary = cut.search(/\s[0-9a-zA-Z]{1,4}:(?:\["|I\[|[0-9n])/)
  const inline = cut.search(/[0-9a-zA-Z]{1,4}:\["\$",/)
  if (inline > 200 && (boundary < 0 || inline < boundary)) boundary = inline
  if (boundary > 0) cut = cut.slice(0, boundary).trim()
  const closeRe = /<\/(?:p|ul|ol|li|pre|h1|h2|h3|code|span|div|table|thead|tbody|tr|td|th)>/g
  let lastEnd = -1
  let m: RegExpExecArray | null
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

function htmlToText(rawHtml: string): string {
  const div = document.createElement("div")
  div.innerHTML = rawHtml
  return div.textContent?.trim() ?? ""
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

  const combined = payloads.join("\n")
  const restMatch = combined.match(/"restHtml"\s*:\s*"\$(\w+)"/)
  if (!restMatch) return ""

  const entryId = restMatch[1]
  const entryDef = new RegExp(`\\b${entryId}:T([0-9a-f]+),`)

  for (let i = 0; i < payloads.length; i++) {
    const defMatch = payloads[i].match(entryDef)
    if (!defMatch || defMatch.index === undefined) continue
    const afterInSame = payloads[i].slice(defMatch.index + defMatch[0].length).trim()
    if (afterInSame.length > 100 && afterInSame.startsWith("<")) {
      const text = htmlToText(cutFlightTail(afterInSame))
      if (text.length >= 10) return text
    }
    const next = payloads[i + 1]
    if (next && next.length > 100) {
      const cut = cutFlightTail(next.trim())
      if (cut.startsWith("<")) {
        const text = htmlToText(cut)
        if (text.length >= 10) return text
      }
    }
  }

  const defMatch = combined.match(entryDef)
  if (!defMatch || defMatch.index === undefined) return ""

  const raw = cutFlightTail(combined.slice(defMatch.index + defMatch[0].length).trim())

  if (raw.length < 10) return ""

  return htmlToText(raw)
}

function joinSkillContent(preview: string, rest: string): string {
  if (!preview) return rest
  if (!rest) return preview
  if (rest.includes(preview) || preview.includes(rest)) {
    return rest.length >= preview.length ? rest : preview
  }
  return `${preview}\n${rest}`
}

async function expandSkillContent(): Promise<{ content: string; warning?: string }> {
  const previewContent = readSkillMdContent()

  const showMore = findShowMoreButton()
  if (!showMore) {
    return { content: previewContent }
  }

  const restContent = extractRestHtmlFromRSC()

  if (restContent) {
    return { content: joinSkillContent(previewContent, restContent) }
  }

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
