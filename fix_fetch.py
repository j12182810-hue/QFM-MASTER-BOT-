with open('src/App.tsx', 'r') as f:
    content = f.read()

old_fetch = """  const fetchSignals = async (isBackgroundPoll = false) => {
    if (!isBackgroundPoll) setIsScanning(true);"""
new_fetch = """  const fetchSignals = async (isBackgroundPoll = false) => {
    if (!isBackgroundPoll) {
      setIsScanning(true);
      setBestSignal(null);
      setSelectedSignal(null);
      setAllSignals([]);
    }"""
content = content.replace(old_fetch, new_fetch)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Updated fetchSignals")
