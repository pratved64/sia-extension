import styles from "@/entrypoints/popup/App.module.css"

interface AddPromptProps {
  name: string
  source: string
  onAdd: () => void
  onDismiss: () => void
}

const AddPrompt = ({ name, source, onAdd, onDismiss }: AddPromptProps) => {
  return (
    <div className={styles.addPrompt}>
      <div>
        <span className={styles.addPromptName}>{name}</span>
        <span className={styles.addPromptSource}>{source}</span>
      </div>
      <div className={styles.addPromptActions}>
        <button className={styles.ghostButtonPrimary} onClick={onAdd}>
          Add
        </button>
        <button className={styles.ghostButtonMuted} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  )
}

export default AddPrompt
