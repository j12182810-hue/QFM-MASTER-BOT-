import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add getHTFIntervals function inside App component or outside
if "function getHTFIntervals" not in content:
    content = content.replace("export default function App() {", "function getHTFIntervals(active: string) {\n    let struct = '1h', trend = '4h';\n    if (active === '1h') { struct = '4h'; trend = '1d'; }\n    else if (active === '4h') { struct = '1d'; trend = '1w'; }\n    return { struct, trend };\n}\n\nexport default function App() {")

# Replace the text
text_to_replace = r"<li><strong>HTF Trend Lock:</strong> Execution is strictly forbidden unless the Daily trend is decisively matching the setup direction \(no consolidating\)\.</li>\s*<li><strong>HTF DOL & FVG:</strong> A clear Draw on Liquidity \(DOL\) and Fair Value Gap \(FVG\) MUST first be spotted on the daily timeframe\.</li>"

new_text = """<li><strong>HTF Trend Lock:</strong> Execution is strictly forbidden unless the {getHTFIntervals(timeframe).trend.toUpperCase()} trend is decisively matching the setup direction (no consolidating).</li>
                                <li><strong>HTF DOL & FVG:</strong> A clear Draw on Liquidity (DOL) and Fair Value Gap (FVG) MUST first be spotted on the {getHTFIntervals(timeframe).trend.toUpperCase()} timeframe.</li>"""

content = re.sub(text_to_replace, new_text, content)

with open('src/App.tsx', 'w') as f:
    f.write(content)

