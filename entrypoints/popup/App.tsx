import { useState, useCallback, useEffect, useRef } from "react"
import { useSkills } from "@/utils/hooks"
import { addSkill, deleteSkill, hashContent } from "@/utils/skills"
import { downloadBackup } from "@/utils/backup"
import {
  parseGitHubUrl,
  scanGitHubPage,
  fetchBlobSkillMd,
  readPageSelection,
  buildGitHubDraft,
  deriveSkillName,
  type GitHubRef,
} from "@/utils/github"
import { db } from "@/utils/models/db"
import logoSrc from "@/assets/logo.txt?raw"
import ImportButton from "@/components/ImportButton"
import BackupButton from "@/components/BackupButton"
import FilterBar from "@/components/FilterBar"
import SkillList from "@/components/SkillList"
import AddPrompt from "@/components/AddPrompt"
import Toast from "@/components/Toast"
import styles from "./App.module.css"

type ScrapeState =
  | { status: "idle" }
  | { status: "scraping" }
  | { status: "scraped"; name: string; source: string; content: string; isDuplicate: boolean }
  | { status: "failed"; name: string; source: string }
  | { status: "selecting"; name: string; source: string }
  | { status: "selected"; name: string; source: string; content: string; isDuplicate: boolean }
  | { status: "github-scanning"; scope: string }
  | { status: "github-many"; owner: string; repo: string; count: number }
  | { status: "github-empty"; owner: string; repo: string; scanned: number }
  | { status: "github-unreachable"; owner: string; repo: string; reason: string }

function parsePageFromUrl(url: string): { name: string; source: string } | null {
  const match = url.match(/skills\.sh\/([^/]+)\/([^/]+)\/([^/]+)/)
  if (!match) return null
  return { name: match[3], source: `${match[1]}/${match[2]}` }
}

