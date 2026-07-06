import { db } from "./models/db"
import JSZip from "jszip"

function q(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "-") || "untitled"
}

function toFrontmatter(skill: { name: string; source: string; origin: string; savedAt: Date }): string {
  return [
    `name: ${q(skill.name)}`,
    `source: ${q(skill.source)}`,
    `origin: ${q(skill.origin)}`,
    `savedAt: ${q(skill.savedAt.toISOString())}`,
  ].join("\n")
}

async function downloadBackup(): Promise<number | null> {
  const skills = await db.skills.toArray()
  if (skills.length === 0) return null

  const zip = new JSZip()
  const usedNames = new Set<string>()

  for (const skill of skills) {
    let filename = sanitizeFilename(skill.name) + ".md"

    if (usedNames.has(filename)) {
      let counter = 1
      const base = filename.replace(/\.md$/, "")
      while (usedNames.has(`${base}-${counter}.md`)) {
        counter++
      }
      filename = `${base}-${counter}.md`
    }
    usedNames.add(filename)

    const frontmatter = toFrontmatter(skill)
    zip.file(filename, `---\n${frontmatter}\n---\n\n${skill.content}`)
  }

  const blob = await zip.generateAsync({ type: "blob" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `sia-backup-${new Date().toISOString().slice(0, 10)}.zip`
  a.click()
  URL.revokeObjectURL(url)

  return skills.length
}

interface ParsedFrontmatter {
  source: string
  origin: "local" | "remote"
  content: string
}

function parseFrontmatter(text: string): ParsedFrontmatter {
  let source = ""
  let origin: "local" | "remote" = "local"
  let content = text

  if (text.startsWith("---\n")) {
    const endIndex = text.indexOf("\n---\n", 4)
    if (endIndex !== -1) {
      const block = text.slice(4, endIndex)
      content = text.slice(endIndex + 5)

      for (const line of block.split("\n")) {
        const match = line.match(/^(\w+):\s+"((?:[^"\\]|\\.)*)"/)
        if (!match) continue
        const key = match[1]
        const value = match[2].replace(/\\"/g, '"').replace(/\\\\/g, "\\")
        if (key === "source") source = value
        if (key === "origin" && (value === "local" || value === "remote")) origin = value
      }
    }
  }

  return { source, origin, content }
}

export { downloadBackup, parseFrontmatter }
