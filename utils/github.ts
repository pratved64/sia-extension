import { parseFrontmatter } from "./backup"

interface GitHubRef {
  owner: string
  repo: string
  kind: "blob" | "tree" | "root" | "other"
  ref: string
  path: string
  isSkillMd: boolean
}

function parseGitHubUrl(url: string): GitHubRef | null {
  let pathname: string
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== "github.com") return null
    pathname = parsed.pathname
  } catch {
    return null
  }

  const parts = pathname.split("/").filter(Boolean)
  if (parts.length < 2) return null
  const [owner, repo] = parts
  if (parts.length === 2) {
    return { owner, repo, kind: "root", ref: "", path: "", isSkillMd: false }
  }

  const mode = parts[2]
  const rest = parts.slice(3)
  if ((mode === "blob" || mode === "tree") && rest.length >= 1) {
    const [ref, ...pathParts] = rest
    if (mode === "blob" && pathParts.length === 0) {
      return { owner, repo, kind: "other", ref: "", path: "", isSkillMd: false }
    }
    const path = pathParts.join("/")
    const fileName = pathParts[pathParts.length - 1] ?? ""
    return {
      owner,
      repo,
      kind: mode,
      ref,
      path,
      isSkillMd: mode === "blob" && fileName.toLowerCase() === "skill.md",
    }
  }

  return { owner, repo, kind: "other", ref: "", path: "", isSkillMd: false }
}

function deriveSkillName(skillPath: string, repo: string): string {
  const segments = skillPath.split("/").filter(Boolean)
  if (segments.length <= 1) return repo
  return segments[segments.length - 2]
}

interface GitHubDraft {
  name: string
  source: string
  content: string
}

function buildGitHubDraft(
  owner: string,
  repo: string,
  skillPath: string,
  markdown: string,
): GitHubDraft {
  const parsed = parseFrontmatter(markdown)
  return {
    name: parsed.name || deriveSkillName(skillPath, repo),
    source: `${owner}/${repo}`,
    content: parsed.content,
  }
}

interface GitHubBlobInput {
  owner: string
  repo: string
  ref: string
  path: string
}

interface GitHubBlobResult {
  markdown: string
  via: "raw" | "api" | "dom"
  rawError?: string
  apiError?: string
}

async function fetchBlobSkillMd(input: GitHubBlobInput): Promise<GitHubBlobResult> {
  function decodeB64(b64: string): string {
    const bin = atob(b64.replace(/\s/g, ""))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new TextDecoder().decode(bytes)
  }

  const encoded = input.path.split("/").map(encodeURIComponent).join("/")
  let rawError: string | undefined
  try {
    const res = await fetch(`https://raw.githubusercontent.com/${input.owner}/${input.repo}/${input.ref}/${encoded}`)
    if (res.ok) {
      const text = (await res.text()).trim()
      if (text.length >= 10) return { markdown: text, via: "raw" }
      rawError = "raw-empty"
    } else {
      rawError = `raw-http-${res.status}`
    }
  } catch (err) {
    rawError = err instanceof Error ? `${err.name}: ${err.message}` : "raw-threw"
  }

  let apiError: string | undefined
  try {
    const apiUrl = `https://api.github.com/repos/${input.owner}/${input.repo}/contents/${encoded}?ref=${encodeURIComponent(input.ref)}`
    const res = await fetch(apiUrl, { headers: { Accept: "application/vnd.github+json" } })
    if (res.ok) {
      const json = await res.json()
      if (typeof json?.content === "string") {
        const text = decodeB64(json.content).trim()
        if (text.length >= 10) return { markdown: text, via: "api", rawError }
        apiError = "api-empty"
      } else {
        apiError = "api-no-content"
      }
    } else {
      apiError = `api-http-${res.status}`
    }
  } catch (err) {
    apiError = err instanceof Error ? `${err.name}: ${err.message}` : "api-threw"
  }

  const scripts = document.querySelectorAll('script[type="application/json"]')
  for (const script of scripts) {
    const text = script.textContent
    if (!text || !text.includes("rawLines")) continue
    try {
      const data = JSON.parse(text)
      const payload = data?.payload
      let rawLines: string[] | undefined
      if (payload) {
        if (Array.isArray(payload["codeViewBlobLayoutRoute.StyledBlob"]?.rawLines)) {
          rawLines = payload["codeViewBlobLayoutRoute.StyledBlob"].rawLines
        } else {
          for (const key of Object.keys(payload)) {
            if (Array.isArray(payload[key]?.rawLines)) {
              rawLines = payload[key].rawLines
              break
            }
          }
        }
      }
      if (Array.isArray(rawLines) && rawLines.length > 0) {
        return {
          markdown: rawLines.join("\n").trim(),
          via: "dom",
          rawError,
          apiError,
        }
      }
    } catch {}
  }

  const root =
    document.querySelector('[data-testid="markdown-body"]') ??
    document.querySelector("article.markdown-body") ??
    document.querySelector(".markdown-body")
  return { markdown: root?.textContent?.trim() ?? "", via: "dom", rawError, apiError }
}

