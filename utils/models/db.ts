import { Dexie, type EntityTable } from "dexie"

interface Skill {
  id: number,
  source: string,
  content: string
}

const db = new Dexie("skills-db") as Dexie & {
  skills: EntityTable<
    Skill,
    "id"
  >
}

db.version(1).stores({
  skills: "++id,source,content"
})

export type { Skill }
export { db }