import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace scanning placeholder card
content = content.replace("className={`${theme === 'dark' ? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200'} border rounded-2xl p-12 flex flex-col items-center justify-center min-h-[350px] transition-colors duration-300`}", "className={`p-12 flex flex-col items-center justify-center min-h-[350px] transition-colors duration-300`}")

# Replace result card
content = re.sub(r"className={`\$\{theme === 'dark' \? 'bg-slate-800 border-white/5' : 'bg-white border-slate-200 shadow-xl'\} border rounded-2xl p-5 sm:p-8 lg:p-10 relative overflow-hidden shadow-2xl \$\{displaySignal.action === 'BUY' \? 'border-emerald-500/20' : 'border-rose-500/20'\} transition-colors duration-300`}", r"className={`p-5 sm:p-8 lg:p-10 relative transition-colors duration-300`}", content)

# Replace the inner grid grids for entry zone, sl, tp (Wait, keeping those might be nice for data, but the prompt says "interface should not be cut into sections but it should be one panel". Let's remove their backgrounds too to be safe, or just leave them as subtle data boxes. "not be cut into sections" implies the main layout. I'll leave the small data boxes for now, or just make them fully transparent).
content = content.replace("className={`${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'} rounded-lg p-6 border relative overflow-hidden group transition-colors`}", "className={`p-6 relative group transition-colors`}")

# Remove background from empty standby state
content = content.replace("className={`h-full flex flex-col items-center justify-center text-center p-8 mt-12 border border-dashed ${theme === 'dark' ? 'border-white/5 bg-slate-900/30' : 'border-slate-200 bg-slate-50'} rounded-lg transition-colors`}", "className={`flex flex-col items-center justify-center text-center p-8 mt-12 transition-colors`}")

# Feed items: these are tiny cards in the feed list.
content = content.replace("className={`group relative ${sig.pair === displaySignal?.pair ? 'bg-indigo-500/5' : theme === 'dark' ? 'bg-slate-800/50' : 'bg-white'} rounded-2xl p-5 border cursor-pointer transition-all duration-300", "className={`group relative rounded-2xl p-5 cursor-pointer transition-all duration-300")

# Feed item inner data box
content = content.replace("className={`grid grid-cols-3 gap-2 ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200'} rounded-2xl p-3 border transition-colors`}", "className={`grid grid-cols-3 gap-2 p-3 transition-colors`}")

with open('src/App.tsx', 'w') as f:
    f.write(content)

