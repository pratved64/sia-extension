import { useState } from "react"
import type { Skill } from "@/utils/models/db"
import styles from "@/entrypoints/popup/App.module.css"

interface SkillCardProps {
  skill: Skill
  onCopy: (content: string) => void
  onDelete: (id: number) => void
}

const tokenEstimate = (text: string) => Math.ceil(text.length / 4)

const SkillCard = ({ skill, onCopy, onDelete }: SkillCardProps) => {
  const [expanded, setExpanded] = useState(false)

  const originBadgeClass =
    skill.origin === "local" ? styles.originBadgeLocal : styles.originBadgeRemote

  return (
    <div className={styles.card} data-expanded={expanded}>
      <div
        className={styles.cardRow}
        onClick={() => setExpanded((p) => !p)}
      >
        <div className={styles.cardLeft}>
          <span className={styles.cardArrow} data-expanded={expanded}>
            ▶
          </span>
          <strong className={styles.cardName}>
            {skill.name}
          </strong>
        </div>
        <div className={styles.cardRight}>
          <div
            className={styles.copyIcon}
            onClick={(e) => {
              e.stopPropagation()
              onCopy(skill.content)
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </div>
          <span className={styles.tokenCount}>
            ~{tokenEstimate(skill.content)}
          </span>
        </div>
      </div>
      <div className={styles.cardExpanded}>
        <div className={styles.cardMeta}>
          <div className={styles.cardMetaRow}>
            Source: {skill.origin === "local" ? "local" : skill.source}
          </div>
          <div className={styles.cardMetaLabel}>
            Origin:
            <span className={originBadgeClass}>
              {skill.origin}
            </span>
          </div>
        </div>
        <div className={styles.well}>
          {skill.content.slice(0, 200)}
          {skill.content.length > 200 ? "..." : ""}
        </div>
        <div className={styles.cardActions}>
          <button onClick={() => onCopy(skill.content)}>Copy</button>
          <button onClick={() => onDelete(skill.id)}>Delete</button>
        </div>
      </div>
    </div>
  )
}

export default SkillCard
