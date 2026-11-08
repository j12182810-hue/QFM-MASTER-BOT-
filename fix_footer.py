import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("className={`border-t ${theme === 'dark' ? 'border-white/5 bg-slate-900' : 'border-slate-200 bg-white'} mt-auto z-10 relative mt-12 transition-colors duration-300`}", "className={`mt-auto z-10 relative mt-12 transition-colors duration-300`}")

with open('src/App.tsx', 'w') as f:
    f.write(content)

