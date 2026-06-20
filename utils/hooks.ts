import { useLiveQuery } from "dexie-react-hooks"
import { db, type Skill } from "./models/db"

function useSkills(): Skill[] {
  const skills = useLiveQuery(() => {
    console.log("[hooks] useSkills — querying Dexie")
    return db.skills.toArray()
  }) ?? []
  console.log("[hooks] useSkills — got", skills.length, "skills")
  return skills
}

export { useSkills }
export type { Skill }
