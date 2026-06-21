import { scrapeSkillPage, type ScrapedSkill } from "@/utils/scraper"

let scraping = false
let pendingScrape: Promise<ScrapedSkill | null> | null = null

export default defineContentScript({
  matches: ["*://www.skills.sh/*", "*://skills.sh/*"],
  main() {
    console.log("[content] main() executed")

    browser.runtime.onMessage.addListener((message: any) => {
      console.log("[content] Message received:", message.type)

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
