const axios = require('axios');
(async () => {
  try {
    const res = await axios.get('https://api.mexc.com/api/v3/klines?symbol=ETHUSDT&interval=1h&limit=5');
    console.log("MEXC:", res.status, res.data[0]);
  } catch (e) { console.error("MEXC failed:", e.message); }
  
  try {
    const res = await axios.get('https://api.kucoin.com/api/v1/market/candles?type=1hour&symbol=ETH-USDT');
    console.log("Kucoin:", res.status);
  } catch (e) { console.error("Kucoin failed:", e.message); }
  
  try {
    const res = await axios.get('https://api1.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1h&limit=5');
    console.log("Binance1:", res.status);
  } catch (e) { console.error("Binance1 failed:", e.message); }
  
  try {
    const res = await axios.get('https://api.bybit.com/v5/market/kline?category=spot&symbol=ETHUSDT&interval=60&limit=5');
    console.log("Bybit:", res.status);
  } catch (e) { console.error("Bybit failed:", e.message); }
})();
