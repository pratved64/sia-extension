import { db, type Skill } from "./models/db"

async function hashContent(content: string): Promise<string> {
  console.log("[skills] hashContent — input length:", content.length)
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  console.log("[skills] hashContent — result:", hash)
  return hash
}

async function addSkill(
  name: string,
  source: string,
  content: string,
  origin: Skill["origin"],
): Promise<Skill | null> {
  console.log("[skills] addSkill — name:", name, "origin:", origin)
  const hash = await hashContent(content)

  console.log("[skills] addSkill — checking duplicate for hash:", hash)
  const existing = await db.skills.where("hash").equals(hash).first()
  if (existing) {
    console.log("[skills] addSkill — duplicate found, skipping. existing id:", existing.id)
    return null
  }
  console.log("[skills] addSkill — no duplicate, inserting")

  const id = await db.skills.add({ name, source, content, hash, savedAt: new Date(), origin })
  console.log("[skills] addSkill — inserted with id:", id)
  const saved = await db.skills.get(id)
  console.log("[skills] addSkill — read back:", saved ? "ok" : "MISSING")
  return saved ?? null
}

async function deleteSkill(id: number): Promise<void> {
  console.log("[skills] deleteSkill — id:", id)
  await db.skills.delete(id)
  console.log("[skills] deleteSkill — done")
}

async function editSkill(
  id: number,
  name: string,
  content: string,
): Promise<{ skill: Skill | null; duplicateName?: string }> {
  const hash = await hashContent(content)
  const existing = await db.skills.where("hash").equals(hash).first()
  if (existing && existing.id !== id) {
    return { skill: null, duplicateName: existing.name }
  }
  await db.skills.update(id, { name, content, hash, savedAt: new Date() })
  const saved = await db.skills.get(id)
  return { skill: saved ?? null }
}

export { addSkill, deleteSkill, editSkill, hashContent }
