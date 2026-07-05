import { useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type Skill } from "./models/db"

function useSkills(
  search: string,
  originFilter: "all" | "local" | "remote",
): Skill[] {
  const allSkills = useLiveQuery(() => {
    console.log("[hooks] useSkills — querying Dexie")
    return db.skills.toArray()
  }) ?? []

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allSkills.filter((skill) => {
      if (originFilter !== "all" && skill.origin !== originFilter) return false
      if (q) {
        return (
          skill.name.toLowerCase().includes(q) ||
          skill.source.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [allSkills, search, originFilter])

  console.log("[hooks] useSkills — got", filtered.length, "skills (filtered)")
  return filtered
}

export { useSkills }
export type { Skill }
