import { useState, useCallback, useEffect } from "react"
import { useSkills } from "@/utils/hooks"
import { addSkill, deleteSkill, hashContent } from "@/utils/skills"
import { db } from "@/utils/models/db"
import type { ScrapedSkill } from "@/utils/scraper"
import ImportButton from "@/components/ImportButton"
import SkillList from "@/components/SkillList"
import AddPrompt from "@/components/AddPrompt"
import Toast from "@/components/Toast"
import styles from "./App.module.css"

function App() {
  const skills = useSkills()
  const [toast, setToast] = useState<{ message: string; key: number } | null>(
    null,
  )
  const [scraped, setScraped] = useState<{
    skill: ScrapedSkill
    isDuplicate: boolean
  } | null>(null)

  const showToast = useCallback((message: string) => {
    setToast({ message, key: Date.now() })
  }, [])

  useEffect(() => {
    browser.runtime.sendMessage({ type: "get-last-import" }).then((res: any) => {
      if (res?.result) {
        showToast(res.result)
      }
    })
  }, [showToast])

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const tab = tabs[0]
      if (!tab?.url || !tab.id) return

      if (!/^https?:\/\/(www\.)?skills\.sh\//.test(tab.url)) return
      console.log("[App] On skills.sh, requesting scrape from tab", tab.id)

      browser.tabs
        .sendMessage(tab.id, { type: "scrape-skill" })
        .then(async (skill: ScrapedSkill | null) => {
          console.log("[App] Content script response:", skill ? skill.name : "null/undefined")
          if (!skill) return

          const hash = await hashContent(skill.content)
          const existing = await db.skills.where("hash").equals(hash).first()

          setScraped({ skill, isDuplicate: !!existing })
        })
        .catch((err: any) => {
          console.log("[App] No content script responded:", err.message)
        })
    })
  }, [])

  const handleAddScraped = useCallback(async () => {
    if (!scraped) return
    const { name, content, source } = scraped.skill
    const result = await addSkill(name, source, content, "remote")
    if (result) {
      showToast("Added!")
    } else {
      showToast("Already saved")
    }
    setScraped(null)
  }, [scraped, showToast])

  const handleDismissScraped = useCallback(() => {
    setScraped(null)
  }, [])

  const handleCopy = useCallback(
    async (content: string) => {
      await navigator.clipboard.writeText(content)
      showToast("Copied!")
    },
    [showToast],
  )

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteSkill(id)
    },
    [],
  )

  return (
    <div className={styles.app}>
      <div className={styles.header}>
        <h2>Skills</h2>
        <ImportButton />
      </div>
      {scraped && !scraped.isDuplicate && (
        <AddPrompt
          name={scraped.skill.name}
          source={scraped.skill.source}
          onAdd={handleAddScraped}
          onDismiss={handleDismissScraped}
        />
      )}
      <SkillList skills={skills} onCopy={handleCopy} onDelete={handleDelete} />
      <Toast
        message={toast?.message ?? ""}
        visible={toast !== null}
        onDismiss={() => setToast(null)}
      />
    </div>
  )
}

export default App
