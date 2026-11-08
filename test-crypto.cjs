const axios = require('axios');
(async () => {
  try {
    const res = await axios.get('https://api.mexc.com/api/v3/klines?symbol=ETHUSDT&interval=60m&limit=5');
    console.log("MEXC 60m:", res.status, res.data.length);
  } catch (e) { console.error("MEXC 60m failed:", e.message); }
  
  try {
    const res = await axios.get('https://api.mexc.com/api/v3/klines?symbol=ETHUSDT&interval=4h&limit=5');
    console.log("MEXC 4h:", res.status, res.data.length);
  } catch (e) { console.error("MEXC 4h failed:", e.message); }
  
  try {
    const res = await axios.get('https://api.mexc.com/api/v3/klines?symbol=ETHUSDT&interval=1d&limit=5');
    console.log("MEXC 1d:", res.status, res.data.length);
  } catch (e) { console.error("MEXC 1d failed:", e.message); }

  try {
    const res = await axios.get('https://api.binance.us/api/v3/klines?symbol=ETHUSDT&interval=1h&limit=5');
    console.log("BinanceUS 1h:", res.status, res.data.length, res.data[0].length);
  } catch (e) { console.error("BinanceUS 1h failed:", e.message); }
})();
