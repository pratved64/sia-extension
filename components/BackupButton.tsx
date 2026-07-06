import styles from "@/entrypoints/popup/App.module.css"

interface BackupButtonProps {
  onBackup: () => void
}

const BackupButton = ({ onBackup }: BackupButtonProps) => {
  return (
    <button className={styles.iconBtn} onClick={onBackup} title="Backup skills">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  )
}

export default BackupButton