function readPageSelection(): string {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return ""
  return selection.toString().trim()
}

interface GitHubScanInput {
  owner: string
  repo: string
  ref: string
  path: string
}

type GitHubScanResult =
  | { outcome: "single"; markdown: string; skillPath: string; scanned: number }
  | { outcome: "many"; count: number; truncated: boolean; scanned: number }
  | { outcome: "none"; scanned: number }
  | { outcome: "error"; status: number }

async function scanGitHubPage(input: GitHubScanInput): Promise<GitHubScanResult> {
  const MAX_DEPTH = 3
  const MAX_DIRS = 30
  const MAX_HITS = 20
  const MAX_BYTES = 1024 * 1024

  const { owner, repo } = input
  let ref = input.ref
  const startPath = input.path.replace(/^\/+|\/+$/g, "")

  async function getJson(url: string): Promise<{ ok: boolean; status: number; json: any }> {
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } })
    let json: any = null
    try {
      json = await res.json()
    } catch {
      json = null
    }
    return { ok: res.ok, status: res.status, json }
  }

  function decodeB64(b64: string): string {
    const bin = atob(b64.replace(/\s/g, ""))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new TextDecoder().decode(bytes)
  }

  function contentsUrl(path: string): string {
    const encoded = path ? `/${path.split("/").map(encodeURIComponent).join("/")}` : ""
    return `https://api.github.com/repos/${owner}/${repo}/contents${encoded}?ref=${encodeURIComponent(ref)}`
  }

  if (!ref) {
    const repoRes = await getJson(`https://api.github.com/repos/${owner}/${repo}`)
    if (!repoRes.ok) return { outcome: "error", status: repoRes.status }
    ref = repoRes.json?.default_branch ?? "main"
  }

  const hits: string[] = []
  let scanned = 0
  let truncated = false
  const queue: Array<{ path: string; depth: number }> = [{ path: startPath, depth: 0 }]
  let dirsVisited = 0

  while (queue.length > 0 && dirsVisited < MAX_DIRS) {
    const current = queue.shift()
    if (!current) break
    const listing = await getJson(contentsUrl(current.path))
    if (!listing.ok) return { outcome: "error", status: listing.status }
    dirsVisited++
    const entries = Array.isArray(listing.json) ? listing.json : []
    for (const entry of entries) {
      if (entry?.type === "file") {
        scanned++
        if (
          typeof entry.name === "string" &&
          entry.name.toLowerCase() === "skill.md" &&
          typeof entry.size === "number" &&
          entry.size <= MAX_BYTES
        ) {
          if (hits.length < MAX_HITS) hits.push(entry.path)
          else truncated = true
        }
      } else if (entry?.type === "dir" && current.depth < MAX_DEPTH && typeof entry.path === "string") {
        queue.push({ path: entry.path, depth: current.depth + 1 })
      }
    }
    if (hits.length >= MAX_HITS && truncated) break
  }

  if (hits.length === 0) return { outcome: "none", scanned }
  if (hits.length > 1) return { outcome: "many", count: hits.length, truncated, scanned }

  const fileRes = await getJson(contentsUrl(hits[0]))
  if (!fileRes.ok) return { outcome: "error", status: fileRes.status }
  if (typeof fileRes.json?.content !== "string") return { outcome: "error", status: 0 }
  return { outcome: "single", markdown: decodeB64(fileRes.json.content), skillPath: hits[0], scanned }
}

export { parseGitHubUrl, deriveSkillName, buildGitHubDraft }
export { fetchBlobSkillMd, readPageSelection, scanGitHubPage }
export type { GitHubRef, GitHubDraft, GitHubBlobInput, GitHubBlobResult, GitHubScanInput, GitHubScanResult }
