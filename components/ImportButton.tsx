const ImportButton = () => {
  const handleClick = () => {
    console.log("[ImportButton] Sending start-import to background")
    browser.runtime.sendMessage({ type: "start-import" })
  }

  return <button onClick={handleClick}>Import Skill</button>
}

export default ImportButton
