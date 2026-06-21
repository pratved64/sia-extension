import { useEffect } from "react"
import styles from "@/entrypoints/popup/App.module.css"

interface ToastProps {
  message: string
  visible: boolean
  onDismiss: () => void
}

const Toast = ({ message, visible, onDismiss }: ToastProps) => {
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(onDismiss, 2000)
    return () => clearTimeout(timer)
  }, [visible, onDismiss])

  if (!visible) return null

  return (
    <div className={styles.toast}>
      {message}
    </div>
  )
}

export default Toast
