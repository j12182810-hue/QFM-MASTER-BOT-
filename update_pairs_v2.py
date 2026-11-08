import re

with open('server.ts', 'r') as f:
    content = f.read()

new_stock = """const STOCK_PAIRS = [
  "III.L", "MMM", "ABT", "ABBV", "ADS.DE", "AGNC", "AA", "BABA", "GOOGL", "MO", 
  "AMZN", "AXP", "AMGN", "AAPL", "ADM", "ASML.AS", "T", "ADP", "BA.L", "BAC", 
  "BARC.L", "BAYN.DE", "BMW.DE", "BB", "BA", "BKNG", "BATS.L", "BLND.L", "AVGO", "BT-A.L", 
  "BRBY.L", "CAT", "CVX", "CSCO", "C", "CLX", "KO", "COIN", "CL", "STZ", 
  "CON.DE", "COTY", "DVN", "DOCU", "DBX", "KODK", "EBAY", "EXPE", "XOM", "FIS", 
  "F", "GD", "GE", "GILD", "GPN", "HPQ", "HIK.L", "HD", "HSBA.L", "IBM", 
  "IMB.L", "INTC", "ITRK.L", "JNJ", "JPM", "KER.PA", "KMI", "OR.PA", "LRCX", "LMT", 
  "LCID", "MC.PA", "MLM", "MA", "MCD", "MBG.DE", "META", "MSFT", "MRNA", "TAP", 
  "MDLZ", "MS", "NWG.L", "EDU", "NFLX", "NKE", "NIO", "NSC", "NVDA", "OXY", 
  "OKTA", "PANW", "PYPL", "PSON.L", "PEP", "PFE", "PM", "PDD", "POOL", "PAH3.DE", 
  "QCOM", "RTX", "RNO.PA", "RNG", "SLB", "SIE.DE", "SNOW", "SBUX", "FTI", "TME", 
  "TSCO.L", "TSLA", "TTE.PA", "TRIP", "ULVR.L", "UU.L", "VZ", "V", "VOD.L", 
  "VOW3.DE", "VMC", "WMT", "DIS", "ZM"
];"""

content = re.sub(r'const STOCK_PAIRS = \[.*?\];', new_stock, content, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(content)
print("Updated stock pairs successfully!")
