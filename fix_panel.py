import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Remove dynamic backgrounds
content = re.sub(r'\{/\*\s*Dynamic Background\s*\*/\}.*?(?=\{/\*\s*Header\s*\*/\})', '', content, flags=re.DOTALL)

# 2. Flatten Header (remove border and bg so it blends in)
content = content.replace("className={`border-b ${theme === 'dark' ? 'border-white/5 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'} sticky top-0 z-50 transition-colors duration-300`}", "className={`sticky top-0 z-50 transition-colors duration-300`}")

# 3. Main container -> flex col, no grid
content = re.sub(r'<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 relative z-10">', r'<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-12 relative z-10">', content)

# Remove left/right column wrapper divs
content = content.replace('<div className="col-span-1 xl:col-span-8 flex flex-col gap-8">', '<div className="flex flex-col gap-12">')
content = content.replace('<div className="col-span-1 xl:col-span-4 flex flex-col">', '<div className="flex flex-col">')

# 4. Remove section backgrounds (Controls, Primary Signal, Signal Feed container)
# Controls
content = content.replace("className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-5 sm:p-6 relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-end justify-between gap-6 transition-colors duration-300`}", "className={`relative flex flex-col md:flex-row md:items-end justify-between gap-6 transition-colors duration-300`}")

# Primary Signal Result
content = content.replace("className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-2xl transition-colors duration-300`}", "className={`relative transition-colors duration-300`}")

# Signal Feed outer container
content = content.replace("className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl flex flex-col h-[800px] xl:h-[calc(100vh-10rem)] shadow-2xl sticky top-24 transition-colors duration-300`}", "className={`flex flex-col h-[600px] transition-colors duration-300`}")
content = content.replace("className={`p-6 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} shrink-0 transition-colors`}", "className={`pb-6 shrink-0 transition-colors`}")


# Change feed to wrap maybe? Or horizontal list? If it's a list, the feed cards might be huge.
# Let's make the feed a grid if it's full width now.
content = content.replace("className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar transition-colors`}", "className={`flex-1 overflow-y-auto pb-4 gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 custom-scrollbar transition-colors`}")
content = content.replace('<div className="flex flex-col gap-12">\n          \n          {/* Signal Feed', '{/* Signal Feed')

# Save
with open('src/App.tsx', 'w') as f:
    f.write(content)

