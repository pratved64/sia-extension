const fs = require("fs")
const files = process.argv.slice(2)
if (files.length === 0) {
  console.error("Usage: node check-entry-locations.cjs <html-files...>")
  process.exit(1)
}

for (const file of files) {
  const html = fs.readFileSync(file, "utf-8")
  const scriptRe = /<script>([\s\S]*?)<\/script>/gi
  let m
  const payloads = []
  while ((m = scriptRe.exec(html)) !== null) {
    const text = m[1].trim()
    if (!text.startsWith("self.__next_f.push")) continue
    const arrStr = text.slice("self.__next_f.push(".length).replace(/\);?\s*$/, "")
    try {
      const arr = JSON.parse(arrStr)
      payloads.push(String(arr[1]))
    } catch {}
  }

  const combined = payloads.join("")

  // Find restHtml reference
  const restIdx = combined.indexOf('restHtml":"$')
  if (restIdx < 0) {
    console.log(`${file} | restHtml NOT FOUND in payloads`)
    continue
  }
  const afterRef = combined.slice(restIdx + 'restHtml":"$'.length)
  const entryMatch = afterRef.match(/^(\w+)/)
  if (!entryMatch) {
    console.log(`${file} | restHtml found but entry ID not parseable`)
    continue
  }
  const entryId = entryMatch[1]
  const entryPattern = entryId + ":T"

  // Find where entry definition is
  let foundIn = "none"
  let contentLen = 0
  let payloadIdx = -1
  for (let i = 0; i < payloads.length; i++) {
    const idx = payloads[i].indexOf(entryPattern)
    if (idx >= 0) {
      // Check same payload inline
      const afterDef = payloads[i].slice(idx + entryPattern.length)
      const inlineMatch = afterDef.match(/^([0-9a-f]+),(.*)/s)
      if (inlineMatch && inlineMatch[2].length > 100) {
        foundIn = "SAME"
        contentLen = inlineMatch[2].length
        payloadIdx = i
      }
      // Check next payload (if not found inline)
      if (foundIn === "none" && i + 1 < payloads.length && payloads[i + 1].length > 100) {
        foundIn = "NEXT"
        contentLen = payloads[i + 1].length
        payloadIdx = i + 1
      }
    }
  }

  console.log(`${file} | entry $${entryId} | location: ${foundIn} payload[${payloadIdx}] | content: ${contentLen} chars`)
}
