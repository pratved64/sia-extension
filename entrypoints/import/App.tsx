import { useState, useRef, useCallback, useEffect } from "react"
import { addSkill, hashContent } from "@/utils/skills"
import { db } from "@/utils/models/db"
import styles from "./App.module.css"

type Page = "idle" | "preview" | "done"

interface FilePreview {
  file: File
  content: string
  name: string
  size: number
  hash: string
  isDuplicate: boolean
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function tokenEstimate(text: string): string {
  return `~${Math.ceil(text.length / 4)}`
}

function App() {
  const [page, setPage] = useState<Page>("idle")
  const [files, setFiles] = useState<File[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [previews, setPreviews] = useState<FilePreview[]>([])
  const [editedName, setEditedName] = useState("")
  const [result, setResult] = useState("")
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [readError, setReadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const currentPreview = previews[currentIndex] ?? null

  const readFiles = useCallback(async (rawFiles: FileList | File[]) => {
    const accepted = Array.from(rawFiles).filter(
      (f) => f.name.endsWith(".md") || f.name.endsWith(".txt"),
    )
    if (accepted.length === 0) {
      setReadError("Only .md and .txt files are accepted")
      return
    }
    setReadError(null)
    setFiles(accepted)

    const results: FilePreview[] = []
    for (const file of accepted) {
      const text = await file.text()
      const name = file.name.replace(/\.(md|txt)$/i, "")
      const hash = await hashContent(text)
      const existing = await db.skills.where("hash").equals(hash).first()
      results.push({
        file,
        content: text,
        name,
        size: file.size,
        hash,
        isDuplicate: !!existing,
      })
    }

    setPreviews(results)
    setCurrentIndex(0)
    setEditedName(results[0].name)
    setPage("preview")
  }, [])

  const handlePick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        readFiles(e.target.files)
      }
    },
    [readFiles],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length > 0) {
        readFiles(e.dataTransfer.files)
      }
    },
    [readFiles],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleNav = useCallback(
    (dir: "prev" | "next") => {
      const next = dir === "next" ? currentIndex + 1 : currentIndex - 1
      if (next >= 0 && next < previews.length) {
        setCurrentIndex(next)
        setEditedName(previews[next].name)
      }
    },
    [currentIndex, previews],
  )

  const handleBack = useCallback(() => {
    setPreviews([])
    setFiles([])
    setCurrentIndex(0)
    setReadError(null)
    setPage("idle")
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!currentPreview || !editedName.trim()) return
    setImporting(true)

    try {
      const result = await addSkill(
        editedName.trim(),
        "local",
        currentPreview.content,
        "local",
      )
      const msg = result ? "Imported!" : "Already saved"
      setResult(msg)
      await browser.runtime.sendMessage({ type: "import-result", result: msg })
      setPage("done")
      setTimeout(() => window.close(), 1500)
    } catch {
      setResult("Error importing file")
      setPage("done")
      setTimeout(() => window.close(), 2000)
    }

    setImporting(false)
  }, [currentPreview, editedName])

  return (
    <div className={styles.app}>
      <pre className={styles.logo}>███████╗██╗ █████╗{"\n"}██╔════╝██║██╔══██╗{"\n"}███████╗██║███████║{"\n"}╚════██║██║██╔══██║{"\n"}███████║██║██║  ██║{"\n"}╚══════╝╚═╝╚═╝  ╚═╝</pre>

      {page === "idle" && (
        <>
          <div
            ref={dropRef}
            className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handlePick}
          >
            <svg className={styles.dropIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className={styles.dropText}>
              Drop .md or .txt file here
            </span>
            <span className={styles.dropSubtext}>or click to browse</span>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".md,.txt"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          {readError && <p className={styles.error}>{readError}</p>}
        </>
      )}

      {page === "preview" && currentPreview && (
        <div className={styles.preview}>
          {currentPreview.isDuplicate && (
            <div className={styles.duplicateBanner}>
              Already saved — importing will skip this file
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
              <span className={styles.metaValue}>local</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Size</span>
              <span className={styles.metaValue}>{formatSize(currentPreview.size)}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Tokens</span>
              <span className={styles.metaValue}>{tokenEstimate(currentPreview.content)}</span>
            </div>
          </div>

          <div className={styles.well}>
            {currentPreview.content.slice(0, 1000)}
            {currentPreview.content.length > 1000 ? "..." : ""}
          </div>

          <div className={styles.actions}>
            <button className={styles.btnGhost} onClick={handleBack} disabled={importing}>
              ← Back
            </button>

            {previews.length > 1 && (
              <div className={styles.fileNav}>
                <button
                  className={styles.btnGhost}
                  onClick={() => handleNav("prev")}
                  disabled={currentIndex === 0 || importing}
                >
                  ◀
                </button>
                <span className={styles.fileNavLabel}>
                  {currentIndex + 1} / {previews.length}
                </span>
                <button
                  className={styles.btnGhost}
                  onClick={() => handleNav("next")}
                  disabled={currentIndex === previews.length - 1 || importing}
                >
                  ▶
                </button>
              </div>
            )}

            <button
              className={styles.btnPrimary}
              onClick={handleConfirm}
              disabled={!editedName.trim() || importing}
            >
              {importing ? "Importing..." : "Confirm Import"}
            </button>
          </div>
        </div>
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
