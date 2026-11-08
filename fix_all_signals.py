with open('src/App.tsx', 'r') as f:
    content = f.read()

old_set_all = """      setAllSignals(prev => {
        const newSignals = data.allSignals || [];
        const combined = [...newSignals, ...prev];
        const uniqueMap = new Map();
        
        // Filter combined signals to only include currently selected assets
        const selectedTypes = Object.entries(selectedAssets)
          .filter(([_, isSelected]) => isSelected)
          .map(([key]) => key.toLowerCase());
          
        combined.forEach(sig => {
          if (selectedTypes.includes(sig.type.toLowerCase())) {
            uniqueMap.set(`${sig.pair}-${sig.time}`, sig);
          }
        });
        
        const unique = Array.from(uniqueMap.values());
        const sorted = unique.sort((a, b) => b.time - a.time).slice(0, 5);
        return sorted;
      });"""

new_set_all = """      setAllSignals(() => {
        const newSignals = data.allSignals || [];
        const uniqueMap = new Map();
        
        const selectedTypes = Object.entries(selectedAssets)
          .filter(([_, isSelected]) => isSelected)
          .map(([key]) => key.toLowerCase());
          
        newSignals.forEach((sig: Signal) => {
          if (selectedTypes.includes(sig.type.toLowerCase())) {
            uniqueMap.set(`${sig.pair}-${sig.time}`, sig);
          }
        });
        
        const unique = Array.from(uniqueMap.values());
        const sorted = unique.sort((a: Signal, b: Signal) => b.time - a.time).slice(0, 5);
        return sorted;
      });"""

content = content.replace(old_set_all, new_set_all)

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Fixed setAllSignals")
