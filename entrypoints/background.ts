let lastImportResult: string | null = null

export default defineBackground(() => {
  console.log("[background] Background started")

  browser.runtime.onMessage.addListener((message: any) => {
    if (message.type === "get-last-import") {
      const result = lastImportResult
      lastImportResult = null
      return Promise.resolve({ result })
    }

    if (message.type === "import-result") {
      console.log("[background] Import result from window:", message.result)
      lastImportResult = message.result
      return Promise.resolve({ accepted: true })
    }

    if (message.type === "start-import") {
      console.log("[background] Opening import window")
      browser.windows.create({
        url: browser.runtime.getURL("/import.html"),
        type: "popup",
        width: 400,
        height: 480,
      })
      return Promise.resolve({ accepted: true })
    }
  })
})
