import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-sm'} border rounded-2xl p-6 flex-1 flex flex-col max-h-[800px] shadow-2xl relative overflow-hidden transition-colors duration-300`}", "className={`flex-1 flex flex-col relative transition-colors duration-300`}")

# Also check feed items backgrounds
content = re.sub(r"className={`group relative \$\{sig.pair === displaySignal\?\.pair \? 'bg-indigo-500/5' : theme === 'dark' \? 'bg-slate-800/50' : 'bg-white'\} rounded-2xl p-5 border cursor-pointer transition-all duration-300\s*\$\{sig.pair === displaySignal\?\.pair \? 'border-indigo-500/50 shadow-\[0_0_15px_rgba\(99,102,241,0.15\)\]' : theme === 'dark' \? 'border-white/5 hover:border-white/10' : 'border-slate-200 hover:border-slate-300 shadow-sm'\}`}", r"className={`group relative p-5 cursor-pointer transition-all duration-300 border-b ${theme === 'dark' ? 'border-white/5 hover:border-white/10' : 'border-slate-200 hover:border-slate-300'}`}", content)

with open('src/App.tsx', 'w') as f:
    f.write(content)
