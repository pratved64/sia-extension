import { useEffect, useRef } from "react"
import styles from "@/entrypoints/popup/App.module.css"

interface FilterDropdownProps {
  origin: "all" | "local" | "remote"
  onChange: (origin: "all" | "local" | "remote") => void
  onClose: () => void
}

const FILTERS: { value: "all" | "local" | "remote"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "local", label: "Local" },
  { value: "remote", label: "Remote" },
]

const FilterDropdown = ({ origin, onChange, onClose }: FilterDropdownProps) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [onClose])

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handle)
    return () => document.removeEventListener("keydown", handle)
  }, [onClose])

  return (
    <div className={styles.dropdownPanel} ref={ref}>
      <div className={styles.dropdownSection}>
        <span className={styles.dropdownLabel}>Origin</span>
        <div className={styles.dropdownChips}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={
                origin === f.value
                  ? styles.chipActive
                  : styles.chip
              }
              onClick={() => onChange(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FilterDropdown
