with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100vw] h-[500px] bg-indigo-600/10 pointer-events-none opacity-50" />',
    '<div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none" />'
)

content = content.replace(
    '<div className="absolute bottom-0 right-0 w-[50vw] h-[500px] bg-blue-600/5 pointer-events-none opacity-40" />',
    '<div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />'
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
