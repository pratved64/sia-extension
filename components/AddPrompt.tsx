interface AddPromptProps {
  name: string
  source: string
  onAdd: () => void
  onDismiss: () => void
}

const AddPrompt = ({ name, source, onAdd, onDismiss }: AddPromptProps) => {
  return (
    <div
      style={{
        border: "1px solid #2563eb",
        borderRadius: 8,
        padding: "12px 16px",
        marginBottom: 12,
        background: "#eff6ff",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
        Found on skills.sh
      </div>
      <div style={{ fontSize: 13, color: "#333", marginBottom: 8 }}>
        <strong>{name}</strong>
        <span style={{ color: "#888", marginLeft: 8 }}>{source}</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onAdd}>Add to Library</button>
        <button onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  )
}

export default AddPrompt
