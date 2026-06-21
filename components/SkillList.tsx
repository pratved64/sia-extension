import type { Skill } from "@/utils/models/db"
import SkillCard from "./SkillCard"
import styles from "@/entrypoints/popup/App.module.css"

interface SkillListProps {
  skills: Skill[]
  onCopy: (content: string) => void
  onDelete: (id: number) => void
}

const SkillList = ({ skills, onCopy, onDelete }: SkillListProps) => {
  if (skills.length === 0) {
    return (
      <p className={styles.skillListEmpty}>
        No skills yet. Import your first skill above.
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
        />
      ))}
    </div>
  )
}

export default SkillList
