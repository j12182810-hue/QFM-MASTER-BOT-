import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("className={`grid grid-cols-3 gap-2 ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200'} rounded-2xl p-3 border transition-colors`}", "className={`grid grid-cols-3 gap-2 p-3 transition-colors`}")

with open('src/App.tsx', 'w') as f:
    f.write(content)
