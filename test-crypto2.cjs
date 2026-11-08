const axios = require('axios');
const CRYPTO_PAIRS = [
  "XLMUSDT", "STORJUSDT", "SANDUSDT", "THETAUSDT", "TRXUSDT", "VETUSDT", "YFIUSDT", "ZECUSDT", "ZILUSDT", 
  "AAVEUSDT", "ALGOUSDT", "AVAXUSDT", "BNBUSDT", "BTCUSDT", "BCHUSDT", "ADAUSDT", "LINKUSDT", "CHZUSDT", 
  "MANAUSDT", "DOGEUSDT", "ETHUSDT", "ICPUSDT", "LTCUSDT", "MASKUSDT", "NEARUSDT", "NEOUSDT", "DOTUSDT", 
  "QTUMUSDT", "XRPUSDT", "SOLUSDT", "STXUSDT"
];

(async () => {
  console.log("Checking MEXC...");
  for (const pair of CRYPTO_PAIRS) {
    try {
      await axios.get(`https://api.mexc.com/api/v3/klines?symbol=${pair}&interval=60m&limit=1`);
    } catch(e) {
      console.log(`MEXC missing: ${pair}`);
    }
  }
  console.log("Checking BinanceUS...");
  for (const pair of CRYPTO_PAIRS) {
    try {
      await axios.get(`https://api.binance.us/api/v3/klines?symbol=${pair}&interval=1h&limit=1`);
    } catch(e) {
      console.log(`BinanceUS missing: ${pair}`);
    }
  }
})();
