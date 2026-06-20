import { addSkill } from "@/utils/skills"

const btn = document.getElementById("chooseBtn") as HTMLButtonElement
const statusEl = document.getElementById("status") as HTMLParagraphElement

const input = document.createElement("input")
input.type = "file"
input.accept = ".md,.txt"
input.style.display = "none"
document.body.appendChild(input)

btn.addEventListener("click", () => {
  console.log("[import-page] Choose File clicked")
  input.click()
})

input.addEventListener("change", async () => {
  const file = input.files?.[0]
  if (!file) return

  console.log("[import-page] File selected:", file.name, "size:", file.size)
  statusEl.textContent = "Reading file..."

  const reader = new FileReader()
  reader.onload = async () => {
    const content = reader.result as string
    const name = file.name.replace(/\.(md|txt)$/i, "")
    console.log("[import-page] File read — name:", name, "length:", content.length)

    statusEl.textContent = "Importing..."
    btn.disabled = true

    try {
      const result = await addSkill(name, "local", content, "local")
      const msg = result ? "Imported!" : "Already saved"
      console.log("[import-page] Result:", msg)
      statusEl.textContent = msg
      statusEl.style.color = "#2e7d32"

      await browser.runtime.sendMessage({ type: "import-result", result: msg })
    } catch (err) {
      console.error("[import-page] Error:", err)
      statusEl.textContent = "Error importing file"
      statusEl.style.color = "#c62828"
    }

    setTimeout(() => window.close(), 1500)
  }

  reader.onerror = () => {
    console.error("[import-page] FileReader error:", reader.error)
    statusEl.textContent = "Error reading file"
  }

  reader.readAsText(file)
})
