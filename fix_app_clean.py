import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Remove background blobs and mountain image
content = re.sub(r'\{/\*\s*Background Image Layer\s*\*/\}.*?(?=\{/\*\s*Header\s*\*/\})', '', content, flags=re.DOTALL)

# 2. Flatten Header
content = content.replace("className={`border-b ${theme === 'dark' ? 'border-white/5 bg-slate-900' : 'border-slate-200 bg-white shadow-sm'} sticky top-0 z-50 transition-colors duration-300`}", "className={`sticky top-0 z-50 transition-colors duration-300`}")

# 3. Main layout - remove grid, use flex col
content = content.replace('<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 relative z-10">', '<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-12 relative z-10">')
content = content.replace('<div className="col-span-1 xl:col-span-8 flex flex-col gap-8">', '<div className="flex flex-col gap-12">')
content = content.replace('<div className="col-span-1 xl:col-span-4 flex flex-col">', '<div className="flex flex-col">')
content = content.replace('<div className="w-full lg:w-96 shrink-0 flex flex-col">', '<div className="flex flex-col">')

# 4. Remove inner card backgrounds
# Controls Section
content = content.replace("className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-5 sm:p-6 relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-end justify-between gap-6 transition-colors duration-300`}", "className={`relative flex flex-col md:flex-row md:items-end justify-between gap-6 transition-colors duration-300`}")

# Primary Signal Result Wait State
content = content.replace("className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200'} border rounded-2xl p-12 flex flex-col items-center justify-center min-h-[350px] transition-colors duration-300`}", "className={`p-12 flex flex-col items-center justify-center min-h-[350px] transition-colors duration-300`}")

# Primary Signal Result Main Card
content = re.sub(r'className={`\$\{theme === \'dark\' \? \'bg-slate-800 border-white/5\' : \'bg-white border-slate-200 shadow-xl\'\} border rounded-2xl p-5 sm:p-8 lg:p-10 relative overflow-hidden shadow-2xl \$\{displaySignal\.action === \'BUY\' \? \'border-emerald-500/20\' : \'border-rose-500/20\'\} transition-colors duration-300`}', r'className={`p-5 sm:p-8 lg:p-10 relative transition-colors duration-300`}', content)

# Primary Signal Result Empty/Wait State Cards
content = content.replace("className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[350px] relative overflow-hidden transition-colors duration-300`}", "className={`p-12 flex flex-col items-center justify-center text-center min-h-[350px] relative transition-colors duration-300`}")

content = content.replace("className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-[350px] transition-colors duration-300`}", "className={`p-12 flex flex-col items-center justify-center text-center min-h-[350px] transition-colors duration-300`}")

# Feed Container
content = content.replace("className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl flex flex-col h-[800px] xl:h-[calc(100vh-10rem)] shadow-2xl sticky top-24 transition-colors duration-300`}", "className={`flex flex-col transition-colors duration-300`}")

# Feed Header
content = content.replace("className={`p-6 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'} shrink-0 transition-colors`}", "className={`pb-6 shrink-0 transition-colors`}")

# Feed Empty
content = content.replace("className={`h-full flex flex-col items-center justify-center text-center p-8 mt-12 border border-dashed ${theme === 'dark' ? 'border-white/5 bg-slate-900/30' : 'border-slate-200 bg-slate-50'} rounded-lg transition-colors`}", "className={`flex flex-col items-center justify-center text-center p-8 mt-12 transition-colors`}")

# Feed items container
content = content.replace("className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar transition-colors`}", "className={`flex-1 overflow-y-auto space-y-4 transition-colors`}")

# Small inner grid boxes (Entry Zone, etc)
content = content.replace("className={`${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'} rounded-lg p-6 border relative overflow-hidden group transition-colors`}", "className={`p-6 relative transition-colors`}")

# Bottom execution matrix
content = content.replace("className={`${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'} border rounded-lg p-5 space-y-4 transition-colors`}", "className={`p-5 space-y-4 transition-colors`}")

with open('src/App.tsx', 'w') as f:
    f.write(content)

