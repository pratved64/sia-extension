import { Dexie, type EntityTable } from "dexie"

interface Skill {
  id: number
  name: string
  source: string
  content: string
  hash: string
  savedAt: Date
  origin: "local" | "remote"
}

const db = new Dexie("skills-db") as Dexie & {
  skills: EntityTable<Skill, "id">
}

db.version(1).stores({
  skills: "++id, &hash, name, origin, savedAt"
})

export type { Skill }
export { db }