function App() {
  const [search, setSearch] = useState("")
  const [originFilter, setOriginFilter] = useState<"all" | "local" | "remote">("all")
  const skills = useSkills(search, originFilter)
  const [toast, setToast] = useState<{ message: string; key: number } | null>(null)
  const [scrapeState, setScrapeState] = useState<ScrapeState>({ status: "idle" })
  const tabIdRef = useRef<number | null>(null)
  const tabKindRef = useRef<"skills" | "github">("skills")

  const showToast = useCallback((message: string) => {
    setToast({ message, key: Date.now() })
  }, [])

  const githubScanReason = useCallback((status: number): string => {
    if (status === 404) return "Not found — private repository or missing page."
    if (status === 403) return "GitHub API rate limit reached — try again later."
    if (status === 0) return "Couldn't decode the skill file."
    return `GitHub API error ${status}.`
  }, [])

  const runGitHubScan = useCallback(async (tabId: number, gh: GitHubRef) => {
    try {
      if (gh.kind === "blob") {
        const [injection] = await browser.scripting.executeScript({
          target: { tabId },
          func: fetchBlobSkillMd,
          args: [{ owner: gh.owner, repo: gh.repo, ref: gh.ref, path: gh.path }],
        })
        const blob = injection?.result
        const markdown = blob?.markdown?.trim() ?? ""
        console.info(
          `[github] blob ${gh.owner}/${gh.repo}/${gh.path} via=${blob?.via ?? "unknown"}` +
            (blob?.rawError ? ` rawError=${blob.rawError}` : "") +
            (blob?.apiError ? ` apiError=${blob.apiError}` : ""),
        )
        if (!markdown) {
          setScrapeState({
            status: "failed",
            name: deriveSkillName(gh.path, gh.repo),
            source: `${gh.owner}/${gh.repo}`,
          })
          return
        }
        const draft = buildGitHubDraft(gh.owner, gh.repo, gh.path, markdown)
        const hash = await hashContent(draft.content)
        const existing = await db.skills.where("hash").equals(hash).first()
        setScrapeState({
          status: "scraped",
          name: draft.name,
          source: draft.source,
          content: draft.content,
          isDuplicate: !!existing,
        })
        return
      }

      const [injection] = await browser.scripting.executeScript({
        target: { tabId },
        func: scanGitHubPage,
        args: [{ owner: gh.owner, repo: gh.repo, ref: gh.ref, path: gh.path }],
      })
      const result = injection?.result
      if (!result) {
        setScrapeState({
          status: "github-unreachable",
          owner: gh.owner,
          repo: gh.repo,
          reason: "Couldn't read this page.",
        })
        return
      }
      if (result.outcome === "single") {
        const draft = buildGitHubDraft(gh.owner, gh.repo, result.skillPath, result.markdown)
        const hash = await hashContent(draft.content)
        const existing = await db.skills.where("hash").equals(hash).first()
        setScrapeState({
          status: "scraped",
          name: draft.name,
          source: draft.source,
          content: draft.content,
          isDuplicate: !!existing,
        })
      } else if (result.outcome === "many") {
        setScrapeState({ status: "github-many", owner: gh.owner, repo: gh.repo, count: result.count })
      } else if (result.outcome === "none") {
        setScrapeState({ status: "github-empty", owner: gh.owner, repo: gh.repo, scanned: result.scanned })
      } else {
        setScrapeState({
          status: "github-unreachable",
          owner: gh.owner,
          repo: gh.repo,
          reason: githubScanReason(result.status),
        })
      }
    } catch {
      setScrapeState({
        status: "github-unreachable",
        owner: gh.owner,
        repo: gh.repo,
        reason: "Couldn't run on this tab.",
      })
    }
  }, [githubScanReason])

  useEffect(() => {
    browser.runtime.sendMessage({ type: "get-last-import" }).then((res: any) => {
      if (res?.result) showToast(res.result)
    })
    browser.runtime.sendMessage({ type: "get-last-edit" }).then((res: any) => {
      if (res?.result) showToast(res.result)
    })
  }, [showToast])

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const tab = tabs[0]
      if (!tab?.url || !tab.id) return
      if (/^https?:\/\/(www\.)?skills\.sh\//.test(tab.url)) {
        tabIdRef.current = tab.id
        tabKindRef.current = "skills"
        setScrapeState({ status: "scraping" })

        const pageInfo = parsePageFromUrl(tab.url)

        browser.tabs
          .sendMessage(tab.id, { type: "scrape-skill" })
          .then(async (skill: any) => {
            if (!skill) {
              if (pageInfo) {
                setScrapeState({ status: "failed", name: pageInfo.name, source: pageInfo.source })
              }
              return
            }

            if (skill.warning) showToast(skill.warning)

            const hash = await hashContent(skill.content)
            const existing = await db.skills.where("hash").equals(hash).first()

            setScrapeState({
              status: "scraped",
              name: skill.name,
              source: skill.source,
              content: skill.content,
              isDuplicate: !!existing,
            })
          })
          .catch(() => {
            if (pageInfo) {
              setScrapeState({ status: "failed", name: pageInfo.name, source: pageInfo.source })
            }
          })
        return
      }

      const gh = parseGitHubUrl(tab.url)
      if (!gh || gh.kind === "other") return
      if (gh.kind === "blob" && !gh.isSkillMd) return

      tabIdRef.current = tab.id
      tabKindRef.current = "github"
      const scope = gh.kind === "blob" ? "SKILL.md" : `${gh.owner}/${gh.repo}${gh.path ? `/${gh.path}` : ""}`
      setScrapeState({ status: "github-scanning", scope })
      runGitHubScan(tab.id, gh)
    })
  }, [runGitHubScan, showToast])

  const handleAdd = useCallback(async () => {
    let name: string, source: string, content: string
    if (scrapeState.status === "scraped") {
      ;({ name, source, content } = scrapeState)
    } else if (scrapeState.status === "selected") {
      ;({ name, source, content } = scrapeState)
    } else return

    const result = await addSkill(name, source, content, "remote")
    showToast(result ? "Added!" : "Already saved")
    setScrapeState({ status: "idle" })
  }, [scrapeState, showToast])

  const handleDismiss = useCallback(() => {
    setScrapeState({ status: "idle" })
  }, [])

  const handleSelectManually = useCallback(() => {
    if (scrapeState.status !== "failed") return
    const tabId = tabIdRef.current
    if (!tabId) return

    setScrapeState({ status: "selecting", name: scrapeState.name, source: scrapeState.source })
    if (tabKindRef.current === "skills") {
      browser.tabs.sendMessage(tabId, { type: "show-selection-ui" }).catch(() => {})
    }
  }, [scrapeState])

  const handleCaptureSelection = useCallback(async () => {
    const tabId = tabIdRef.current
    if (!tabId || scrapeState.status !== "selecting") return

    try {
      const content =
        tabKindRef.current === "github"
          ? ((await browser.scripting.executeScript({ target: { tabId }, func: readPageSelection }))[0]?.result?.trim() ?? "")
          : (((await browser.tabs.sendMessage(tabId, { type: "get-selection" })) as { content: string })?.content?.trim() ?? "")

      if (!content) {
        showToast("No text selected — try selecting again")
        return
      }

      const hash = await hashContent(content)
      const existing = await db.skills.where("hash").equals(hash).first()

      setScrapeState({
        status: "selected",
        name: scrapeState.name,
        source: scrapeState.source,
        content,
        isDuplicate: !!existing,
      })
    } catch {
      showToast("Could not read selection")
    }
  }, [scrapeState, showToast])

  const handleCopy = useCallback(
    async (content: string) => {
      await navigator.clipboard.writeText(content)
      showToast("Copied!")
    },
    [showToast],
  )

  const handleDelete = useCallback(async (id: number) => {
    await deleteSkill(id)
  }, [])

  const handleBackup = useCallback(async () => {
    const count = await downloadBackup()
    showToast(count === null ? "Nothing to back up" : `Backed up ${count} ${count === 1 ? "skill" : "skills"}`)
  }, [showToast])

  const handleEdit = useCallback((id: number) => {
    browser.runtime.sendMessage({ type: "start-edit", skillId: id })
  }, [])

  const showAddPrompt =
    (scrapeState.status === "scraped" && !scrapeState.isDuplicate) ||
    (scrapeState.status === "selected" && !scrapeState.isDuplicate)

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <pre className={styles.logo}>{logoSrc}</pre>
        <div className={styles.headerRow}>
          <ImportButton />
          <BackupButton onBackup={handleBackup} />
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            origin={originFilter}
            onOriginChange={setOriginFilter}
          />
        </div>
      </div>

      {showAddPrompt && (
        <AddPrompt
          name={scrapeState.name}
          source={scrapeState.source}
          onAdd={handleAdd}
          onDismiss={handleDismiss}
        />
      )}

      {scrapeState.status === "failed" && (
        <div className={styles.manualFallback}>
          <div className={styles.manualFallbackText}>
            Couldn't extract content automatically.
            <br />
            Select the skill text on the page, then capture it.
          </div>
          <div className={styles.manualFallbackActions}>
            <button className={styles.ghostButtonPrimary} onClick={handleSelectManually}>
              Select & Capture
            </button>
            <button className={styles.ghostButtonMuted} onClick={handleDismiss}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {scrapeState.status === "selecting" && (
        <div className={styles.manualFallback}>
          <div className={styles.manualFallbackText}>
            Select the full SKILL.md text on the page, then click Capture.
          </div>
          <div className={styles.manualFallbackActions}>
            <button className={styles.ghostButtonPrimary} onClick={handleCaptureSelection}>
              Capture
            </button>
            <button className={styles.ghostButtonMuted} onClick={handleDismiss}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {scrapeState.status === "github-scanning" && (
        <div className={styles.manualFallback}>
          <div className={styles.manualFallbackText}>
            Scanning {scrapeState.scope} for SKILL.md…
          </div>
          <span className={styles.scanSpinner} aria-hidden="true" />
        </div>
      )}

      {scrapeState.status === "github-many" && (
        <div className={styles.manualFallback}>
          <div className={styles.manualFallbackText}>
            {scrapeState.count} skills found in {scrapeState.owner}/{scrapeState.repo}
            <br />
            Open a SKILL.md file page to add it.
          </div>
          <div className={styles.manualFallbackActions}>
            <button className={styles.ghostButtonMuted} onClick={handleDismiss}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {scrapeState.status === "github-empty" && (
        <div className={styles.manualFallback}>
          <div className={styles.manualFallbackText}>
            No SKILL.md found in {scrapeState.owner}/{scrapeState.repo} (scanned {scrapeState.scanned}{" "}
            {scrapeState.scanned === 1 ? "file" : "files"}).
            <br />
            Try a subfolder or a SKILL.md file page.
          </div>
          <div className={styles.manualFallbackActions}>
            <button className={styles.ghostButtonMuted} onClick={handleDismiss}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {scrapeState.status === "github-unreachable" && (
        <div className={styles.manualFallback}>
          <div className={styles.manualFallbackText}>{scrapeState.reason}</div>
          <div className={styles.manualFallbackActions}>
            <button className={styles.ghostButtonMuted} onClick={handleDismiss}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <SkillList
        skills={skills}
        onCopy={handleCopy}
        onDelete={handleDelete}
        onEdit={handleEdit}
        emptyMessage={search || originFilter !== "all" ? "No matches found" : undefined}
      />
      <Toast
        message={toast?.message ?? ""}
        visible={toast !== null}
        onDismiss={() => setToast(null)}
      />
    </div>
  )
}

export default App
