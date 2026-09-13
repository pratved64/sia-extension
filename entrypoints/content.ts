import { scrapeSkillPage, type ScrapedSkill } from "@/utils/scraper"

let scraping = false
let pendingScrape: Promise<ScrapedSkill | null> | null = null

function getSelectedText(): string {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return ""
  return selection.toString().trim()
}

export default defineContentScript({
  matches: ["*://www.skills.sh/*", "*://skills.sh/*"],
  main() {
    console.log("[content] main() executed")

    browser.runtime.onMessage.addListener((message: any) => {
      console.log("[content] Message received:", message.type)

      if (message.type === "get-selection") {
        const text = getSelectedText()
        console.log("[content] get-selection returning", text.length, "chars")
        return Promise.resolve({ content: text })
      }

      if (message.type === "show-selection-ui") {
        console.log("[content] Selection mode acknowledged")
        return Promise.resolve({ ready: true })
      }

      if (message.type !== "scrape-skill") return

      if (scraping) {
        console.log("[content] Scrape already in progress, returning pending")
        return pendingScrape
      }

      scraping = true
      console.log("[content] Starting new scrape")
      pendingScrape = scrapeSkillPage()
        .then((result) => {
          console.log("[content] scrapeSkillPage returned:", result ? "data" : "null")
          return result
        })
        .catch((err) => {
          console.error("[content] scrapeSkillPage threw:", err)
          return null
        })
        .finally(() => {
          scraping = false
          pendingScrape = null
        })

      return pendingScrape
    })
  },
})
