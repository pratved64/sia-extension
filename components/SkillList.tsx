import type { Skill } from "@/utils/models/db"
import SkillCard from "./SkillCard"

interface SkillListProps {
  skills: Skill[]
  onCopy: (content: string) => void
  onDelete: (id: number) => void
}

const SkillList = ({ skills, onCopy, onDelete }: SkillListProps) => {
  if (skills.length === 0) {
    return (
      <p style={{ textAlign: "center", color: "#888", marginTop: 32 }}>
        No skills yet. Import your first skill above.
      </p>
    )
  }

  return (
    <div style={{ marginTop: 12 }}>
      {skills.map((skill) => (
        <SkillCard
          key={skill.id}
          skill={skill}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

export default SkillList
