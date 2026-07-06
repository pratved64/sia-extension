import type { Skill } from "@/utils/models/db"
import SkillCard from "./SkillCard"
import styles from "@/entrypoints/popup/App.module.css"

interface SkillListProps {
  skills: Skill[]
  onCopy: (content: string) => void
  onDelete: (id: number) => void
  onEdit: (id: number) => void
  emptyMessage?: string
}

const SkillList = ({ skills, onCopy, onDelete, onEdit, emptyMessage }: SkillListProps) => {
  if (skills.length === 0) {
    return (
      <p className={styles.skillListEmpty}>
        {emptyMessage ?? "No skills yet. Import your first skill above."}
      </p>
    )
  }

  return (
    <div>
      {skills.map((skill) => (
        <SkillCard
          key={skill.id}
          skill={skill}
          onCopy={onCopy}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  )
}

export default SkillList
