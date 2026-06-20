import { useState, useCallback, useEffect } from "react"
import { useSkills } from "@/utils/hooks"
import { deleteSkill } from "@/utils/skills"
import ImportButton from "@/components/ImportButton"
import SkillList from "@/components/SkillList"
import Toast from "@/components/Toast"

function App() {
  const skills = useSkills()
  const [toast, setToast] = useState<{ message: string; key: number } | null>(
    null,
  )

  const showToast = useCallback((message: string) => {
    setToast({ message, key: Date.now() })
  }, [])

  useEffect(() => {
    browser.runtime.sendMessage({ type: "get-last-import" }).then((res: any) => {
      if (res?.result) {
        showToast(res.result)
      }
    })
  }, [showToast])

  const handleCopy = useCallback(
    async (content: string) => {
      await navigator.clipboard.writeText(content)
      showToast("Copied!")
    },
    [showToast],
  )

  const handleDelete = useCallback(
    async (id: number) => {
      await deleteSkill(id)
    },
    [],
  )

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h2 style={{ margin: 0 }}>Skills</h2>
        <ImportButton />
      </div>
      <SkillList skills={skills} onCopy={handleCopy} onDelete={handleDelete} />
      <Toast
        message={toast?.message ?? ""}
        visible={toast !== null}
        onDismiss={() => setToast(null)}
      />
    </div>
  )
}

export default App
