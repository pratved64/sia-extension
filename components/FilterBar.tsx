import { useState } from "react"
import FilterDropdown from "./FilterDropdown"
import styles from "@/entrypoints/popup/App.module.css"

interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  origin: "all" | "local" | "remote"
  onOriginChange: (origin: "all" | "local" | "remote") => void
}

const FilterBar = ({
  search,
  onSearchChange,
  origin,
  onOriginChange,
}: FilterBarProps) => {
  const [open, setOpen] = useState(false)
  const hasActiveFilter = origin !== "all"

  return (
    <div className={styles.filterBar}>
      <div className={styles.searchWrapper}>
        <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search name or source..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className={styles.filterTriggerWrapper}>
        <button
          className={styles.filterTrigger}
          onClick={() => setOpen((p) => !p)}
          data-active={hasActiveFilter}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="8" y1="12" x2="20" y2="12" />
            <line x1="12" y1="18" x2="20" y2="18" />
          </svg>
          {hasActiveFilter && <span className={styles.filterBadge} />}
        </button>
        {open && (
          <FilterDropdown
            origin={origin}
            onChange={(o) => onOriginChange(o)}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

export default FilterBar
