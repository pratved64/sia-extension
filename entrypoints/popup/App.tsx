import { useState, useCallback, useEffect, useRef } from "react"
import { useSkills } from "@/utils/hooks"
import { addSkill, deleteSkill, hashContent } from "@/utils/skills"
import { downloadBackup } from "@/utils/backup"
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

  const showToast = useCallback((message: string) => {
    setToast({ message, key: Date.now() })
  }, [])

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
      if (!/^https?:\/\/(www\.)?skills\.sh\//.test(tab.url)) return

      tabIdRef.current = tab.id
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
    })
  }, [])

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
    browser.tabs.sendMessage(tabId, { type: "show-selection-ui" }).catch(() => {})
  }, [scrapeState])

  const handleCaptureSelection = useCallback(async () => {
    const tabId = tabIdRef.current
    if (!tabId || scrapeState.status !== "selecting") return

    try {
      const res = await browser.tabs.sendMessage(tabId, { type: "get-selection" }) as { content: string }
      const content = res?.content?.trim() ?? ""

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
