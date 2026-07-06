import styles from "@/entrypoints/popup/App.module.css"

const ImportButton = () => {
  const handleClick = () => {
    browser.runtime.sendMessage({ type: "start-import" })
  }

  return (
    <button className={styles.iconBtn} onClick={handleClick} title="Import skills">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <polyline points="12 11 12 17" />
        <line x1="9" y1="14" x2="12" y2="17" />
        <line x1="15" y1="14" x2="12" y2="17" />
      </svg>
    </button>
  )
}

export default ImportButton
