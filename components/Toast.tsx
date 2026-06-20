import { useEffect } from "react"

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
    <div
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#333",
        color: "#fff",
        padding: "8px 16px",
        borderRadius: 8,
        fontSize: 14,
        zIndex: 1000,
      }}
    >
      {message}
    </div>
  )
}

export default Toast
