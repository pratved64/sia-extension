import { useState, useEffect, useCallback } from "react"
import { db, type Skill } from "@/utils/models/db"
import { editSkill } from "@/utils/skills"
import styles from "./App.module.css"

type Page = "loading" | "ready" | "saving" | "done"

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function App() {
  const [page, setPage] = useState<Page>("loading")
  const [skill, setSkill] = useState<Skill | null>(null)
  const [editedName, setEditedName] = useState("")
  const [editedContent, setEditedContent] = useState("")
  const [result, setResult] = useState("")
  const [duplicateName, setDuplicateName] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = Number(params.get("id"))
    if (!id) {
      setResult("Invalid skill ID")
      setPage("done")
      setTimeout(() => window.close(), 2000)
      return
    }

    db.skills.get(id).then((s) => {
      if (!s) {
        setResult("Skill not found")
        setPage("done")
        setTimeout(() => window.close(), 2000)
        return
      }
      setSkill(s)
      setEditedName(s.name)
      setEditedContent(s.content)
      setPage("ready")
    })
  }, [])

  const handleCancel = useCallback(() => {
    window.close()
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!skill || !editedName.trim()) return
    setPage("saving")
    setDuplicateName(null)

    const result = await editSkill(skill.id, editedName.trim(), editedContent)
    if (result.duplicateName) {
      setDuplicateName(result.duplicateName)
      setPage("ready")
      return
    }

    const msg = "Saved!"
    setResult(msg)
    await browser.runtime.sendMessage({ type: "edit-result", result: msg })
    setPage("done")
    setTimeout(() => window.close(), 1500)
  }, [skill, editedName, editedContent])

  const originBadgeClass =
    skill?.origin === "local" ? styles.originBadgeLocal : styles.originBadgeRemote

  return (
    <div className={styles.app}>
      <pre className={styles.logo}>
        {`███████╗██╗ █████╗`}{"\n"}
        {`██╔════╝██║██╔══██╗`}{"\n"}
        {`███████╗██║███████║`}{"\n"}
        {`╚════██║██║██╔══██║`}{"\n"}
        {`███████║██║██║  ██║`}{"\n"}
        {`╚══════╝╚═╝╚═╝  ╚═╝`}
      </pre>

      {page === "loading" && (
        <p className={styles.loading}>Loading...</p>
      )}

      {page === "ready" && skill && (
        <>
          {duplicateName && (
            <div className={styles.errorBanner}>
              Content matches "{duplicateName}" — no changes saved
            </div>
          )}

          <div className={styles.metaCard}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Name</span>
              <input
                className={styles.nameInput}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Skill name"
              />
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Source</span>
              <span className={styles.metaValue}>{skill.source || "—"}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Origin</span>
              <span className={originBadgeClass}>{skill.origin}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Saved</span>
              <span className={styles.metaValue}>
                {skill.savedAt instanceof Date
                  ? formatDate(skill.savedAt)
                  : formatDate(new Date(skill.savedAt))}
              </span>
            </div>
          </div>

          <textarea
            className={styles.editorWell}
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder="Skill content..."
          />

          <div className={styles.actions}>
            <button className={styles.btnGhost} onClick={handleCancel}>
              Cancel
            </button>
            <button
              className={styles.btnPrimary}
              onClick={handleConfirm}
              disabled={!editedName.trim()}
            >
              Confirm Edit
            </button>
          </div>
        </>
      )}

      {page === "saving" && (
        <p className={styles.loading}>Saving...</p>
      )}

      {page === "done" && (
        <div className={styles.done}>
          <p className={styles.doneMessage}>{result}</p>
        </div>
      )}
    </div>
  )
}

export default App
