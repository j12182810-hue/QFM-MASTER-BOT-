import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Fix main flex col
content = re.sub(r'<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 relative z-10">', r'<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-12 relative z-10">', content)
content = content.replace('<div className="col-span-1 xl:col-span-8 flex flex-col gap-8">', '<div className="flex flex-col gap-12">')
content = content.replace('<div className="col-span-1 xl:col-span-4 flex flex-col gap-6">', '<div className="flex flex-col gap-6">')

# 2. Controls Section Card
content = re.sub(r'className={`\$\{theme === \'dark\' \? \'bg-slate-800 border-white/5\' : \'bg-white border-slate-200 shadow-sm\'\} border rounded-2xl p-5 sm:p-6 relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-end justify-between gap-6 transition-colors duration-300`}', r'className={`relative flex flex-col md:flex-row md:items-end justify-between gap-6 transition-colors duration-300`}', content)

# 3. Empty State Card
content = re.sub(r'className={`\$\{theme === \'dark\' \? \'bg-slate-800 border-white/5\' : \'bg-white border-slate-200 shadow-sm\'\} border rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-\[350px\] transition-colors duration-300`}', r'className={`p-12 flex flex-col items-center justify-center text-center min-h-[350px] transition-colors duration-300`}', content)

# 4. Initial State Card
content = re.sub(r'className={`\$\{theme === \'dark\' \? \'bg-slate-800 border-white/5\' : \'bg-white border-slate-200 shadow-sm\'\} border rounded-2xl p-12 flex flex-col items-center justify-center text-center min-h-\[350px\] relative overflow-hidden transition-colors duration-300`}', r'className={`p-12 flex flex-col items-center justify-center text-center min-h-[350px] relative transition-colors duration-300`}', content)

# 5. Right Column Alerts Feed Card
content = re.sub(r'className={`\$\{theme === \'dark\' \? \'bg-slate-800 border-white/5\' : \'bg-white border-slate-200 shadow-sm\'\} border rounded-2xl p-6 flex-1 flex flex-col max-h-\[800px\] shadow-2xl relative overflow-hidden transition-colors duration-300`}', r'className={`flex-1 flex flex-col relative transition-colors duration-300`}', content)

# 6. Feed items
content = re.sub(r'className={`\$\{theme === \'dark\' \? \'bg-slate-800/50 hover:bg-slate-800/50\' : \'bg-slate-50 hover:bg-slate-100\'\} border rounded-xl p-4 cursor-pointer transition-all duration-300\s*\$\{sig.pair === displaySignal\?\.pair \? \'border-indigo-500/50 shadow-\[0_0_15px_rgba\(99,102,241,0.15\)\]\' : theme === \'dark\' \? \'border-white/5 hover:border-white/10\' : \'border-slate-200 hover:border-slate-300 shadow-sm\'\}`}', r'className={`p-4 cursor-pointer transition-all duration-300 border-b ${theme === \'dark\' ? \'border-white/5\' : \'border-slate-200\'}`}', content)

with open('src/App.tsx', 'w') as f:
    f.write(content)

