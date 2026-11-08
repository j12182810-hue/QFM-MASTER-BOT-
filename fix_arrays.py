import re

with open('server.ts', 'r') as f:
    content = f.read()

new_crypto = """const CRYPTO_PAIRS = [
  "XLMUSDT", "STORJUSDT", "SANDUSDT", "THETAUSDT", "TRXUSDT", "VETUSDT", "YFIUSDT", "ZECUSDT", "ZILUSDT", 
  "AAVEUSDT", "ALGOUSDT", "AVAXUSDT", "BNBUSDT", "BTCUSDT", "BCHUSDT", "ADAUSDT", "LINKUSDT", "CHZUSDT", 
  "MANAUSDT", "DOGEUSDT", "ETHUSDT", "ICPUSDT", "LTCUSDT", "MASKUSDT", "NEARUSDT", "NEOUSDT", "DOTUSDT", 
  "QTUMUSDT", "XRPUSDT", "SOLUSDT", "STXUSDT"
];"""

new_forex = """const FOREX_PAIRS = [
  "AUDCAD=X", "AUDCHF=X", "AUDJPY=X", "AUDNZD=X", "AUDUSD=X", 
  "CADCHF=X", "CADJPY=X", 
  "CHFJPY=X", 
  "EURAUD=X", "EURCAD=X", "EURCHF=X", "EURGBP=X", "EURJPY=X", "EURMXN=X", "EURNZD=X", "EURPLN=X", "EURSGD=X", "EURUSD=X", "EURZAR=X", 
  "GBPAUD=X", "GBPCAD=X", "GBPCHF=X", "GBPJPY=X", "GBPNOK=X", "GBPNZD=X", "GBPSEK=X", "GBPSGD=X", "GBPUSD=X", "GBPZAR=X", 
  "NZDCAD=X", "NZDCHF=X", "NZDJPY=X", "NZDSGD=X", "NZDUSD=X", 
  "USDCAD=X", "USDCHF=X", "USDCNH=X", "USDCZK=X", "USDDKK=X", "USDHKD=X", "USDHUF=X", "USDILS=X", "USDJPY=X", "USDKRW=X", "USDMXN=X", "USDNOK=X", "USDPLN=X", "USDSEK=X", "USDSGD=X", "USDZAR=X"
];"""

new_commodity = """const COMMODITY_PAIRS = [
  "NG=F", "PA=F", "PL=F", "GC=F", "SI=F", "BZ=F"
];"""

new_index = """const INDEX_PAIRS = [
  "^AXJO", "^FCHI", "^GDAXI", "^DJI", "^STOXX50E", "^FTSE", "^HSI", "^N225", "^IXIC", "^GSPC", "^IBEX"
];"""

new_stock = """const STOCK_PAIRS = [
  "III.L", "MMM", "ABT", "ABBV", "ADS.DE", "AGNC", "AA", "BABA", "GOOGL", "MO", 
  "AMZN", "AXP", "AMGN", "AAPL", "ADM", "ASML", "T", "ADP", "BA.L", "BAC", 
  "BARC.L", "BAYN.DE", "BMW.DE", "BB", "BA", "BKNG", "BTI", "BLND.L", "AVGO", "BT-A.L", 
  "BRBY.L", "CAT", "CVX", "CSCO", "C", "CLX", "KO", "COIN", "CL", "STZ", 
  "CON.DE", "COTY", "DVN", "DOCU", "DBX", "KODK", "EBAY", "EXPE", "XOM", "FIS", 
  "F", "GD", "GE", "GILD", "GPN", "HPQ", "HIK.L", "HD", "HSBA.L", "IBM", 
  "IMB.L", "INTC", "ITRK.L", "JNJ", "JPM", "KER.PA", "KMI", "OR.PA", "LRCX", "LMT", 
  "LCID", "MC.PA", "MLM", "MA", "MCD", "MBG.DE", "META", "MSFT", "MRNA", "TAP", 
  "MDLZ", "MS", "NWG.L", "EDU", "NFLX", "NKE", "NIO", "NSC", "NVDA", "OXY", 
  "OKTA", "PANW", "PYPL", "PSON.L", "PEP", "PFE", "PM", "PDD", "POOL", "PAH3.DE", 
  "QCOM", "RTX", "RNO.PA", "RNG", "SLB", "SIE.DE", "SNOW", "SBUX", "FTI", "TME", 
  "TSCO.L", "TSLA", "TTE", "TTE.PA", "TRIP", "ULVR.L", "UU.L", "VZ", "V", "VOD.L", 
  "VOW3.DE", "VMC", "WMT", "DIS", "ZM"
];"""

content = re.sub(r'const CRYPTO_PAIRS = \[.*?\];', new_crypto, content, flags=re.DOTALL)
content = re.sub(r'const FOREX_PAIRS = \[.*?\];', new_forex, content, flags=re.DOTALL)
content = re.sub(r'const COMMODITY_PAIRS = \[.*?\];', new_commodity, content, flags=re.DOTALL)
content = re.sub(r'const INDEX_PAIRS = \[.*?\];', new_index, content, flags=re.DOTALL)
content = re.sub(r'const STOCK_PAIRS = \[.*?\];', new_stock, content, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(content)
print("Updated arrays successfully!")

