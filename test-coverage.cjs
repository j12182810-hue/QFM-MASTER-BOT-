const axios = require('axios');
const CRYPTO_PAIRS = [
  "XLMUSDT", "STORJUSDT", "SANDUSDT", "THETAUSDT", "TRXUSDT", "VETUSDT", "YFIUSDT", "ZECUSDT", "ZILUSDT", 
  "AAVEUSDT", "ALGOUSDT", "AVAXUSDT", "BNBUSDT", "BTCUSDT", "BCHUSDT", "ADAUSDT", "LINKUSDT", "CHZUSDT", 
  "MANAUSDT", "DOGEUSDT", "ETHUSDT", "ICPUSDT", "LTCUSDT", "MASKUSDT", "NEARUSDT", "NEOUSDT", "DOTUSDT", 
  "QTUMUSDT", "XRPUSDT", "SOLUSDT", "STXUSDT"
];

(async () => {
  const { data } = await axios.get('https://api.mexc.com/api/v3/exchangeInfo');
  const mexcSymbols = new Set(data.symbols.map(s => s.symbol));
  
  const missing = CRYPTO_PAIRS.filter(p => !mexcSymbols.has(p));
  console.log("MEXC missing:", missing);
})();
