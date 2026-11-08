import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

controls_start_pattern = r'\{\/\* Controls Section \*\/\}.*?<div className="bg-\[#0a0a0a\]  border border-white\/5 rounded-xl p-5 sm:p-8 relative overflow-hidden shadow-2xl">'
controls_end_pattern = r'\{\/\* Primary Signal Result \*\/\}'

# We need to find the exact block and replace it.
# Let's use a simpler string replace since regex might miss some lines.
