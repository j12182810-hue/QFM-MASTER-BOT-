with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Update setTimeframe onClick
old_timeframe = 'onClick={() => { setTimeframe(tf.id); setSelectedSignal(null); }}'
new_timeframe = 'onClick={() => { setTimeframe(tf.id); setSelectedSignal(null); setBestSignal(null); setAllSignals([]); setStats({ scanned: 0, timeTaken: 0 }); }}'
content = content.replace(old_timeframe, new_timeframe)

# 2. Update toggleAutoScan
old_toggle = """  const toggleAutoScan = () => {
    if (isAutoScanning) {
      setIsAutoScanning(false);
    } else {
      setSelectedSignal(null);
      setIsAutoScanning(true);
      setAutoScanCountdown(300);
      fetchSignals(false); // Initial immediate fetch
    }
  };"""
new_toggle = """  const toggleAutoScan = () => {
    if (isAutoScanning) {
      setIsAutoScanning(false);
    } else {
      setSelectedSignal(null);
      setBestSignal(null);
      setAllSignals([]);
      setStats({ scanned: 0, timeTaken: 0 });
      setIsAutoScanning(true);
      setAutoScanCountdown(300);
      fetchSignals(false); // Initial immediate fetch
    }
  };"""
content = content.replace(old_toggle, new_toggle)

# 3. Update announcement useEffect
old_announcement = """  }, [bestSignal, soundEnabled, timeframe]);"""
new_announcement = """  }, [bestSignal, soundEnabled]);"""
content = content.replace(old_announcement, new_announcement)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Updated App.tsx")
