import type { Skill } from "@/utils/models/db"

interface SkillCardProps {
  skill: Skill
  onCopy: (content: string) => void
  onDelete: (id: number) => void
}

const tokenEstimate = (text: string) => Math.ceil(text.length / 4)

const SkillCard = ({ skill, onCopy, onDelete }: SkillCardProps) => {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: "8px 12px",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong>{skill.name}</strong>
        <span style={{ fontSize: 12, color: "#888" }}>
          ~{tokenEstimate(skill.content)} tokens
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 12, color: "#aaa" }}>
          {skill.origin === "local" ? "local" : skill.source}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onCopy(skill.content)}>Copy</button>
          <button onClick={() => onDelete(skill.id)}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default SkillCard
