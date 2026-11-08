const axios = require('axios');
const http = require('http');
const https = require('https');

async function test() {
  try {
    const res = await axios.post("https://ntfy.sh/AQS_Market_Signals_1849", "Test Axios Default");
    console.log("Default success:", res.data);
  } catch(e) {
    console.log("Default failed:", e.message, e.response?.data);
  }
  
  try {
    const res = await axios.post("https://ntfy.sh/AQS_Market_Signals_1849", "Test Axios IPv6", {
      httpsAgent: new https.Agent({ family: 6 })
    });
    console.log("IPv6 success:", res.data);
  } catch(e) {
    console.log("IPv6 failed:", e.message, e.response?.data);
  }
}
test();
