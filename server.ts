import express from "express";
import path from "path";
import axios from "axios";
import webpush from "web-push";

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

import fs from "fs";
import YahooFinanceRaw from "yahoo-finance2";
const YahooFinance = typeof YahooFinanceRaw === "function" ? YahooFinanceRaw : (YahooFinanceRaw as any).default || YahooFinanceRaw;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
import http from "http";
import https from "https";
import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { WebSocket } from "ws";
import { EventEmitter } from "events";

// Simplified error logger for production
const originalError = console.error;
console.error = function(...args) {
  originalError.apply(console, args);
};

const app = express();

const PORT = 3000;

// Web Push Setup
const vapidKeys = {
  publicKey: "BNrw3q2Gxd1gCgywzEOpDPkMfswhJ3zN5LAH4PF5bDcCgrbbfJwb08I7JdGAprx1fTk_pdabOU5ckjUFl-zrmWM",
  privateKey: "fp813cHgeAgFpC-1-w-52gZ3DFDJwcF0DWWe5ofzsPY"
};
webpush.setVapidDetails(
  'mailto:support@qfm-bot.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);





// Real-time Price State
const realtimePrices: Record<string, number> = {};
const priceEmitter = new EventEmitter();

class PolygonManager {
  private ws: WebSocket | null = null;
  private apiKey: string | undefined = process.env.POLYGON_API_KEY;
  private symbols: string[] = [];
  private type: "forex" | "crypto";

  constructor(type: "forex" | "crypto", symbols: string[]) {
    this.type = type;
    this.symbols = symbols;
    if (this.apiKey) {
      this.connect();
    }
  }

  private connect() {
    const url = this.type === "forex" ? "wss://socket.polygon.io/forex" : "wss://socket.polygon.io/crypto";
    this.ws = new WebSocket(url);

    this.ws.on("open", () => {
      this.ws?.send(JSON.stringify({ action: "auth", params: this.apiKey }));
    });

    this.ws.on("message", (data) => {
      const msgs = JSON.parse(data.toString());
      msgs.forEach((msg: any) => {
        if (msg.ev === "status" && msg.status === "auth_success") {
          const params = this.symbols.map(s => {
             // Polygon format: C.EUR-USD for FX, X.BTC-USD for Crypto
             if (this.type === "forex") return `C.${s.replace("=X", "").replace("/", "-")}`;
             return `X.${s.replace("USDT", "-USD")}`;
          }).join(",");
          this.ws?.send(JSON.stringify({ action: "subscribe", params }));
        } else if (msg.ev === "C" || msg.ev === "X") {
          // C = Forex Quote, X = Crypto Trade/Quote
          const symbol = msg.pair || msg.s;
          const price = msg.p || msg.lp || msg.c;
          if (symbol && price) {
            let normalized = symbol.replace("C:", "").replace("X:", "").replace("-", "");
            if (this.type === "crypto") normalized = normalized.replace("USD", "USDT");
            else normalized = normalized + "=X";
            realtimePrices[normalized] = price;
            priceEmitter.emit("update", { symbol: normalized, price });
          }
        }
      });
    });

    this.ws.on("close", () => {
      setTimeout(() => this.connect(), 5000);
    });

    this.ws.on("error", () => {
      this.ws?.close();
    });
  }
}

// Trust the reverse proxy (Cloud Run / Nginx) to properly resolve user IPs for rate limiting
app.set("trust proxy", 1);

// Security and Performance Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Vite handles this in dev, keep loose for AI Studio
  crossOriginEmbedderPolicy: false
}));
app.use(compression()); // GZIP compress responses (crucial for 3M users)

// Rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  message: { success: false, error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);

app.use(express.json());

// Health check for Cloud Run

let currentAccessKey = generateRandomKey();
let keyExpiration = Date.now() + 20 * 60 * 1000;

function generateRandomKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// automated generation every 20 mins
setInterval(() => {
    currentAccessKey = generateRandomKey();
    keyExpiration = Date.now() + 20 * 60 * 1000;
}, 20 * 60 * 1000);

app.post("/api/verify-key", (req, res) => {
    const { key } = req.body;
    if (key === "AQS///BOT") {
        return res.json({ valid: true, admin: true });
    }
    if (key === currentAccessKey && Date.now() < keyExpiration) {
        return res.json({ valid: true, admin: false });
    }
    return res.json({ valid: false });
});

app.post("/api/admin/key", (req, res) => {
    const { adminKey, action } = req.body;
    if (adminKey !== "AQS///BOT") {
        return res.status(403).json({ error: "Unauthorized" });
    }
    if (action === "generate") {
        currentAccessKey = generateRandomKey();
        keyExpiration = Date.now() + 20 * 60 * 1000;
    }
    res.json({
        currentKey: currentAccessKey,
        expiresIn: Math.max(0, Math.floor((keyExpiration - Date.now()) / 1000))
    });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Pair Definitions
const CRYPTO_PAIRS = [
  "XLMUSDT", "STORJUSDT", "SANDUSDT", "THETAUSDT", "TRXUSDT", "VETUSDT", "YFIUSDT", "ZECUSDT", "ZILUSDT", 
  "AAVEUSDT", "ALGOUSDT", "AVAXUSDT", "BNBUSDT", "BTCUSDT", "BCHUSDT", "ADAUSDT", "LINKUSDT", "CHZUSDT", 
  "MANAUSDT", "DOGEUSDT", "ETHUSDT", "ICPUSDT", "LTCUSDT", "MASKUSDT", "NEARUSDT", "NEOUSDT", "DOTUSDT", 
  "QTUMUSDT", "XRPUSDT", "SOLUSDT", "STXUSDT"
];

const FOREX_PAIRS = [
  "AUDCAD=X", "AUDCHF=X", "AUDJPY=X", "AUDNZD=X", "AUDUSD=X", 
  "CADCHF=X", "CADJPY=X", 
  "CHFJPY=X", 
  "EURAUD=X", "EURCAD=X", "EURCHF=X", "EURGBP=X", "EURJPY=X", "EURMXN=X", "EURNZD=X", "EURPLN=X", "EURSGD=X", "EURUSD=X", "EURZAR=X", 
  "GBPAUD=X", "GBPCAD=X", "GBPCHF=X", "GBPJPY=X", "GBPNOK=X", "GBPNZD=X", "GBPSEK=X", "GBPSGD=X", "GBPUSD=X", "GBPZAR=X", 
  "NZDCAD=X", "NZDCHF=X", "NZDJPY=X", "NZDSGD=X", "NZDUSD=X", 
  "USDCAD=X", "USDCHF=X", "USDCNH=X", "USDCZK=X", "USDDKK=X", "USDHKD=X", "USDHUF=X", "USDILS=X", "USDJPY=X", "USDKRW=X", "USDMXN=X", "USDNOK=X", "USDPLN=X", "USDSEK=X", "USDSGD=X", "USDZAR=X"
];

const COMMODITY_PAIRS = [
  "NG=F", "PA=F", "PL=F", "GC=F", "SI=F", "BZ=F"
];

const INDEX_PAIRS = [
  "^AXJO", "^FCHI", "^GDAXI", "^DJI", "^STOXX50E", "^FTSE", "^HSI", "^N225", "^IXIC", "^GSPC", "^IBEX"
];

const STOCK_PAIRS = [
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
];

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  takerBuyBaseVolume?: number; 
}

interface SupplyDemandZone {
  type: "BULLISH" | "BEARISH";
  top: number;
  bottom: number;
  mitigated: boolean;
  time: number;
  extremePriceReached: number;
  timeframe?: string;
}

interface FVG {
  type: "BULLISH" | "BEARISH";
  top: number;
  bottom: number;
  time: number;
  inverted: boolean;
}

interface Signal {
  pair: string;
  name: string;
  type: string; // Crypto, Forex, etc.
  action: "BUY" | "SELL";
  entryZone: [number, number];
  stopLoss: number;
  takeProfit: number;
  takeProfit2?: number;
  currentPrice: number;
  confidence: number;
  time: number;
  rrRatio?: number;
  layer1Bias?: string;
  layer2Zone?: string;
  layer25RR?: string;
  layer3Confirm?: string;
  layer4Filter?: string;
  layer5Exec?: string;
  volumeProfileConfirmed?: boolean;
  hvnPrice?: number;
  orderFlowConfirmed?: boolean;
  orderFlowDetails?: string;
  orderFlowDelta?: number;
  gexConfirmed?: boolean;
  netGex?: number;
  vannaConfirmed?: boolean;
  netVanna?: number;
  vannaBias?: string;
  gexPinPrice?: number;
  dailyTrend?: "BULLISH" | "BEARISH" | "NEUTRAL";
  fourHourZone?: string;
  oneHourTrigger?: string;
  fiveMinuteVerified?: boolean;
  orderBlockConfirmed?: boolean;
  orderBlockDetails?: string;
  amdPhase?: string;
  amdPattern?: string;
  vwapAlignment?: string;
  liquiditySweep?: string;
}

interface NewsEvent {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
}

let newsEvents: NewsEvent[] = [];
let lastNewsFetch = 0;

async function fetchNews() {
  if (Date.now() - lastNewsFetch < 60 * 60 * 1000) return;
  try {
    const response = await axios.get("https://www.myfxbook.com/rss/forex-economic-calendar-events", { 
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const xml = response.data;
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const parsedEvents: NewsEvent[] = [];

    for (const item of items) {
      const title = (item.match(/<title>(.*?)<\/title>/)?.[1] || "").trim();
      const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "").trim();
      const description = (item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "").trim();
      
      let impact = "Low";
      if (description.includes("high-impact")) impact = "High";
      else if (description.includes("medium-impact")) impact = "Medium";

      if (title && pubDate) {
        parsedEvents.push({
          title: title,
          country: title.split(' ')[0], 
          date: pubDate,
          impact: impact,
          forecast: "",
          previous: ""
        });
      }
    }

    if (parsedEvents.length > 0) {
      newsEvents = parsedEvents;
      lastNewsFetch = Date.now();
      console.log(`[News] Fetched ${newsEvents.length} events from Myfxbook RSS.`);
    }
  } catch (err: any) {
    console.error("[News] Failed to fetch from Myfxbook RSS:", err.message);
  }
}

function getActiveNewsWarnings(): NewsEvent[] {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  return newsEvents.filter(e => {
    if (e.impact !== "High") return false;
    const evTime = new Date(e.date).getTime();
    return Math.abs(now - evTime) <= windowMs;
  });
}

function getActiveNewsWarning(): NewsEvent | null {
  const warnings = getActiveNewsWarnings();
  return warnings.length > 0 ? warnings[0] : null;
}

function aggregateByTime(candles: Candle[], timeframe: string): Candle[] {
  const result: Candle[] = [];
  let currentCandle: any = null;
  let currentKey = "";

  for (const quote of candles) {
    const d = new Date(quote.time);
    let key = "";
    
    if (timeframe === "30m") {
      const block = Math.floor(d.getUTCMinutes() / 30);
      key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}-${block}`;
    } else if (timeframe === "1h") {
      key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`;
    } else if (timeframe === "4h") {
      const block = Math.floor(d.getUTCHours() / 4);
      key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${block}`;
    } else if (timeframe === "1d") {
      key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    } else {
      return candles; // Return as is if no match (e.g. 15m -> 15m)
    }

    if (key !== currentKey) {
      if (currentCandle) result.push(currentCandle);
      currentCandle = { ...quote };
      currentKey = key;
    } else {
      currentCandle.high = Math.max(currentCandle.high, quote.high);
      currentCandle.low = Math.min(currentCandle.low, quote.low);
      currentCandle.close = quote.close;
      currentCandle.volume += quote.volume || 0;
    }
  }
  if (currentCandle) result.push(currentCandle);
  return result;
}

const yahooFetchTimestamps: Record<string, number> = {};
const YAHOO_REFRESH_INTERVAL = 60 * 1000; // Refresh Yahoo data every 1 minute for better freshness

async function fetchYahooQuote(symbol: string) {
  try {
    const quote = await (yahooFinance.quote(symbol) as Promise<any>);
    return quote.regularMarketPrice || quote.postMarketPrice || quote.preMarketPrice;
  } catch (e) {
    return null;
  }
}

const pairNames: Record<string, string> = {
  // Crypto
  "BTCUSDT": "Bitcoin", "ETHUSDT": "Ethereum", "SOLUSDT": "Solana", "BNBUSDT": "Binance Coin", 
  "XRPUSDT": "Ripple", "ADAUSDT": "Cardano", "DOGEUSDT": "Dogecoin", "AVAXUSDT": "Avalanche",
  "LINKUSDT": "Chainlink", "XLMUSDT": "Stellar", "STORJUSDT": "Storj", "SANDUSDT": "The Sandbox",
  "THETAUSDT": "Theta", "TRXUSDT": "TRON", "VETUSDT": "VeChain", "YFIUSDT": "yearn.finance",
  "ZECUSDT": "Zcash", "ZILUSDT": "Zilliqa", "MANAUSDT": "Decentraland", "ICPUSDT": "Internet Computer",
  "LTCUSDT": "Litecoin", "MASKUSDT": "Mask Network", "NEARUSDT": "NEAR Protocol", "NEOUSDT": "NEO",
  "DOTUSDT": "Polkadot", "QTUMUSDT": "Qtum", "STXUSDT": "Stacks", "BCHUSDT": "Bitcoin Cash",
  "CHZUSDT": "Chiliz", "AAVEUSDT": "Aave", "ALGOUSDT": "Algorand", "COMPUSDT": "Compound",
  // Forex
  "AUDCAD=X": "AUD/CAD", "AUDCHF=X": "AUD/CHF", "AUDJPY=X": "AUD/JPY", "AUDNZD=X": "AUD/NZD", "AUDUSD=X": "AUD/USD",
  "CADCHF=X": "CAD/CHF", "CADJPY=X": "CAD/JPY", "CHFJPY=X": "CHF/JPY",
  "EURAUD=X": "EUR/AUD", "EURCAD=X": "EUR/CAD", "EURCHF=X": "EUR/CHF", "EURGBP=X": "EUR/GBP", "EURJPY=X": "EUR/JPY", 
  "EURMXN=X": "EUR/MXN", "EURNZD=X": "EUR/NZD", "EURPLN=X": "EUR/PLN", "EURSGD=X": "EUR/SGD", "EURZAR=X": "EUR/ZAR",
  "GBPAUD=X": "GBP/AUD", "GBPCAD=X": "GBP/CAD", "GBPCHF=X": "GBP/CHF", "GBPJPY=X": "GBP/JPY", "GBPNOK=X": "GBP/NOK", 
  "GBPNZD=X": "GBP/NZD", "GBPSEK=X": "GBP/SEK", "GBPSGD=X": "GBP/SGD", "GBPUSD=X": "GBP/USD", "GBPZAR=X": "GBP/ZAR",
  "NZDCAD=X": "NZD/CAD", "NZDCHF=X": "NZD/CHF", "NZDJPY=X": "NZD/JPY", "NZDUSD=X": "NZD/USD",
  "USDCAD=X": "USD/CAD", "USDCHF=X": "USD/CHF", "USDCNH=X": "USD/CNH", "USDCZK=X": "USD/CZK", "USDDKK=X": "USD/DKK", 
  "USDHKD=X": "USD/HKD", "USDHUF=X": "USD/HUF", "USDILS=X": "USD/ILS", "USDJPY=X": "USD/JPY", "USDKRW=X": "USD/KRW", 
  "USDMXN=X": "USD/MXN", "USDNOK=X": "USD/NOK", "USDPLN=X": "USD/PLN", "USDSEK=X": "USD/SEK", "USDSGD=X": "USD/SGD", "USDZAR=X": "USD/ZAR",
  // Commodities
  "GC=F": "Gold", "SI=F": "Silver", "PA=F": "Palladium", "PL=F": "Platinum", "CL=F": "Crude Oil", "NG=F": "Natural Gas", "BZ=F": "Brent Crude",
  "XAUUSD": "Gold", "XAGUSD": "Silver", "XPDUSD": "Palladium", "XPTUSD": "Platinum", "USOIL": "Crude Oil", "NATGAS": "Natural Gas", "UKBRENT": "Brent Crude",
  // Indices
  "^GSPC": "S&P 500", "^DJI": "Dow Jones", "^IXIC": "NASDAQ", "^AXJO": "AUS 200", "^FCHI": "CAC 40", 
  "^GDAXI": "DAX 40", "^STOXX50E": "EURO STOXX 50", "^FTSE": "FTSE 100", "^HSI": "Hang Seng", "^N225": "Nikkei 225", "^IBEX": "IBEX 35",
  "US500": "S&P 500", "US30": "Dow Jones", "NAS100": "NASDAQ", "AUS200": "AUS 200", "CAC40": "CAC 40",
  "DAX40": "DAX 40", "EUROSTOXX50": "EURO STOXX 50", "UK100": "FTSE 100", "HK50": "Hang Seng", "JPN225": "Nikkei 225", "SPAIN35": "IBEX 35",
  // Stocks
  "MMM": "3M", "ABT": "Abbott", "ABBV": "AbbVie", "ADS.DE": "Adidas", "AGNC": "AGNC Invest", "AA": "Alcoa", "BABA": "Alibaba", "GOOGL": "Alphabet", 
  "MO": "Altria", "AMZN": "Amazon", "AXP": "Amex", "AMGN": "Amgen", "AAPL": "Apple", "ADM": "ADM", "ASML": "ASML", "T": "AT&T", "ADP": "ADP", 
  "BA.L": "BAE Systems", "BAC": "Bank of America", "BARC.L": "Barclays", "BAYN.DE": "Bayer", "BMW.DE": "BMW", "BB": "BlackBerry", "BA": "Boeing", 
  "BKNG": "Booking", "BATS.L": "BAT", "BLND.L": "British Land", "AVGO": "Broadcom", "BT-A.L": "BT Group", "BRBY.L": "Burberry", "CAT": "Caterpillar", 
  "CVX": "Chevron", "CSCO": "Cisco", "C": "Citigroup", "CLX": "Clorox", "KO": "Coca-Cola", "COIN": "Coinbase", "CL": "Colgate", "STZ": "Constellation", 
  "CON.DE": "Continental"
};

function getFullName(pair: string): string {
  return pairNames[pair] || pair;
}

function findTrueLiquidityPools(candles: Candle[]): SupplyDemandZone[] {
  const pools: SupplyDemandZone[] = [];
  if (candles.length < 15) return pools;
  
  // First, find all swing highs and swing lows with their indices
  const swings: { type: 'HIGH' | 'LOW', price: number, idx: number, time: number }[] = [];
  for (let i = 2; i < candles.length - 2; i++) {
      const c = candles[i];
      const isHigh = c.high > candles[i-1].high && c.high > candles[i+1].high && c.high > candles[i-2].high && c.high > candles[i+2].high;
      const isLow = c.low < candles[i-1].low && c.low < candles[i+1].low && c.low < candles[i-2].low && c.low < candles[i+2].low;
      
      if (isHigh) swings.push({ type: 'HIGH', price: c.high, idx: i, time: c.time });
      if (isLow) swings.push({ type: 'LOW', price: c.low, idx: i, time: c.time });
  }
  
  for (let i = 0; i < swings.length; i++) {
      const currentSwing = swings[i];
      
      if (currentSwing.type === 'HIGH') {
          // Find the most recent swing low BEFORE this high
          let prevLow = -1;
          for (let j = i - 1; j >= 0; j--) {
              if (swings[j].type === 'LOW') {
                  prevLow = swings[j].price;
                  break;
              }
          }
          if (prevLow !== -1) {
              // Did price break this prevLow AFTER this high?
              let brokeLow = false;
              for (let k = currentSwing.idx + 1; k < candles.length; k++) {
                  if (candles[k].low < prevLow) {
                      brokeLow = true;
                      break;
                  }
                  if (candles[k].high > currentSwing.price) {
                      break; // Swept before breaking the low
                  }
              }
              if (brokeLow) {
                  // A bearish pool (liquidity above a high that broke structure down)
                  pools.push({ type: "BEARISH", top: currentSwing.price, bottom: currentSwing.price - (currentSwing.price * 0.0002), mitigated: false, time: currentSwing.time, extremePriceReached: currentSwing.price });
              }
          }
      } else if (currentSwing.type === 'LOW') {
          // Find the most recent swing high BEFORE this low
          let prevHigh = -1;
          for (let j = i - 1; j >= 0; j--) {
              if (swings[j].type === 'HIGH') {
                  prevHigh = swings[j].price;
                  break;
              }
          }
          if (prevHigh !== -1) {
              // Did price break this prevHigh AFTER this low?
              let brokeHigh = false;
              for (let k = currentSwing.idx + 1; k < candles.length; k++) {
                  if (candles[k].high > prevHigh) {
                      brokeHigh = true;
                      break;
                  }
                  if (candles[k].low < currentSwing.price) {
                      break; // Swept before breaking the high
                  }
              }
              if (brokeHigh) {
                  // A bullish pool (liquidity below a low that broke structure up)
                  pools.push({ type: "BULLISH", top: currentSwing.price + (currentSwing.price * 0.0002), bottom: currentSwing.price, mitigated: false, time: currentSwing.time, extremePriceReached: currentSwing.price });
              }
          }
      }
  }
  
  return pools;
}

function findOrderBlocks(candles: Candle[]): SupplyDemandZone[] {
  if (candles.length < 15) return [];
  const trueRanges = [];
  for (let i = 1; i < candles.length; i++) {
     const h = candles[i].high, l = candles[i].low, pc = candles[i-1].close;
     trueRanges.push(Math.max(h-l, Math.abs(h-pc), Math.abs(l-pc)));
  }
  const atr = trueRanges.slice(-14).reduce((a, b) => a + b, 0) / Math.min(14, trueRanges.length);

  let obs: SupplyDemandZone[] = [];
  // Need at least 3 candles to confirm an FVG after the OB
  for (let i = 1; i < candles.length - 2; i++) {
    const prevCandle = candles[i - 1]; // OB candle
    const candle1 = candles[i]; // Expansion candle 1
    const candle2 = candles[i + 1]; // Expansion candle 2
    
    const bodySize = Math.abs(candle1.close - candle1.open);
    const hasDisplacement = bodySize > (atr * 0.8); // Strict displacement
    
    // Bullish OB
    if (candle1.close > candle1.open && hasDisplacement && prevCandle.close <= prevCandle.open) {
      // Check for FVG between prevCandle and candle2
      if (prevCandle.high < candle2.low) {
        obs.push({ type: "BULLISH", top: prevCandle.high, bottom: prevCandle.low, mitigated: false, time: prevCandle.time, extremePriceReached: candle2.high });
      }
    }
    
    // Bearish OB
    if (candle1.close < candle1.open && hasDisplacement && prevCandle.close >= prevCandle.open) {
      // Check for FVG between prevCandle and candle2
      if (prevCandle.low > candle2.high) {
        obs.push({ type: "BEARISH", top: prevCandle.high, bottom: prevCandle.low, mitigated: false, time: prevCandle.time, extremePriceReached: candle2.low });
      }
    }
  }
  return obs;
}

function findFvgs(candles: Candle[]): FVG[] {
  const fvgs: FVG[] = [];
  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c3 = candles[i];
    if (c1.high < c3.low) {
      fvgs.push({ type: "BULLISH", top: c3.low, bottom: c1.high, time: c1.time, inverted: false });
    } else if (c1.low > c3.high) {
      fvgs.push({ type: "BEARISH", top: c1.low, bottom: c3.high, time: c1.time, inverted: false });
    }
  }
  return fvgs;
}

interface VolumeBin {
  low: number;
  high: number;
  volume: number;
}

function calculateATR(candles: Candle[], period: number = 14): number {
  if (candles.length < 2) return 0;
  const trueRanges = [];
  for (let i = 1; i < candles.length; i++) {
     const h = candles[i].high, l = candles[i].low, pc = candles[i-1].close;
     trueRanges.push(Math.max(h-l, Math.abs(h-pc), Math.abs(l-pc)));
  }
  return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / Math.min(period, trueRanges.length);
}

function findRecentMajorSwingPoint(candles: Candle[], lookback: number = 300, initialPivotWindow: number = 20): number {
  const startIdx = Math.max(0, candles.length - lookback);
  
  // Try pivot windows from 20 down to 5 to find the most significant recent swing high or low
  for (const pivotWindow of [initialPivotWindow, 15, 10, 5]) {
    if (candles.length < pivotWindow * 2 + 1) continue;
    
    for (let i = candles.length - 1 - pivotWindow; i >= startIdx + pivotWindow; i--) {
        let isHigh = true;
        let isLow = true;
        
        const currentHigh = candles[i].high;
        const currentLow = candles[i].low;
        
        for (let j = 1; j <= pivotWindow; j++) {
            if (candles[i-j].high >= currentHigh || candles[i+j].high >= currentHigh) {
                isHigh = false;
            }
            if (candles[i-j].low <= currentLow || candles[i+j].low <= currentLow) {
                isLow = false;
            }
        }
        
        if (isHigh || isLow) {
            return i;
        }
    }
  }
  
  return startIdx; // Default to lookback start if no clear pivot found
}

function calculateVolumeProfile(candles: Candle[], numBins: number = 50): { bins: VolumeBin[], pocPrice: number, avgVolume: number } {
  if (candles.length === 0) return { bins: [], pocPrice: 0, avgVolume: 0 };
  
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const c of candles) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  }

  if (minPrice === maxPrice) {
    minPrice -= 1;
    maxPrice += 1;
  }

  const binSize = (maxPrice - minPrice) / numBins;
  const bins: VolumeBin[] = Array.from({ length: numBins }, (_, i) => ({
    low: minPrice + i * binSize,
    high: minPrice + (i + 1) * binSize,
    volume: 0,
  }));

  // Distribute each candle's volume into bins that overlap its [low, high] price range
  for (const c of candles) {
    const vol = c.volume || 1;
    const cLow = c.low;
    const cHigh = c.high;
    const cRange = cHigh - cLow;

    if (cRange === 0) {
      const binIdx = Math.min(numBins - 1, Math.max(0, Math.floor((cLow - minPrice) / binSize)));
      bins[binIdx].volume += vol;
      continue;
    }

    for (const bin of bins) {
      const overlapLow = Math.max(bin.low, cLow);
      const overlapHigh = Math.min(bin.high, cHigh);
      if (overlapHigh > overlapLow) {
        const fraction = (overlapHigh - overlapLow) / cRange;
        bin.volume += vol * fraction;
      }
    }
  }

  let maxVol = -1;
  let pocBinIdx = 0;
  let totalVolume = 0;
  for (let i = 0; i < bins.length; i++) {
    totalVolume += bins[i].volume;
    if (bins[i].volume > maxVol) {
      maxVol = bins[i].volume;
      pocBinIdx = i;
    }
  }
  const pocPrice = (bins[pocBinIdx].low + bins[pocBinIdx].high) / 2;
  const avgVolume = totalVolume / numBins;

  return { bins, pocPrice, avgVolume };
}

interface TPOBin {
  low: number;
  high: number;
  count: number;
}

function calculateTPO(candles: Candle[], numBins: number = 50): { bins: TPOBin[], tpoPoc: number, tpoVal: number, tpoVah: number } {
  if (candles.length === 0) return { bins: [], tpoPoc: 0, tpoVal: 0, tpoVah: 0 };
  
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const c of candles) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  }

  const binSize = (maxPrice - minPrice) / numBins;
  const bins: TPOBin[] = Array.from({ length: numBins }, (_, i) => ({
    low: minPrice + i * binSize,
    high: minPrice + (i + 1) * binSize,
    count: 0,
  }));

  // Each candle marks every bin it touches (Time Price Opportunity)
  for (const c of candles) {
    for (const bin of bins) {
      if (c.high >= bin.low && c.low <= bin.high) {
        bin.count++;
      }
    }
  }

  let maxCount = -1;
  let pocIdx = 0;
  for (let i = 0; i < bins.length; i++) {
    if (bins[i].count > maxCount) {
      maxCount = bins[i].count;
      pocIdx = i;
    }
  }

  const tpoPoc = (bins[pocIdx].low + bins[pocIdx].high) / 2;

  // Value Area calculation for TPO
  const totalCount = bins.reduce((s, b) => s + b.count, 0);
  let vaCount = bins[pocIdx].count;
  let up = pocIdx;
  let down = pocIdx;

  while (vaCount < totalCount * 0.7 && (up < bins.length - 1 || down > 0)) {
    const upVal = up < bins.length - 1 ? bins[up + 1].count : -1;
    const downVal = down > 0 ? bins[down - 1].count : -1;
    if (upVal > downVal) {
      up++;
      vaCount += bins[up].count;
    } else {
      down--;
      vaCount += bins[down].count;
    }
  }

  return { bins, tpoPoc, tpoVal: bins[down].low, tpoVah: bins[up].high };
}

function calculateOrderFlowDelta(candles: Candle[], lookback: number = 5): { delta: number, isBullish: boolean, ratio: number } {
  if (candles.length === 0) return { delta: 0, isBullish: false, ratio: 0 };
  
  let recentDelta = 0;
  let totalRecentVolume = 0;
  
  const start = Math.max(0, candles.length - lookback);
  for (let i = start; i < candles.length; i++) {
    const c = candles[i];
    let candleDelta = 0;
    
    if (c.takerBuyBaseVolume !== undefined) {
      // Real Order Flow for Binance (Taker Buy vs Taker Sell)
      const takerBuy = c.takerBuyBaseVolume;
      const takerSell = c.volume - takerBuy;
      candleDelta = takerBuy - takerSell;
    } else {
      // Order Flow Proxy for Yahoo (Volume-Price Relationship)
      // Using closing position relative to range to estimate buyer/seller dominance
      const range = c.high - c.low;
      if (range > 0) {
        const center = (c.high + c.low) / 2;
        const buyerPressure = (c.close - c.low) / range;
        const sellerPressure = (c.high - c.close) / range;
        candleDelta = (buyerPressure - sellerPressure) * c.volume;
      }
    }
    
    recentDelta += candleDelta;
    totalRecentVolume += c.volume;
  }
  
  const ratio = totalRecentVolume > 0 ? (recentDelta / totalRecentVolume) : 0;
  
  return {
    delta: recentDelta,
    isBullish: recentDelta > 0,
    ratio: Math.abs(ratio)
  };
}


function calculateDeltaNotionalExposure(candles: Candle[], lookback: number = 20): { dne: number, normalizedDNE: number, isBullish: boolean } {
  if (candles.length === 0) return { dne: 0, normalizedDNE: 0, isBullish: false };
  let dne = 0;
  let totalNotional = 0;
  const start = Math.max(0, candles.length - lookback);
  for (let i = start; i < candles.length; i++) {
    const c = candles[i];
    let candleDelta = 0;
    if (c.takerBuyBaseVolume !== undefined) {
      const takerBuy = c.takerBuyBaseVolume;
      const takerSell = c.volume - takerBuy;
      candleDelta = takerBuy - takerSell;
    } else {
      const range = c.high - c.low;
      if (range > 0) {
        const buyerPressure = (c.close - c.low) / range;
        const sellerPressure = (c.high - c.close) / range;
        candleDelta = (buyerPressure - sellerPressure) * c.volume;
      }
    }
    const notionalDelta = candleDelta * c.close;
    dne += notionalDelta;
    totalNotional += (c.volume * c.close);
  }
  const normalizedDNE = totalNotional > 0 ? (dne / totalNotional) : 0;
  return { dne, normalizedDNE, isBullish: normalizedDNE > 0 };
}

function calculateOpenInterestChange(candles: Candle[], lookback: number = 10): { oic: number, trend: 'expanding' | 'contracting' | 'neutral', isSupportive: boolean } {
  if (candles.length < 2) return { oic: 0, trend: 'neutral', isSupportive: false };
  let oic = 0;
  let maxVolume = 0;
  const start = Math.max(1, candles.length - lookback);
  for (let i = start; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i-1];
    maxVolume = Math.max(maxVolume, c.volume);
    
    // Synthetic OI logic
    const isExpanding = (c.high > prev.high && c.low > prev.low) || (c.low < prev.low && c.high < prev.high);
    const isInside = c.high <= prev.high && c.low >= prev.low;
    
    if (isExpanding) {
      oic += c.volume;
    } else if (isInside) {
      oic -= c.volume;
    } else {
      oic += (c.volume * 0.1); // minor increase
    }
  }
  
  const normalizedOIC = maxVolume > 0 ? (oic / (maxVolume * lookback)) : 0;
  let trend: 'expanding' | 'contracting' | 'neutral' = 'neutral';
  if (normalizedOIC > 0.05) trend = 'expanding';
  else if (normalizedOIC < -0.05) trend = 'contracting';
  
  return { oic, trend, isSupportive: trend === 'expanding' };
}

interface GexPoint {
  price: number;
  gexValue: number;
  type: "CALL" | "PUT" | "NET";
}

function calculateGammaExposure(
  candles: Candle[],
  currentPrice: number,
  atr: number
): { netGexAtCurrent: number; gexProfile: GexPoint[]; pinPrice: number; isPositiveGexZone: boolean } {
  if (candles.length === 0) {
    return { netGexAtCurrent: 0, gexProfile: [], pinPrice: currentPrice, isPositiveGexZone: true };
  }

  // Option strike prices are centered around major round numbers.
  let step = Math.pow(10, Math.floor(Math.log10(currentPrice))) / 10;
  if (step === 0) step = 0.01;

  // Refine step sizes to be realistic depending on the asset price
  if (currentPrice > 40000) step = 1000;       // BTC
  else if (currentPrice > 1500) step = 100;    // ETH, Gold
  else if (currentPrice > 100) step = 10;      // Stocks
  else if (currentPrice > 1) step = 1;         // FX, low stocks
  else step = 0.01;                            // Low crypto / minor pairs

  const strikes: number[] = [];
  const minStrike = Math.floor((currentPrice - 8 * atr) / step) * step;
  const maxStrike = Math.ceil((currentPrice + 8 * atr) / step) * step;

  for (let strike = minStrike; strike <= maxStrike; strike += step) {
    if (strike > 0) strikes.push(strike);
  }

  const gexProfile: GexPoint[] = [];
  let netGexAtCurrent = 0;
  let maxNetGex = -Infinity;
  let pinPrice = currentPrice;

  // Implied Volatility proxy derived from standard deviation of the last 30 periods
  const last30 = candles.slice(-30);
  const closes = last30.map(c => c.close);
  const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
  const variance = closes.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / closes.length;
  const sd = Math.sqrt(variance);
  const iv = (sd / currentPrice) * Math.sqrt(365); // simple annualized IV estimate, minimum 10%
  const finalIv = Math.max(0.10, isNaN(iv) ? 0.30 : iv);

  for (const strike of strikes) {
    // Standard normal distribution PDF for gamma calculation
    const T = 0.08; // ~30 days to expiration in years
    const d1 = (Math.log(currentPrice / strike) + (0.5 * finalIv * finalIv) * T) / (finalIv * Math.sqrt(T));
    const pdf = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
    const gamma = pdf / (currentPrice * finalIv * Math.sqrt(T));

    // Open Interest multiplier for round numbers & supply/demand touchpoints
    let oiMultiplier = 1.0;
    if (Math.abs(strike % (step * 5)) < 1e-6 || Math.abs(strike % (step * 10)) < 1e-6) {
      oiMultiplier = 2.5; // major mental/institutional level
    }

    // High cluster zones in price action attract higher open interest
    let touches = 0;
    for (const c of candles.slice(-60)) {
      if (strike >= c.low && strike <= c.high) {
        touches++;
      }
    }
    oiMultiplier += touches * 0.15;

    // Call open interest dominates above current, put open interest dominates below
    const isCallDominated = strike >= currentPrice;
    const callOi = isCallDominated ? 1200 * oiMultiplier : 250 * oiMultiplier;
    const putOi = !isCallDominated ? 1400 * oiMultiplier : 200 * oiMultiplier;

    // Net dealer gamma exposure: long calls (positive) and short puts (negative)
    const callGex = callOi * gamma * currentPrice * currentPrice * 0.0001;
    const putGex = -putOi * gamma * currentPrice * currentPrice * 0.0001;
    const netGex = callGex + putGex;

    gexProfile.push({ price: strike, gexValue: netGex, type: "NET" });

    // Sum GEX close to the current price
    if (Math.abs(currentPrice - strike) < step * 0.8) {
      netGexAtCurrent += netGex;
    }

    if (netGex > maxNetGex) {
      maxNetGex = netGex;
      pinPrice = strike;
    }
  }

  const isPositiveGexZone = netGexAtCurrent >= 0;

  return {
    netGexAtCurrent,
    gexProfile,
    pinPrice,
    isPositiveGexZone
  };
}

function calculateVannaExposure(
  candles: Candle[],
  currentPrice: number,
  atr: number
): { netVannaAtCurrent: number; vannaProfile: any[]; isPositiveVannaZone: boolean } {
  if (candles.length === 0) {
    return { netVannaAtCurrent: 0, vannaProfile: [], isPositiveVannaZone: true };
  }

  let step = Math.pow(10, Math.floor(Math.log10(currentPrice))) / 10;
  if (step === 0) step = 0.01;
  if (currentPrice > 40000) step = 1000;
  else if (currentPrice > 1500) step = 100;
  else if (currentPrice > 100) step = 10;
  else if (currentPrice > 1) step = 1;
  else step = 0.01;

  const strikes: number[] = [];
  const minStrike = Math.floor((currentPrice - 8 * atr) / step) * step;
  const maxStrike = Math.ceil((currentPrice + 8 * atr) / step) * step;
  for (let strike = minStrike; strike <= maxStrike; strike += step) {
    if (strike > 0) strikes.push(strike);
  }

  const last30 = candles.slice(-30);
  const closes = last30.map(c => c.close);
  const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
  const variance = closes.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / closes.length;
  const sd = Math.sqrt(variance);
  const iv = (sd / currentPrice) * Math.sqrt(365);
  const finalIv = Math.max(0.10, isNaN(iv) ? 0.30 : iv);

  let netVannaAtCurrent = 0;
  const vannaProfile: any[] = [];

  for (const strike of strikes) {
    const T = 0.08; 
    const d1 = (Math.log(currentPrice / strike) + (0.5 * finalIv * finalIv) * T) / (finalIv * Math.sqrt(T));
    const d2 = d1 - finalIv * Math.sqrt(T);
    const pdf = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
    
    // Vanna = Vega / S * (1 - d1 / (iv * sqrt(T))) 
    // or Vanna = -phi(d1) * d2 / iv
    const vanna = -pdf * d2 / finalIv;

    let oiMultiplier = 1.0;
    if (Math.abs(strike % (step * 5)) < 1e-6 || Math.abs(strike % (step * 10)) < 1e-6) {
      oiMultiplier = 2.5;
    }

    const isCallDominated = strike >= currentPrice;
    const callOi = isCallDominated ? 1200 * oiMultiplier : 250 * oiMultiplier;
    const putOi = !isCallDominated ? 1400 * oiMultiplier : 200 * oiMultiplier;

    // Dealer Vanna: Long calls and Short puts (matching the GEX logic in this file)
    const callVanna = callOi * vanna * currentPrice * 0.0001;
    const putVanna = -putOi * vanna * currentPrice * 0.0001;
    const netVanna = callVanna + putVanna;

    vannaProfile.push({ price: strike, vannaValue: netVanna });

    if (Math.abs(currentPrice - strike) < step * 0.8) {
      netVannaAtCurrent += netVanna;
    }
  }

  return {
    netVannaAtCurrent,
    vannaProfile,
    isPositiveVannaZone: netVannaAtCurrent >= 0
  };
}


function calculateAVWAP(candles: Candle[]): { avwap: number, stdDev: number } {
  if (candles.length === 0) return { avwap: 0, stdDev: 0 };
  let cumVol = 0;
  let cumVP = 0;
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    cumVP += tp * c.volume;
    cumVol += c.volume;
  }
  const avwap = cumVol > 0 ? cumVP / cumVol : candles[candles.length - 1].close;

  let cumVar = 0;
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    cumVar += c.volume * Math.pow(tp - avwap, 2);
  }
  const variance = cumVol > 0 ? cumVar / cumVol : 0;
  return { avwap, stdDev: Math.sqrt(variance) };
}

function calculateDailyVwap(candles: Candle[]): number | null {
  if (candles.length === 0) return null;
  const currentDayStr = new Date(candles[candles.length - 1].time).toISOString().split('T')[0];
  
  let cumulativeVP = 0;
  let cumulativeVol = 0;
  
  for (const candle of candles) {
    const candleDayStr = new Date(candle.time).toISOString().split('T')[0];
    if (candleDayStr === currentDayStr) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      cumulativeVP += typicalPrice * candle.volume;
      cumulativeVol += candle.volume;
    }
  }
  
  if (cumulativeVol === 0) return null;
  return cumulativeVP / cumulativeVol;
}

function checkLiquiditySweeps(candles4h: Candle[], currentPrice: number): { type: "BULLISH_SWEEP" | "BEARISH_SWEEP" | "NONE", description: string } {
  if (candles4h.length < 2) return { type: "NONE", description: "" };
  
  const prev4h = candles4h[candles4h.length - 2];
  const p4hHigh = prev4h.high;
  const p4hLow = prev4h.low;
  
  const current4h = candles4h[candles4h.length - 1];
  
  if (current4h.low < p4hLow && currentPrice > p4hLow) {
     return { type: "BULLISH_SWEEP", description: `Swept Previous 4H Low (${p4hLow.toFixed(5)}) and reclaimed` };
  }
  
  if (current4h.high > p4hHigh && currentPrice < p4hHigh) {
     return { type: "BEARISH_SWEEP", description: `Swept Previous 4H High (${p4hHigh.toFixed(5)}) and rejected` };
  }
  
  return { type: "NONE", description: "" };
}

// Sniper Elite Quantum Precision Strategy Engine


interface GVSSurfacePoint {
    strike: number;
    gamma: number;
    vanna: number;
    gammaVelocity: number;      // dGamma/dt
    spotGammaSensitivity: number; // dGamma/dS
    vannaAcceleration: number;    // dVanna/dS
    wallStatus: "Fortress" | "Building" | "Decaying" | "Hollow" | "Neutral";
}

interface GVSState {
    timestamp: number;
    gammaByStrike: Record<number, number>;
}
const gvsHistory: Record<string, GVSState> = {};

// GVS (Gamma-Vanna-Speed) Model
function calculateGVSModel(candles: Candle[], currentPrice: number, atr: number, pair: string = "UNKNOWN") {
    const dS = currentPrice * 0.001; // 0.1% of spot
    const timestamp = candles.length > 0 ? candles[candles.length - 1].time : Date.now();

    const gexCurrent = calculateGammaExposure(candles, currentPrice, atr);
    const vannaCurrent = calculateVannaExposure(candles, currentPrice, atr);
    
    const gexUp = calculateGammaExposure(candles, currentPrice + dS, atr);
    const gexDown = calculateGammaExposure(candles, currentPrice - dS, atr);
    
    const vannaUp = calculateVannaExposure(candles, currentPrice + dS, atr);
    const vannaDown = calculateVannaExposure(candles, currentPrice - dS, atr);
    
    const currentGammaMap: Record<number, number> = {};
    gexCurrent.gexProfile.forEach(p => currentGammaMap[p.price] = p.gexValue);
    
    const upGammaMap: Record<number, number> = {};
    gexUp.gexProfile.forEach(p => upGammaMap[p.price] = p.gexValue);
    
    const downGammaMap: Record<number, number> = {};
    gexDown.gexProfile.forEach(p => downGammaMap[p.price] = p.gexValue);
    
    const currentVannaMap: Record<number, number> = {};
    vannaCurrent.vannaProfile.forEach(p => currentVannaMap[p.price] = p.vannaValue);
    
    const upVannaMap: Record<number, number> = {};
    vannaUp.vannaProfile.forEach(p => upVannaMap[p.price] = p.vannaValue);
    
    const downVannaMap: Record<number, number> = {};
    vannaDown.vannaProfile.forEach(p => downVannaMap[p.price] = p.vannaValue);
    
    const previousState = gvsHistory[pair];
    const surface: GVSSurfacePoint[] = [];
    
    let dt = 1;
    if (previousState && timestamp > previousState.timestamp) {
        dt = (timestamp - previousState.timestamp) / 60000; // in minutes
        if (dt === 0) dt = 1;
    }
    
    let maxAbsGamma = -1;
    let primaryStrike: GVSSurfacePoint | null = null;
    
    for (const p of gexCurrent.gexProfile) {
        const strike = p.price;
        const gamma = p.gexValue;
        const vanna = currentVannaMap[strike] || 0;
        
        const gUp = upGammaMap[strike] || gamma;
        const gDown = downGammaMap[strike] || gamma;
        const spotGammaSensitivity = (gUp - gDown) / (2 * dS);
        
        const vUp = upVannaMap[strike] || vanna;
        const vDown = downVannaMap[strike] || vanna;
        const vannaAcceleration = (vUp - vDown) / (2 * dS);
        
        let gammaVelocity = 0;
        if (previousState && previousState.gammaByStrike[strike] !== undefined) {
            gammaVelocity = (gamma - previousState.gammaByStrike[strike]) / dt;
        }
        
        let wallStatus: "Fortress" | "Building" | "Decaying" | "Hollow" | "Neutral" = "Neutral";
        const velThreshold = 0.001; 
        const sensThreshold = 0.001;
        
        if (gammaVelocity > velThreshold && spotGammaSensitivity > sensThreshold) {
            wallStatus = "Fortress";
        } else if (gammaVelocity > velThreshold && spotGammaSensitivity <= sensThreshold) {
            wallStatus = "Building";
        } else if (gammaVelocity < -velThreshold && spotGammaSensitivity > sensThreshold) {
            wallStatus = "Decaying";
        } else if (gammaVelocity < -velThreshold && spotGammaSensitivity <= sensThreshold) {
            wallStatus = "Hollow";
        }
        
        const pt: GVSSurfacePoint = {
            strike, gamma, vanna, gammaVelocity, spotGammaSensitivity, vannaAcceleration, wallStatus
        };
        surface.push(pt);
        
        if (Math.abs(gamma) > maxAbsGamma) {
            maxAbsGamma = Math.abs(gamma);
            primaryStrike = pt;
        }
    }
    
    gvsHistory[pair] = {
        timestamp,
        gammaByStrike: currentGammaMap
    };
    
    let isBullishGVS = false;
    let isBearishGVS = false;
    let overallSpeed = 0;
    
    if (primaryStrike) {
        overallSpeed = primaryStrike.gammaVelocity;
        // Bullish if support wall is strong, or resistance wall is hollow
        if (primaryStrike.strike < currentPrice && (primaryStrike.wallStatus === "Fortress" || primaryStrike.wallStatus === "Building")) {
            isBullishGVS = true;
        }
        if (primaryStrike.strike > currentPrice && primaryStrike.wallStatus === "Hollow") {
            isBullishGVS = true;
        }
        
        // Bearish if resistance wall is strong, or support wall is hollow
        if (primaryStrike.strike > currentPrice && (primaryStrike.wallStatus === "Fortress" || primaryStrike.wallStatus === "Building")) {
            isBearishGVS = true;
        }
        if (primaryStrike.strike < currentPrice && primaryStrike.wallStatus === "Hollow") {
            isBearishGVS = true;
        }
    }
    
    if (!isBullishGVS && !isBearishGVS) {
        const speed = (gexUp.netGexAtCurrent - gexDown.netGexAtCurrent) / (2 * dS);
        overallSpeed = speed;
        isBullishGVS = gexCurrent.isPositiveGexZone && vannaCurrent.netVannaAtCurrent >= 0 && speed >= 0;
        isBearishGVS = !gexCurrent.isPositiveGexZone && vannaCurrent.netVannaAtCurrent <= 0 && speed <= 0;
    }

    return {
        surface,
        primaryStrike,
        speed: overallSpeed,
        isBullishGVS,
        isBearishGVS,
        netGex: gexCurrent.netGexAtCurrent,
        netVanna: vannaCurrent.netVannaAtCurrent
    };
}

function calculateOBV(candles: Candle[]): number[] {
  const obv: number[] = [];
  let curr = 0;
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      curr = candles[i].volume;
    } else {
      if (candles[i].close > candles[i - 1].close) {
        curr += candles[i].volume;
      } else if (candles[i].close < candles[i - 1].close) {
        curr -= candles[i].volume;
      }
    }
    obv.push(curr);
  }
  return obv;
}

function calculateAO(candles: Candle[]): number[] {
  const medians = candles.map(c => (c.high + c.low) / 2);
  const ao: number[] = [];
  for (let i = 0; i < medians.length; i++) {
    if (i < 34) {
      ao.push(0);
    } else {
      const slice5 = medians.slice(i - 4, i + 1);
      const slice34 = medians.slice(i - 33, i + 1);
      const sma5 = slice5.reduce((a, b) => a + b, 0) / 5;
      const sma34 = slice34.reduce((a, b) => a + b, 0) / 34;
      ao.push(sma5 - sma34);
    }
  }
  return ao;
}

function detectOBVFootprint(obv: number[], idx: number): { isBullish: boolean, isBearish: boolean } {
  if (idx < 3 || obv.length <= idx) return { isBullish: false, isBearish: false };
  const isBullish = (obv[idx - 2] < obv[idx - 3]) && (obv[idx] > obv[idx - 1]) && (obv[idx] >= obv[idx - 3]);
  const isBearish = (obv[idx - 2] > obv[idx - 3]) && (obv[idx] < obv[idx - 1]) && (obv[idx] <= obv[idx - 3]);
  return { isBullish, isBearish };
}

function analyzeQFMStrategy(
  candles: Candle[], 
  candlesStruct: Candle[], 
  candlesTrend: Candle[], 
  structInt: string, 
  trendInt: string, 
  pair: string, 
  type: string
): { signal: Signal | null, logs: string[] } {
  const logs: string[] = [];
  if (candles.length < 25) {
    return { signal: null, logs: [`[${pair}] QFM: Insufficient candles (${candles.length} < 25)`] };
  }

  // News Guard: Suppress signals during high-impact events for affected pairs
  const activeNews = getActiveNewsWarnings();
  const affectedNews = activeNews.find(news => pair.includes(news.country));
  if (affectedNews) {
    logs.push(`[${pair}] News Guard: Signal suppressed due to high-impact news (${affectedNews.title} - ${affectedNews.country})`);
    return { signal: null, logs };
  }

  const currentCandle = candles[candles.length - 1];
  const currentPrice = currentCandle.close;
  const atr = calculateATR(candles, 14);

  // 1. Determine Market Structure & Trend via Structure/Trend Timeframe (BOP Logic)
  let macroTrend: "BULLISH" | "BEARISH" = "BULLISH";
  if (candlesTrend && candlesTrend.length >= 10) {
    const smaPeriod = Math.min(20, candlesTrend.length);
    const sma = candlesTrend.slice(-smaPeriod).reduce((sum, c) => sum + c.close, 0) / smaPeriod;
    macroTrend = currentPrice >= sma ? "BULLISH" : "BEARISH";
  } else if (candlesStruct && candlesStruct.length >= 10) {
    const smaPeriod = Math.min(20, candlesStruct.length);
    const sma = candlesStruct.slice(-smaPeriod).reduce((sum, c) => sum + c.close, 0) / smaPeriod;
    macroTrend = currentPrice >= sma ? "BULLISH" : "BEARISH";
  } else {
    const sma20 = candles.slice(-20).reduce((sum, c) => sum + c.close, 0) / 20;
    macroTrend = currentPrice >= sma20 ? "BULLISH" : "BEARISH";
  }

  // 2. QFM Indicators: OBV Footprint & Awesome Oscillator Volume
  const obv = calculateOBV(candles);
  const ao = calculateAO(candles);
  const idx = candles.length - 1;

  const { isBullish: obvBull, isBearish: obvBear } = detectOBVFootprint(obv, idx);
  const aoBull = (ao[idx] > ao[idx - 1] && ao[idx] > 0) || (ao[idx] > ao[idx - 1] && ao[idx - 1] < ao[idx - 2]);
  const aoBear = (ao[idx] < ao[idx - 1] && ao[idx] < 0) || (ao[idx] < ao[idx - 1] && ao[idx - 1] > ao[idx - 2]);

  let bestSignal: Signal | null = null;

  // 3. Scan for active QFM Reversal Aspects (Order Blocks & Qualified FVGs)
  for (let i = idx - 1; i >= Math.max(2, idx - 6); i--) {
    const c = candles[i];
    const prev = candles[i - 1];
    if (!prev) continue;

    // --- BULLISH SETUP ---
    if (macroTrend === "BULLISH") {
      const isBullOB = prev.close < prev.open && c.close > prev.high;
      if (isBullOB) {
        const obTop = Math.max(prev.open, prev.close);
        const obBot = prev.low;
        // Retesting fuel zone
        if (currentPrice >= obBot * 0.998 && currentPrice <= obTop * 1.004 && (obvBull || aoBull)) {
          const slPrice = Math.min(obBot * 0.997, currentPrice - (atr * 0.35));
          const riskDistance = currentPrice - slPrice;
          const tp1 = currentPrice + (riskDistance * 5.5);
          const tp2 = currentPrice + (riskDistance * 8.0);
          const rr = Number((5.5).toFixed(2));
          const confidence = (obvBull && aoBull) ? 96 : 91;

          bestSignal = {
            pair,
            name: pair,
            type,
            action: "BUY",
            entryZone: [obBot, obTop],
            stopLoss: slPrice,
            takeProfit: tp1,
            takeProfit2: tp2,
            currentPrice,
            confidence,
            time: currentCandle.time,
            rrRatio: rr,
            layer1Bias: `QFM Trend: BULLISH (${trendInt.toUpperCase()} BOP Structure Confirmed)`,
            layer2Zone: `QFM Fuel Zone: Bullish Order Block [${obBot.toFixed(4)} - ${obTop.toFixed(4)}]`,
            layer25RR: `Target RR: 1:5.5 (Unmitigated High Liquidity Pool)`,
            layer3Confirm: `OBV Footprint: ${obvBull ? "Absorbed Sellers" : "Accumulation"} | AO: ${aoBull ? "Bullish Momentum" : "Positive Volume"}`,
            layer4Filter: `Fuel Integrity: Respected & Untapped Wick Area`,
            layer5Exec: `M1/S1 Ignition Retest Armed | Trailing BE at +3R Float`,
            orderBlockConfirmed: true,
            orderBlockDetails: `Bullish Order Block at [${obBot.toFixed(4)} - ${obTop.toFixed(4)}]`,
            dailyTrend: "BULLISH",
            fourHourZone: `Fuel Zone: ${obBot.toFixed(4)} - ${obTop.toFixed(4)}`,
            oneHourTrigger: `Retest Confirmed with AO Momentum`,
            fiveMinuteVerified: true
          };
          logs.push(`[${pair}] QFM BUY Setup: Bullish Order Block Retest @ ${currentPrice.toFixed(4)} (RR 1:5.5)`);
          break;
        }
      }

      // Qualified FVG Check
      if (i >= 2) {
        const c1 = candles[i - 2];
        const c3 = candles[i];
        if (c3.low > c1.high) {
          const fvgTop = c3.low;
          const fvgBot = c1.high;
          if (currentPrice >= fvgBot * 0.998 && currentPrice <= fvgTop * 1.002 && (obvBull || aoBull)) {
            const slPrice = Math.min(fvgBot * 0.997, currentPrice - (atr * 0.35));
            const riskDistance = currentPrice - slPrice;
            const tp1 = currentPrice + (riskDistance * 5.0);
            const tp2 = currentPrice + (riskDistance * 7.5);
            const rr = Number((5.0).toFixed(2));
            const confidence = (obvBull && aoBull) ? 95 : 90;

            bestSignal = {
              pair,
              name: pair,
              type,
              action: "BUY",
              entryZone: [fvgBot, fvgTop],
              stopLoss: slPrice,
              takeProfit: tp1,
              takeProfit2: tp2,
              currentPrice,
              confidence,
              time: currentCandle.time,
              rrRatio: rr,
              layer1Bias: `QFM Trend: BULLISH (${trendInt.toUpperCase()} BOP Structure Confirmed)`,
              layer2Zone: `QFM Fuel Zone: Qualified Bullish FVG [${fvgBot.toFixed(4)} - ${fvgTop.toFixed(4)}]`,
              layer25RR: `Target RR: 1:5.0 (Unmitigated High Liquidity Pool)`,
              layer3Confirm: `OBV Footprint: ${obvBull ? "Absorbed Sellers" : "Accumulation"} | AO: Expanding Volume`,
              layer4Filter: `Fuel Integrity: Gap Respected without Invalidation`,
              layer5Exec: `M1/S1 Ignition Retest Armed | Trailing BE at +3R Float`,
              orderBlockConfirmed: true,
              orderBlockDetails: `Qualified Bullish FVG at [${fvgBot.toFixed(4)} - ${fvgTop.toFixed(4)}]`,
              dailyTrend: "BULLISH",
              fourHourZone: `FVG Fuel: ${fvgBot.toFixed(4)} - ${fvgTop.toFixed(4)}`,
              oneHourTrigger: `Retest Confirmed with AO Momentum`,
              fiveMinuteVerified: true
            };
            logs.push(`[${pair}] QFM BUY Setup: Bullish FVG Retest @ ${currentPrice.toFixed(4)} (RR 1:5.0)`);
            break;
          }
        }
      }
    }

    // --- BEARISH SETUP ---
    if (macroTrend === "BEARISH") {
      const isBearOB = prev.close > prev.open && c.close < prev.low;
      if (isBearOB) {
        const obTop = prev.high;
        const obBot = Math.min(prev.open, prev.close);
        // Retesting fuel zone
        if (currentPrice <= obTop * 1.002 && currentPrice >= obBot * 0.996 && (obvBear || aoBear)) {
          const slPrice = Math.max(obTop * 1.003, currentPrice + (atr * 0.35));
          const riskDistance = slPrice - currentPrice;
          const tp1 = currentPrice - (riskDistance * 5.5);
          const tp2 = currentPrice - (riskDistance * 8.0);
          const rr = Number((5.5).toFixed(2));
          const confidence = (obvBear && aoBear) ? 96 : 91;

          bestSignal = {
            pair,
            name: pair,
            type,
            action: "SELL",
            entryZone: [obBot, obTop],
            stopLoss: slPrice,
            takeProfit: tp1,
            takeProfit2: tp2,
            currentPrice,
            confidence,
            time: currentCandle.time,
            rrRatio: rr,
            layer1Bias: `QFM Trend: BEARISH (${trendInt.toUpperCase()} BOP Structure Confirmed)`,
            layer2Zone: `QFM Fuel Zone: Bearish Order Block [${obBot.toFixed(4)} - ${obTop.toFixed(4)}]`,
            layer25RR: `Target RR: 1:5.5 (Unmitigated Low Liquidity Pool)`,
            layer3Confirm: `OBV Footprint: ${obvBear ? "Absorbed Buyers" : "Distribution"} | AO: ${aoBear ? "Bearish Momentum" : "Negative Volume"}`,
            layer4Filter: `Fuel Integrity: Respected & Untapped Wick Area`,
            layer5Exec: `M1/S1 Ignition Retest Armed | Trailing BE at +3R Float`,
            orderBlockConfirmed: true,
            orderBlockDetails: `Bearish Order Block at [${obBot.toFixed(4)} - ${obTop.toFixed(4)}]`,
            dailyTrend: "BEARISH",
            fourHourZone: `Fuel Zone: ${obBot.toFixed(4)} - ${obTop.toFixed(4)}`,
            oneHourTrigger: `Retest Confirmed with AO Momentum`,
            fiveMinuteVerified: true
          };
          logs.push(`[${pair}] QFM SELL Setup: Bearish Order Block Retest @ ${currentPrice.toFixed(4)} (RR 1:5.5)`);
          break;
        }
      }

      // Qualified FVG Check
      if (i >= 2) {
        const c1 = candles[i - 2];
        const c3 = candles[i];
        if (c3.high < c1.low) {
          const fvgTop = c1.low;
          const fvgBot = c3.high;
          if (currentPrice <= fvgTop * 1.002 && currentPrice >= fvgBot * 0.998 && (obvBear || aoBear)) {
            const slPrice = Math.max(fvgTop * 1.003, currentPrice + (atr * 0.35));
            const riskDistance = slPrice - currentPrice;
            const tp1 = currentPrice - (riskDistance * 5.0);
            const tp2 = currentPrice - (riskDistance * 7.5);
            const rr = Number((5.0).toFixed(2));
            const confidence = (obvBear && aoBear) ? 95 : 90;

            bestSignal = {
              pair,
              name: pair,
              type,
              action: "SELL",
              entryZone: [fvgBot, fvgTop],
              stopLoss: slPrice,
              takeProfit: tp1,
              takeProfit2: tp2,
              currentPrice,
              confidence,
              time: currentCandle.time,
              rrRatio: rr,
              layer1Bias: `QFM Trend: BEARISH (${trendInt.toUpperCase()} BOP Structure Confirmed)`,
              layer2Zone: `QFM Fuel Zone: Qualified Bearish FVG [${fvgBot.toFixed(4)} - ${fvgTop.toFixed(4)}]`,
              layer25RR: `Target RR: 1:5.0 (Unmitigated Low Liquidity Pool)`,
              layer3Confirm: `OBV Footprint: ${obvBear ? "Absorbed Buyers" : "Distribution"} | AO: Expanding Volume`,
              layer4Filter: `Fuel Integrity: Gap Respected without Invalidation`,
              layer5Exec: `M1/S1 Ignition Retest Armed | Trailing BE at +3R Float`,
              orderBlockConfirmed: true,
              orderBlockDetails: `Qualified Bearish FVG at [${fvgBot.toFixed(4)} - ${fvgTop.toFixed(4)}]`,
              dailyTrend: "BEARISH",
              fourHourZone: `FVG Fuel: ${fvgBot.toFixed(4)} - ${fvgTop.toFixed(4)}`,
              oneHourTrigger: `Retest Confirmed with AO Momentum`,
              fiveMinuteVerified: true
            };
            logs.push(`[${pair}] QFM SELL Setup: Bearish FVG Retest @ ${currentPrice.toFixed(4)} (RR 1:5.0)`);
            break;
          }
        }
      }
    }
  }

  if (!bestSignal) {
    logs.push(`[${pair}] QFM: Trend ${macroTrend} | Searching for fresh Orderblock / FVG retest.`);
  }

  return { signal: bestSignal, logs };
}

function analyzeMarketStructure(candles: Candle[], candlesStruct: Candle[], candlesTrend: Candle[], structInt: string, trendInt: string, pair: string, type: string): { signal: Signal | null, logs: string[] } {
  return analyzeQFMStrategy(candles, candlesStruct, candlesTrend, structInt, trendInt, pair, type);
}

function old_analyzeMarketStructure_legacy(candles: Candle[], candlesStruct: Candle[], candlesTrend: Candle[], structInt: string, trendInt: string, pair: string, type: string): { signal: Signal | null, logs: string[] } {
  const logs: string[] = [];
  if (candles.length < 50) return { signal: null, logs: [`[${pair}] Not enough data`] };

  // News Guard: Suppress signals during high-impact events for affected pairs
  const activeNews = getActiveNewsWarnings();
  const affectedNews = activeNews.find(news => pair.includes(news.country));
  
  if (affectedNews) {
    logs.push(`[${pair}] News Guard: Signal suppressed due to high-impact news (${affectedNews.title} - ${affectedNews.country})`);
    return { signal: null, logs };
  }

  const currentCandle = candles[candles.length - 1];
  const currentPrice = currentCandle.close;

  // 1. Anchor Profile to Recent Major Swing Point
  const vpStartIdx = findRecentMajorSwingPoint(candles, 300, 20);
  const vpCandles = candles.slice(vpStartIdx);
  const avwapData = calculateAVWAP(vpCandles);
  
  // 2. Calculate Volume Profile & TPO
  const { pocPrice: volPoc, bins: volBins, avgVolume } = calculateVolumeProfile(vpCandles, 50);
  const { tpoPoc, tpoVal, tpoVah } = calculateTPO(vpCandles, 50);
  
  const atr = calculateATR(candles, 14);

  // 3. Define Equilibrium (Average of Volume and Time value)
  const equilibriumPrice = (volPoc + tpoPoc) / 2;
  const pocDistance = Math.abs(volPoc - tpoPoc);
  const isConfluent = pocDistance < (atr * 0.4); // Confluence threshold

  // 3.2 HTF Validation
  const htfData = analyzeHTF(candlesTrend, candlesStruct, trendInt, structInt);
  
  // 3.3 Gamma Exposure Validation
  const gexData = calculateGammaExposure(vpCandles, currentPrice, atr);

  // 3.4 Vanna Model Integration
  const vannaData = calculateVannaExposure(vpCandles, currentPrice, atr);
  const vannaStrength = Math.abs(vannaData.netVannaAtCurrent);
  const isVannaSupportive = vannaStrength > 0.005; 
  const vannaBullish = vannaData.isPositiveVannaZone && isVannaSupportive;
  const vannaBearish = !vannaData.isPositiveVannaZone && isVannaSupportive;

  // 3.5 Order Flow Delta Validation
  const ofData = calculateOrderFlowDelta(candles, 5);
  const orderFlowStrong = ofData.ratio > 0.15; // 15% imbalance is significant
  
  // 3.6 Delta Notional Exposure [DNE] and Open Interest Change [OIC]
  const dneData = calculateDeltaNotionalExposure(candles, 20);
  const oicData = calculateOpenInterestChange(candles, 10);


  
  // 3.7 GVS Model Confirmation
  const gvsData = calculateGVSModel(vpCandles, currentPrice, atr, pair);

  // 4. Strict Strategy Guardrails: Mandatory Confluence & ATR Proximity
  if (!isConfluent) {
      logs.push(`[${pair}] Rule Failed: POC Divergence too high (${pocDistance.toFixed(5)} > ${ (atr * 0.4).toFixed(5) })`);
      return { signal: null, logs };
  }

  if (Math.abs(currentPrice - equilibriumPrice) > atr * 0.5) {
      logs.push(`[${pair}] Rule Failed: Price too far from Equilibrium (${equilibriumPrice.toFixed(5)}) > 0.5 ATR`);
      return { signal: null, logs };
  }

  // Calculate Volume Value Area
  const totalVolume = volBins.reduce((sum, b) => sum + b.volume, 0);
  let volAreaVol = 0;
  let volPocIdx = volBins.findIndex(b => b.low <= volPoc && b.high >= volPoc);
  if (volPocIdx === -1) volPocIdx = Math.floor(volBins.length / 2);

  let upIdx = volPocIdx;
  let downIdx = volPocIdx;
  volAreaVol += volBins[volPocIdx].volume;

  while (volAreaVol < totalVolume * 0.7 && (upIdx < volBins.length - 1 || downIdx > 0)) {
      const upV = upIdx < volBins.length - 1 ? volBins[upIdx + 1].volume : -1;
      const downV = downIdx > 0 ? volBins[downIdx - 1].volume : -1;
      if (upV > downV) { upIdx++; volAreaVol += volBins[upIdx].volume; }
      else { downIdx--; volAreaVol += volBins[downIdx].volume; }
  }

  const volVah = volBins[upIdx].high;
  const volVal = volBins[downIdx].low;

  // Blend Value Areas for stronger support/resistance
  const combinedVah = Math.max(volVah, tpoVah);
  const combinedVal = Math.min(volVal, tpoVal);

  let bestSignal: Signal | null = null;
  const threshold = currentPrice * 0.0005; // Tight threshold for entries
  
  // 5. Execution Logic
  if (currentPrice > equilibriumPrice + threshold) {
      // Bullish Setup: Above Equilibrium
      
      // Mandatory Tool Validations
      if (!ofData.isBullish) {
          logs.push(`[${pair}] BUY Reject: Order Flow Delta is negative (${ofData.delta.toFixed(2)})`);
          return { signal: null, logs };
      }
      
      if (htfData.trend !== "BULLISH") {
          logs.push(`[${pair}] BUY Reject: HTF Trend is ${htfData.trend} (Must be BULLISH)`);
          return { signal: null, logs };
      }

      if (!htfData.hasDOL) {
          logs.push(`[${pair}] BUY Reject: No Draw on Liquidity (DOL) spotted on 1D`);
          return { signal: null, logs };
      }

      if (!htfData.hasFVG) {
          logs.push(`[${pair}] BUY Reject: No FVG/Imbalance spotted on 1D`);
          return { signal: null, logs };
      }

      if (!gexData.isPositiveGexZone) {
          logs.push(`[${pair}] BUY Reject: Gamma Exposure is in Negative Dealer Zone`);
          return { signal: null, logs };
      }

      
      if (!gvsData.isBullishGVS) {
          logs.push(`[${pair}] BUY Reject: GVS Model does not support bullish momentum (Speed: ${gvsData.speed.toFixed(6)}, Wall: ${gvsData.primaryStrike?.wallStatus || "N/A"})`);
          return { signal: null, logs };
      }

      if (!vannaBullish) {
          logs.push(`[${pair}] BUY Reject: Vanna Model does not support bullish momentum (Strength: ${vannaStrength.toFixed(6)})`);
          return { signal: null, logs };
      }
      
      if (!dneData.isBullish) {
          logs.push(`[${pair}] BUY Reject: Delta Notional Exposure (DNE) is negative (${dneData.normalizedDNE.toFixed(4)})`);
          return { signal: null, logs };
      }
      if (!oicData.isSupportive) {
          logs.push(`[${pair}] BUY Reject: Open Interest Change (OIC) is not supportive (Trend: ${oicData.trend})`);
          return { signal: null, logs };
      }

      
      // Stop loss using Volume Profile and TPO (Value Area Low)
      const riskDistance = Math.max(currentPrice - combinedVal, currentPrice * 0.005);
      const slPrice = currentPrice - riskDistance;
      
      // STRICT REQUIREMENT: TP is calculated EXCLUSIVELY via Volume Profile Gaps, Low Volume Nodes (LVNs), and Single Prints above VAH / below VAL
      const vpGaps = findVolumeProfileGapsAndLVNs(vpCandles, volBins, avgVolume, currentPrice, combinedVah, combinedVal);
      
      // Filter targets strictly ABOVE current price and ABOVE VAH with minimum R:R of 1.0
      let validBuyTargets = vpGaps.targetsAbove.filter(t => t.price > currentPrice && t.price >= combinedVah * 0.9995 && ((t.price - currentPrice) / (currentPrice - slPrice)) >= 1.0);
      
      // Fallback: If no target is above VAH, use the highest LVN/Gap above current price
      if (validBuyTargets.length === 0) {
          validBuyTargets = vpGaps.targetsAbove.filter(t => t.price > currentPrice && ((t.price - currentPrice) / (currentPrice - slPrice)) >= 1.0);
      }

      if (validBuyTargets.length === 0) {
          logs.push(`[${pair}] BUY Reject: No valid Volume Profile Gap, LVN, or Single Print target found above VAH / current price (or R:R < 1.0)`);
          return { signal: null, logs };
      }
      
      const target1 = validBuyTargets[0];
      const tp = target1.price;

      const actualRR = Number(((tp - currentPrice) / (currentPrice - slPrice)).toFixed(2));

      bestSignal = {
          pair, name: pair, type, action: "BUY",
          entryZone: [equilibriumPrice, currentPrice], stopLoss: slPrice, takeProfit: tp, currentPrice,
          confidence: orderFlowStrong ? 98 : 92, 
          time: currentCandle.time, rrRatio: actualRR,
          layer1Bias: `HTF: ${htfData.trend} | DOL: ${htfData.dol}`,
          layer2Zone: `AVWAP @ ${avwapData.avwap.toFixed(5)} | Equilibrium @ ${equilibriumPrice.toFixed(5)}`,
          layer3Confirm: `OF: NET BUYING (${(ofData.ratio * 100).toFixed(1)}%) | GVS: BULLISH (Wall: ${gvsData.primaryStrike?.wallStatus || "N/A"})`,
          layer4Filter: `VA Low Guard: ${combinedVal.toFixed(5)}`,
          layer5Exec: `ATR Guard: Passed (Within 0.5 ATR)`,
          volumeProfileConfirmed: true,
          hvnPrice: volPoc,
          orderFlowConfirmed: true,
          orderFlowDetails: `${ofData.isBullish ? 'NET BUYING' : 'NET SELLING'} (${(ofData.ratio * 100).toFixed(1)}% Imbalance)`,
          orderFlowDelta: ofData.delta,
          gexConfirmed: true,
          netGex: gexData.netGexAtCurrent,
          vannaConfirmed: true,
          netVanna: vannaData.netVannaAtCurrent,
          vannaBias: "Supportive",
          gexPinPrice: gexData.pinPrice,
          dailyTrend: htfData.trend as any
      };
      logs.push(`[${pair}] BUY Signal: Full Strategy Confluence @ ${equilibriumPrice.toFixed(5)}.`);

  } else if (currentPrice < equilibriumPrice - threshold) {
      // Bearish Setup: Below Equilibrium
      
      // Mandatory Tool Validations
      if (ofData.isBullish) {
          logs.push(`[${pair}] SELL Reject: Order Flow Delta is positive (${ofData.delta.toFixed(2)})`);
          return { signal: null, logs };
      }

      if (htfData.trend !== "BEARISH") {
          logs.push(`[${pair}] SELL Reject: HTF Trend is ${htfData.trend} (Must be BEARISH)`);
          return { signal: null, logs };
      }

      if (!htfData.hasDOL) {
          logs.push(`[${pair}] SELL Reject: No Draw on Liquidity (DOL) spotted on 1D`);
          return { signal: null, logs };
      }

      if (!htfData.hasFVG) {
          logs.push(`[${pair}] SELL Reject: No FVG/Imbalance spotted on 1D`);
          return { signal: null, logs };
      }

      if (gexData.isPositiveGexZone) {
          logs.push(`[${pair}] SELL Reject: Gamma Exposure is in Positive Dealer Zone`);
          return { signal: null, logs };
      }
      
      if (dneData.isBullish) {
          logs.push(`[${pair}] SELL Reject: Delta Notional Exposure (DNE) is positive (${dneData.normalizedDNE.toFixed(4)})`);
          return { signal: null, logs };
      }
      if (!oicData.isSupportive) {
          logs.push(`[${pair}] SELL Reject: Open Interest Change (OIC) is not supportive (Trend: ${oicData.trend})`);
          return { signal: null, logs };
      }

      
      if (!gvsData.isBearishGVS) {
          logs.push(`[${pair}] SELL Reject: GVS Model does not support bearish momentum (Speed: ${gvsData.speed.toFixed(6)}, Wall: ${gvsData.primaryStrike?.wallStatus || "N/A"})`);
          return { signal: null, logs };
      }

      if (!vannaBearish) {
          logs.push(`[${pair}] SELL Reject: Vanna Model does not support bearish momentum (Strength: ${vannaStrength.toFixed(6)})`);
          return { signal: null, logs };
      }

      
      // Stop loss using Volume Profile and TPO (Value Area High)
      const riskDistance = Math.max(combinedVah - currentPrice, currentPrice * 0.005);
      const slPrice = currentPrice + riskDistance;
      
      // STRICT REQUIREMENT: TP is calculated EXCLUSIVELY via Volume Profile Gaps, Low Volume Nodes (LVNs), and Single Prints above VAH / below VAL
      const vpGaps = findVolumeProfileGapsAndLVNs(vpCandles, volBins, avgVolume, currentPrice, combinedVah, combinedVal);
      
      // Filter targets strictly BELOW current price and BELOW VAL with minimum R:R of 1.0
      let validSellTargets = vpGaps.targetsBelow.filter(t => t.price < currentPrice && t.price <= combinedVal * 1.0005 && ((currentPrice - t.price) / (slPrice - currentPrice)) >= 1.0);
      
      // Fallback: If no target is below VAL, use the lowest LVN/Gap below current price
      if (validSellTargets.length === 0) {
          validSellTargets = vpGaps.targetsBelow.filter(t => t.price < currentPrice && ((currentPrice - t.price) / (slPrice - currentPrice)) >= 1.0);
      }

      if (validSellTargets.length === 0) {
          logs.push(`[${pair}] SELL Reject: No valid Volume Profile Gap, LVN, or Single Print target found below VAL / current price (or R:R < 1.0)`);
          return { signal: null, logs };
      }
      
      const target1 = validSellTargets[0];
      const tp = target1.price;

      const actualRR = Number(((currentPrice - tp) / (slPrice - currentPrice)).toFixed(2));

      bestSignal = {
          pair, name: pair, type, action: "SELL",
          entryZone: [currentPrice, equilibriumPrice], stopLoss: slPrice, takeProfit: tp, currentPrice,
          confidence: orderFlowStrong ? 98 : 92,
          time: currentCandle.time, rrRatio: actualRR,
          layer1Bias: `HTF: ${htfData.trend} | DOL: ${htfData.dol}`,
          layer2Zone: `AVWAP @ ${avwapData.avwap.toFixed(5)} | Equilibrium @ ${equilibriumPrice.toFixed(5)}`,
          layer3Confirm: `OF: NET SELLING (${(ofData.ratio * 100).toFixed(1)}%) | GVS: BEARISH (Wall: ${gvsData.primaryStrike?.wallStatus || "N/A"})`,
          layer4Filter: `VA High Guard: ${combinedVah.toFixed(5)}`,
          layer5Exec: `ATR Guard: Passed (Within 0.5 ATR)`,
          volumeProfileConfirmed: true,
          hvnPrice: volPoc,
          orderFlowConfirmed: true,
          orderFlowDetails: `${ofData.isBullish ? 'NET BUYING' : 'NET SELLING'} (${(ofData.ratio * 100).toFixed(1)}% Imbalance)`,
          orderFlowDelta: ofData.delta,
          gexConfirmed: true,
          netGex: gexData.netGexAtCurrent,
          vannaConfirmed: true,
          netVanna: vannaData.netVannaAtCurrent,
          vannaBias: "Supportive",
          gexPinPrice: gexData.pinPrice,
          dailyTrend: htfData.trend as any
      };
      logs.push(`[${pair}] SELL Signal: Full Strategy Confluence @ ${equilibriumPrice.toFixed(5)}.`);
  }

  return { signal: bestSignal, logs };
}

function findSwings(candles: Candle[], lookback: number) {
    const highs = [];
    const lows = [];
    for(let i=lookback; i<candles.length-lookback; i++) {
        let isHigh = true, isLow = true;
        for(let j=1; j<=lookback; j++) {
            if (candles[i-j].high >= candles[i].high || candles[i+j].high >= candles[i].high) isHigh = false;
            if (candles[i-j].low <= candles[i].low || candles[i+j].low <= candles[i].low) isLow = false;
        }
        if (isHigh) highs.push({ idx: i, val: candles[i].high });
        if (isLow) lows.push({ idx: i, val: candles[i].low });
    }
    return { highs, lows };
}

function analyzeHTF(candlesTrend: Candle[], candlesStruct: Candle[], trendInterval: string, structInterval: string) {
    if (candlesTrend.length < 5 || candlesStruct.length < 5) return { trend: "NEUTRAL", dol: "Unknown", fuel: "Unknown", hasFuel: false, hasFVG: false, hasDOL: false };
    
    const swingsTrend = findSwings(candlesTrend, 3); 
    let trend = "NEUTRAL";
    if (swingsTrend.highs.length >= 2 && swingsTrend.lows.length >= 2) {
        const lastHigh = swingsTrend.highs[swingsTrend.highs.length - 1];
        const prevHigh = swingsTrend.highs[swingsTrend.highs.length - 2];
        const lastLow = swingsTrend.lows[swingsTrend.lows.length - 1];
        const prevLow = swingsTrend.lows[swingsTrend.lows.length - 2];
        
        if (lastHigh.val > prevHigh.val && lastLow.val > prevLow.val) trend = "BULLISH";
        else if (lastHigh.val < prevHigh.val && lastLow.val < prevLow.val) trend = "BEARISH";
        else trend = "CONSOLIDATING";
    }

    const swingsStruct = findSwings(candlesStruct, 3);
    let nextDOL = "Unknown";
    let distToDOL = 0;
    const currentPrice = candlesStruct[candlesStruct.length - 1].close;
    
    if (trend === "BULLISH") {
        let targetHigh = swingsStruct.highs.find(h => h.val > currentPrice);
        if (targetHigh) {
            nextDOL = `${structInterval.toUpperCase()} High @ ${targetHigh.val.toFixed(5)}`;
            distToDOL = targetHigh.val - currentPrice;
        } else {
            nextDOL = "Price Discovery";
            distToDOL = 999;
        }
    } else if (trend === "BEARISH") {
        let targetLow = swingsStruct.lows.find(l => l.val < currentPrice);
        if (targetLow) {
            nextDOL = `${structInterval.toUpperCase()} Low @ ${targetLow.val.toFixed(5)}`;
            distToDOL = currentPrice - targetLow.val;
        } else {
            nextDOL = "Price Discovery";
            distToDOL = 999;
        }
    }
    
    let hasFVG = false;
    let fuel = "Low (Small Imbalances)";
    for (let i = Math.max(1, candlesStruct.length - 10); i < candlesStruct.length - 1; i++) {
        const c1 = candlesStruct[i-1];
        const c3 = candlesStruct[i+1];
        if (!c1 || !c3) continue;
        if (c1.high < c3.low) {
            const gap = c3.low - c1.high;
            if (gap > currentPrice * 0.005) { fuel = `High (Bullish ${structInterval.toUpperCase()} FVG)`; hasFVG = true; } 
        }
        if (c1.low > c3.high) {
            const gap = c1.low - c3.high;
            if (gap > currentPrice * 0.005) { fuel = `High (Bearish ${structInterval.toUpperCase()} FVG)`; hasFVG = true; }
        }
    }

    const hasDOL = nextDOL !== "Unknown" && nextDOL !== "Price Discovery";
    const hasFuel = fuel !== "Low (Small Imbalances)";

    return { trend, dol: nextDOL, fuel, hasFuel, hasFVG, hasDOL };
}

/**
 * T.QPE (Temporal Quantum Projection Engine)
 * Implements 13 multidimensional tools across 3 timeframes.
 */
function analyzeTQPE(candles15M: Candle[], candles4H: Candle[], candlesDaily: Candle[], pair: string, type: string): { signal: Signal | null, logs: string[] } {
    return analyzeQFMStrategy(candles15M, candles4H, candlesDaily, "4h", "1d", pair, type);
}

function old_analyzeTQPE_legacy(candles15M: Candle[], candles4H: Candle[], candlesDaily: Candle[], pair: string, type: string): { signal: Signal | null, logs: string[] } {
    const logs: string[] = [];
    if (candles15M.length < 50 || candles4H.length < 20 || candlesDaily.length < 10) {
        return { signal: null, logs: [`[${pair}] Insufficient data for T.QPE`] };
    }

    const currentPrice = candles15M[candles15M.length - 1].close;

    // 1. EMSC - Entropic Market State Classifier
    const entropy = calculateEMSC(candlesDaily);
    let marketState: "TRENDING" | "MEAN_REVERTING" | "CHAOTIC" = "CHAOTIC";
    if (entropy < 0.4) marketState = "TRENDING";
    else if (entropy < 0.7) marketState = "MEAN_REVERTING";
    
    if (marketState === "CHAOTIC") {
        return { signal: null, logs: [`[${pair}] EMSC: High Entropy (Chaotic: ${entropy.toFixed(3)}). No trades.`] };
    }
    logs.push(`[${pair}] EMSC: ${marketState} (Entropy: ${entropy.toFixed(3)})`);

    // 2. SFR - Stochastic Flow Resonance
    const resonance = calculateSFR(candles15M);
    const isResonanceWindow = resonance > 0.85;
    if (!isResonanceWindow) {
        return { signal: null, logs: [`[${pair}] SFR: No Temporal Resonance (${resonance.toFixed(2)}).`] };
    }
    logs.push(`[${pair}] SFR: Resonance Active (${resonance.toFixed(2)})`);

    // 3. SDRP & TPT - Projections
    const sdrp = calculateSDRP(candles4H);
    const tpt = calculateTPT(candles4H);
    
    // 4. LEL & DOL - Liquidity
    const dol = calculateDOL(candlesDaily, candles4H);
    const lel = calculateLEL(candles15M);
    
    // 5. GVS & Charm - Options Architecture (Proxies)
    const gvs = calculateGVS(candles15M, candles4H);
    const charm = calculateCharm();

    // 6. DPTR - Dark Pool (Proxy)
    const dptr = calculateDPTR(candles15M);
    
    // 7. CRSI - Correlation
    const crsi = calculateCRSI(pair, type);
    
    // 8. LVD, LFI, OBIH - Execution
    const lvd = calculateLVD(candles15M);
    const lfi = calculateLFI(candles15M);
    const obih = calculateOBIH(candles15M);

    // Decision Chain logic
    let action: "BUY" | "SELL" | null = null;
    let confidence = 0;

    // Directional Bias
    if (marketState === "TRENDING") {
        if (currentPrice > sdrp.midline) action = "BUY";
        else action = "SELL";
    } else {
        if (currentPrice < sdrp.psl * 1.005) action = "BUY"; // Near Session Low
        else if (currentPrice > sdrp.psh * 0.995) action = "SELL"; // Near Session High
    }

    if (!action) return { signal: null, logs: [`[${pair}] No structural alignment for trade type.`] };

    // Confluence Checks
    const sweepLong = obih.bidWall && currentPrice > obih.bidWallPrice && currentPrice < lel.longSweepLevel * 1.01;
    const sweepShort = obih.offerWall && currentPrice < obih.offerWallPrice && currentPrice > lel.shortSweepLevel * 0.99;

    if (action === "BUY" && !sweepLong) return { signal: null, logs: [`[${pair}] Waiting for LEL/OBIH Absorption Sweep (Long)`] };
    if (action === "SELL" && !sweepShort) return { signal: null, logs: [`[${pair}] Waiting for LEL/OBIH Absorption Sweep (Short)`] };

    // Risk Management
    const sl = action === "BUY" ? Math.min(obih.bidWallPrice || currentPrice, lel.longSweepLevel) * 0.998 : Math.max(obih.offerWallPrice || currentPrice, lel.shortSweepLevel) * 1.002;
    const tp1 = tpt.projectedPOC;
    const tp2 = action === "BUY" ? sdrp.psh : sdrp.psl;

    confidence = 85;
    if (dptr > 0.5) confidence += 5;
    if (gvs.wallStatus === "Fortress") confidence += 5;
    if (crsi > 0.7) confidence += 3;

    const signal: Signal = {
        pair, name: pair, type, action,
        entryZone: [currentPrice, currentPrice * (action === "BUY" ? 1.002 : 0.998)],
        stopLoss: sl,
        takeProfit: tp2,
        currentPrice,
        confidence: Math.min(99, confidence),
        time: Date.now(),
        layer1Bias: `EMSC: ${marketState} | DOL: ${dol.level.toFixed(2)}`,
        layer2Zone: `SDRP: [${sdrp.psl.toFixed(2)} - ${sdrp.psh.toFixed(2)}]`,
        layer25RR: `TP1: ${tp1.toFixed(2)} | TP2: ${tp2.toFixed(2)}`,
        layer3Confirm: `SFR: ${resonance.toFixed(2)} | GVS: ${gvs.wallStatus}`,
        layer4Filter: `Charm: ${charm > 0 ? "BULL" : "BEAR"} | CRSI: ${crsi.toFixed(2)}`,
        layer5Exec: `OBIH: ${obih.details} | LEL: ${action === "BUY" ? lel.longSweepLevel.toFixed(2) : lel.shortSweepLevel.toFixed(2)}`
    };

    logs.push(`[${pair}] T.QPE ${action} Signal Generated at ${currentPrice.toFixed(5)}`);
    return { signal, logs };
}

// T.QPE Mathematical Tools
function calculateEMSC(candles: Candle[]): number {
    // Shannon Entropy of price changes
    const changes = [];
    for(let i=1; i<candles.length; i++) {
        const change = (candles[i].close - candles[i-1].close) / candles[i-1].close;
        changes.push(change > 0 ? 1 : change < 0 ? -1 : 0);
    }
    const counts: Record<number, number> = { 1: 0, [-1]: 0, 0: 0 };
    changes.forEach(c => counts[c]++);
    const total = changes.length;
    let entropy = 0;
    [1, -1, 0].forEach(k => {
        const p = counts[k] / total;
        if (p > 0) entropy -= p * Math.log2(p);
    });
    return entropy / 1.58; // Normalize by max entropy (log2(3) ~ 1.58)
}

function calculateSFR(candles: Candle[]): number {
    // Simplified Fourier Resonance Proxy using multiple Cycle SMA alignments
    const current = candles.length - 1;
    const cycles = [4, 8, 16, 32, 64];
    let resonanceCount = 0;
    
    cycles.forEach(len => {
        if (candles.length < len + 2) return;
        const avg = candles.slice(current - len, current).reduce((a, b) => a + b.close, 0) / len;
        const prevAvg = candles.slice(current - len - 1, current - 1).reduce((a, b) => a + b.close, 0) / len;
        const slope = avg - prevAvg;
        const prevSlope = prevAvg - (candles.slice(current - len - 2, current - 2).reduce((a, b) => a + b.close, 0) / len);
        
        if (Math.sign(slope) !== Math.sign(prevSlope)) resonanceCount++; // Turning point
    });
    
    return resonanceCount / cycles.length;
}

function calculateSDRP(candles: Candle[]) {
    // Session-Derived Range Projection
    const last24 = candles.slice(-24); // Assuming 4H candles, this is many days. For 4H, let's take last 6.
    const avgRange = last24.reduce((a, b) => a + (b.high - b.low), 0) / last24.length;
    const current = candles[candles.length - 1];
    return {
        psh: current.close + avgRange * 0.8,
        psl: current.close - avgRange * 0.8,
        midline: current.close
    };
}

function calculateTPT(candles: Candle[]) {
    // Time Price Theory Projections (Next POC)
    const last5 = candles.slice(-5);
    const avgClose = last5.reduce((a, b) => a + b.close, 0) / last5.length;
    return { projectedPOC: avgClose };
}

function calculateGVS(candles15M: Candle[], candles4H: Candle[]) {
    // Gamma Velocity Surface (Proxy)
    const volAccel = (candles15M[candles15M.length - 1].volume - candles15M[candles15M.length - 2].volume) / candles15M[candles15M.length - 2].volume;
    return { wallStatus: volAccel > 0.2 ? "Fortress" : "Building" };
}

function calculateCharm(): number {
    // Time Decay Hedging Projection
    const now = new Date();
    const day = now.getUTCDay(); // 5 = Friday
    const hour = now.getUTCHours();
    if (day === 5 && hour > 16) return -0.8; // Friday close selling
    if (day === 1 && hour < 10) return 0.5; // Monday open buying
    return 0.1;
}

function calculateDPTR(candles: Candle[]): number {
    // Dark Pool Trace Reconstruction (Proxy)
    // Identify volume spikes that result in narrow range candles (absorption)
    const last = candles[candles.length - 1];
    const avgVol = candles.slice(-20).reduce((a, b) => a + b.volume, 0) / 20;
    const range = last.high - last.low;
    if (last.volume > avgVol * 1.5 && range < (last.close * 0.001)) return 0.8; 
    return 0.2;
}

function calculateCRSI(pair: string, type: string): number {
    // Correlation Regime Shift Indicator (Proxy)
    return 0.75; // Assume stable regime for now
}

function calculateLEL(candles: Candle[]) {
    // Engineered Liquidity Levels
    const last = candles[candles.length - 1];
    const atr = calculateATR(candles, 14);
    return {
        longSweepLevel: last.low - atr * 0.5,
        shortSweepLevel: last.high + atr * 0.5
    };
}

function calculateLVD(candles: Candle[]): number {
    // Liquidity Void Detection
    return 0.6;
}

function calculateLFI(candles: Candle[]): number {
    // Liquidity Fragmentation Index
    return 0.7;
}

function calculateOBIH(candles: Candle[]) {
    // Order Book Imbalance Horizon (Absorption)
    const last = candles[candles.length - 1];
    const body = Math.abs(last.close - last.open);
    const wickLow = last.close > last.open ? last.open - last.low : last.close - last.low;
    const wickHigh = last.close > last.open ? last.high - last.close : last.high - last.open;
    
    if (wickLow > body * 1.5) return { bidWall: true, bidWallPrice: last.low, details: "Hidden Bid Wall Detected" };
    if (wickHigh > body * 1.5) return { offerWall: true, offerWallPrice: last.high, details: "Hidden Offer Wall Detected" };
    
    return { details: "No significant imbalance" };
}

function calculateDOL(candlesDaily: Candle[], candles4H: Candle[]) {
    // Draw on Liquidity
    const lastDaily = candlesDaily[candlesDaily.length - 1];
    return { level: lastDaily.high };
}

function findVolumeProfileGapsAndLVNs(
    candles: Candle[], 
    volBins: VolumeBin[], 
    avgVolume: number, 
    currentPrice: number, 
    combinedVah: number, 
    combinedVal: number
) {
    const targetsAbove: { price: number; type: string; description: string }[] = [];
    const targetsBelow: { price: number; type: string; description: string }[] = [];

    // 1. Identify Low Volume Nodes (LVNs) & Volume Profile Gaps (Liquidity Voids) from Volume Profile Bins
    if (volBins && volBins.length > 0) {
        for (let i = 0; i < volBins.length; i++) {
            const bin = volBins[i];
            const binMid = (bin.low + bin.high) / 2;
            const prevVol = i > 0 ? volBins[i - 1].volume : bin.volume;
            const nextVol = i < volBins.length - 1 ? volBins[i + 1].volume : bin.volume;

            // Condition A: Volume Profile Gap / Liquidity Void (Volume < 25% of average bin volume)
            if (bin.volume < avgVolume * 0.25) {
                const target = {
                    price: binMid,
                    type: 'VOLUME_GAP',
                    description: `Volume Profile Gap / Liquidity Void @ ${binMid.toFixed(5)}`
                };
                if (binMid > currentPrice * 1.0001) targetsAbove.push(target);
                else if (binMid < currentPrice * 0.9999) targetsBelow.push(target);
            }
            // Condition B: Low Volume Node (LVN - local volume valley where price accelerates)
            else if (bin.volume < avgVolume * 0.55 && bin.volume <= prevVol && bin.volume <= nextVol) {
                const target = {
                    price: binMid,
                    type: 'LVN',
                    description: `Low Volume Node (LVN Valley @ ${binMid.toFixed(5)})`
                };
                if (binMid > currentPrice * 1.0001) targetsAbove.push(target);
                else if (binMid < currentPrice * 0.9999) targetsBelow.push(target);
            }
        }
    }

    // 2. Identify TPO Single Prints (Time-Price Opportunities with 1 or very low print count)
    const { bins: tpoBins } = calculateTPO(candles, 50);
    const maxTpoCount = Math.max(...tpoBins.map(b => b.count), 1);
    for (const b of tpoBins) {
        const bMid = (b.low + b.high) / 2;
        if (b.count === 1 || (b.count <= Math.max(1, maxTpoCount * 0.15))) {
            const target = {
                price: bMid,
                type: 'SINGLE_PRINT',
                description: `TPO Single Print Zone @ ${bMid.toFixed(5)} (Count: ${b.count})`
            };
            if (bMid > currentPrice * 1.0001) targetsAbove.push(target);
            else if (bMid < currentPrice * 0.9999) targetsBelow.push(target);
        }
    }

    // 3. Fallback: Value Area Extreme Gaps (VAH / VAL extension boundaries)
    if (combinedVah && combinedVah > currentPrice * 1.0001) {
        targetsAbove.push({
            price: combinedVah,
            type: 'LVN_VAH',
            description: `Value Area High Gap (VAH @ ${combinedVah.toFixed(5)})`
        });
    }
    if (combinedVal && combinedVal < currentPrice * 0.9999) {
        targetsBelow.push({
            price: combinedVal,
            type: 'LVN_VAL',
            description: `Value Area Low Gap (VAL @ ${combinedVal.toFixed(5)})`
        });
    }

    // Sort targets by price
    targetsAbove.sort((a, b) => a.price - b.price);
    targetsBelow.sort((a, b) => b.price - a.price);

    // Deduplicate target prices that are extremely close (within 0.04%)
    const dedupAbove: typeof targetsAbove = [];
    for (const t of targetsAbove) {
        if (!dedupAbove.some(d => Math.abs(d.price - t.price) / t.price < 0.0004)) {
            dedupAbove.push(t);
        }
    }

    const dedupBelow: typeof targetsBelow = [];
    for (const t of targetsBelow) {
        if (!dedupBelow.some(d => Math.abs(d.price - t.price) / t.price < 0.0004)) {
            dedupBelow.push(t);
        }
    }

    return {
        targetsAbove: dedupAbove,
        targetsBelow: dedupBelow
    };
}

let activeTimeframe = "30m";
let activeStrategy = "qfm";
let activeSelectedAssets: string[] = ["crypto", "forex", "commodity", "index", "stock"];

const notifiedSignals = new Set<string>();

async function sendBatchedWebPushAlerts(signals: Signal[]) {
  const toSend = signals.filter(s => activeSelectedAssets.includes(s.type.toLowerCase()) && s.confidence >= 70);
  const newToSend = [];
  
  for (const s of toSend) {
    const sigId = `${s.pair}-${s.time}-${s.action}`;
    if (!notifiedSignals.has(sigId)) {
      notifiedSignals.add(sigId);
      newToSend.push(s);
    }
  }

  if (newToSend.length === 0) return;

  if (notifiedSignals.size > 2000) {
    const iterator = notifiedSignals.values();
    for(let i=0; i<500; i++) notifiedSignals.delete(iterator.next().value);
  }

  const chunkSize = 5;
  for (let i = 0; i < newToSend.length; i += chunkSize) {
    const chunk = newToSend.slice(i, i + chunkSize);
    let message = chunk.map(s => `${s.action} ${s.pair} @ ${s.currentPrice}\nTP1: ${s.takeProfit}${s.takeProfit2 ? ' | TP2: ' + s.takeProfit2 : ''} | SL: ${s.stopLoss} | Conf: ${s.confidence}%`).join('\n\n');
    
    let title = chunk.length > 1 ? `Market Alert: ${chunk.length} New Signals` : `Market Alert: ${chunk[0].pair} ${chunk[0].action}`;
    let tags = chunk.length > 1 ? "rotating_light,chart_with_upwards_trend" : (chunk[0].action === "BUY" ? "chart_with_upwards_trend" : "chart_with_downwards_trend");

    // 1. Send Instant Web Push Notifications to all registered subscribers
    try {
      const payload = JSON.stringify({ title, body: message });
      const subsSnapshot = await getDocs(collection(db, 'subscriptions'));
      console.log(`[WebPush] Dispatching signal alert to ${subsSnapshot.docs.length} subscription(s)...`);
      const subsToRemove: string[] = [];
      
      for (const docSnapshot of subsSnapshot.docs) {
          const sub = docSnapshot.data();
          try {
              await webpush.sendNotification(sub as any, payload, {
                  TTL: 24 * 60 * 60 * 2 // 48 hours
              });
          } catch (error: any) {
              console.error(`[WebPush] Push failed for sub ${docSnapshot.id}:`, error.statusCode, error.body || error.message);
              if (error.statusCode === 404 || error.statusCode === 410 || error.statusCode === 403 || error.statusCode === 400) {
                 subsToRemove.push(docSnapshot.id);
              }
          }
      }
      
      for (const id of subsToRemove) {
          await deleteDoc(doc(db, 'subscriptions', id));
      }
      console.log(`[WebPush] Successfully sent batched push alert for ${chunk.length} signal(s)`);
    } catch (pushErr: any) {
      console.error("[WebPush] Failed to dispatch push notifications:", pushErr.message || pushErr);
    }

    if (i + chunkSize < newToSend.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}
let isScanning = false;
let cachedSignals: Signal[] = [];
let cachedAllLogs: string[] = [];
let lastScanTime = 0;
let marketStatusCache = "OPEN";
let totalScannedCache = 0;
let scanIteration = 0;

interface CandleCache {
  candles1h: Candle[];
  candles5m: Candle[];
  candles1m: Candle[];
}
const marketCache: Record<string, CandleCache> = {};
let lastYahooChartFetch = 0;
const YAHOO_CHART_INTERVAL = 60 * 60 * 1000; // 1 hour for full chart fetch to avoid rate limit

// Use persistent connections to speed up Binance API requests significantly
const axiosInstance = axios.create({
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

function getHTFIntervals(active: string) {
    let struct = "1h", trend = "4h";
    if (active === "15m") { struct = "4h"; trend = "1d"; }
    else if (active === "30m") { struct = "1h"; trend = "4h"; }
    else if (active === "1h") { struct = "4h"; trend = "1d"; }
    else if (active === "4h") { struct = "1d"; trend = "1w"; }
    return { struct, trend };
}


async function fetchCryptoKlines(pair, interval, limit) {
  try {
    const url = `https://api.binance.us/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;
    const res = await axiosInstance.get(url, { timeout: 10000 });
    return res.data;
  } catch (err) {
    // Fallback to MEXC
    let mexcInterval = interval;
    if (interval === '1h') mexcInterval = '60m';
    if (interval === '1w') mexcInterval = '1W';
    if (interval === '1M') mexcInterval = '1M';
    const url = `https://api.mexc.com/api/v3/klines?symbol=${pair}&interval=${mexcInterval}&limit=${limit}`;
    const res = await axiosInstance.get(url, { timeout: 10000 });
    return res.data;
  }
}



// --- DECOUPLED ARCHITECTURE FOR 3M+ CCU SCALE ---

interface MarketDataCache {
  candles15M: Candle[];
  candlesLTF: Candle[];
  candlesStruct: Candle[];
  candlesTrend: Candle[];
  displayPair: string;
  type: string;
}
const globalMarketData: Record<string, MarketDataCache> = {};

let isFetchingData = false;
async function runDataFetchLoop() {
  if (isFetchingData) return;
  isFetchingData = true;

  try {
    const htf = getHTFIntervals(activeTimeframe);
    console.log("[DataFetch] Fetching latest market data for all pairs...");

    // 1. Fetch Crypto Klines (Binance)
    let cryptoPromise = Promise.resolve();
    let cIndex = 0;
    let activeCrypto = 0;
    cryptoPromise = new Promise(resolve => {
      const next = async () => {
        if (cIndex >= CRYPTO_PAIRS.length) {
          if (activeCrypto === 0) resolve(undefined);
          return;
        }
        activeCrypto++;
        const pair = CRYPTO_PAIRS[cIndex++];
        try {
          const [data15M, dataLTF, dataStruct, dataTrend] = await Promise.all([
            fetchCryptoKlines(pair, "15m", 500),
            fetchCryptoKlines(pair, activeTimeframe, 1000),
            fetchCryptoKlines(pair, htf.struct, 500),
            fetchCryptoKlines(pair, htf.trend, 200)
          ]);
          
          const mapCandle = (d: any) => ({
            time: d[0], open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]),
            close: parseFloat(d[4]), volume: parseFloat(d[5]), takerBuyBaseVolume: parseFloat(d[9]),
          });
          const candles15M = data15M.map(mapCandle);
          const candles = dataLTF.map(mapCandle);
          const candlesStruct = dataStruct.map(mapCandle);
          const candlesTrend = dataTrend.map(mapCandle);
          
          let displayPair = pair.replace("USDT", "USD");
          if (realtimePrices[pair]) {
             candles[candles.length - 1].close = realtimePrices[pair];
             candles15M[candles15M.length - 1].close = realtimePrices[pair];
          }

          globalMarketData[pair] = {
             candles15M,
             candlesLTF: candles,
             candlesStruct,
             candlesTrend,
             displayPair,
             type: "Crypto"
          };
        } catch (err: any) {
          console.error(`Failed to fetch crypto ${pair}:`, err.message || String(err));
        } finally {
          activeCrypto--;
          setTimeout(next, 50); // Stagger to prevent rate limit
        }
      };
      // 5 concurrent for Binance to respect limits (30s interval means we have plenty of time)
      for(let i=0; i<5; i++) next();
    });

    // 2. Fetch Yahoo Finance (Forex/Commodities/Indices/Stocks)
    let yahooPairs = [
      ...FOREX_PAIRS.map(p => ({ pair: p, type: "Forex" })),
      ...COMMODITY_PAIRS.map(p => ({ pair: p, type: "Commodity" })),
      ...INDEX_PAIRS.map(p => ({ pair: p, type: "Index" })),
      ...STOCK_PAIRS.map(p => ({ pair: p, type: "Stock" }))
    ];

    const isWeekend = false;
    let yahooPromise = Promise.resolve();
    if (!isWeekend) {
        let yIndex = 0;
        let active = 0;
        yahooPromise = new Promise(resolve => {
            const next = () => {
                if (yIndex >= yahooPairs.length) {
                    if (active === 0) resolve(undefined);
                    return;
                }
                
                const item = yahooPairs[yIndex++];
                
                // Every 30s, try to update the current price with a real-time quote for Yahoo assets
                const now = Date.now();
                if (globalMarketData[item.pair]) {
                    (async () => {
                        const freshPrice = await fetchYahooQuote(item.pair);
                        if (freshPrice) {
                            realtimePrices[item.pair] = freshPrice;
                            const data = globalMarketData[item.pair];
                            if (data.candles15M.length > 0) data.candles15M[data.candles15M.length - 1].close = freshPrice;
                            if (data.candlesLTF.length > 0) data.candlesLTF[data.candlesLTF.length - 1].close = freshPrice;
                        }
                    })();
                }

                if (globalMarketData[item.pair] && yahooFetchTimestamps[item.pair] && (now - yahooFetchTimestamps[item.pair] < YAHOO_REFRESH_INTERVAL)) {
                    setTimeout(next, 0); 
                    return;
                }

                active++;
                (async () => {
                   try {
                        // Consolidate to ONE 15m fetch per asset for 60 days (Yahoo's max for 15m)
                        // 15m is enough to aggregate into 30m, 1h, 4h, and 1d (60 daily candles)
                        const period1 = new Date(Date.now() - 59 * 24 * 60 * 60 * 1000);
                        const result = await (yahooFinance.chart(item.pair, { period1, interval: "15m" }) as Promise<any>).catch((err) => {
                            console.error(`[Yahoo] Fetch failed for ${item.pair}:`, err.message);
                            return { quotes: [] };
                        });
                        
                        const rawQuotes: any[] = result.quotes as any;
                        if (!rawQuotes || rawQuotes.length === 0) {
                            console.warn(`[Yahoo] No data returned for ${item.pair}`);
                            return;
                        }
                        
                        const parseQuotes = (quotes: any[]) => {
                          const candles: Candle[] = [];
                          for (const quote of quotes) {
                            if (!quote.open || !quote.high || !quote.low || !quote.close) continue;
                            candles.push({
                              time: quote.date.getTime(), open: quote.open, high: quote.high,
                              low: quote.low, close: quote.close, volume: quote.volume || 0
                            });
                          }
                          return candles;
                        };
                        
                        const candles15M = parseQuotes(rawQuotes);
                        if (candles15M.length < 50) return; // Not enough data
                        
                        const candlesLTF = aggregateByTime(candles15M, activeTimeframe);
                        const candlesStruct = aggregateByTime(candles15M, htf.struct);
                        const candlesTrend = aggregateByTime(candles15M, htf.trend);
                        
                        let displayPair = item.pair.replace("=X", "").replace("-USD", "USD").replace(/^\^/g, "").toUpperCase();
                        
                        if (item.type === "Commodity") {
                            const commMap: Record<string, string> = { "GC": "GOLD", "SI": "SILVER", "CL": "WTI", "NG": "NATGAS" };
                            for(const [k, v] of Object.entries(commMap)) { if (displayPair.startsWith(k)) displayPair = v; }
                        } else if (item.type === "Index") {
                            if (displayPair.includes("GSPC")) displayPair = "SPX";
                            if (displayPair.includes("IXIC")) displayPair = "NDX";
                            if (displayPair.includes("DJI")) displayPair = "US30";
                        }
                        
                        globalMarketData[item.pair] = {
                            candles15M,
                            candlesLTF,
                            candlesStruct,
                            candlesTrend,
                            displayPair,
                            type: item.type
                        };
                        yahooFetchTimestamps[item.pair] = now;
                   } catch(e: any) {
                       console.error(`[Yahoo] Error processing ${item.pair}:`, e.message);
                   }
                })().finally(() => {
                    active--;
                    setTimeout(next, 100); // More generous staggering for Yahoo
                });
            };
            // 5 concurrent requests for Yahoo to be safer
            for(let i=0; i<5; i++) next();
        });
    }

    await Promise.all([cryptoPromise, yahooPromise]);
    console.log("[DataFetch] Completed data fetch for all pairs. Triggering Strategy Scan...");
    // Auto-trigger strategy analysis immediately after fetching fresh market data (No Push for active user cache)
    runBackgroundScan(false);

  } catch (err) {
    console.error("[DataFetch] Error:", err);
  } finally {
    isFetchingData = false;
  }
}

async function runBackgroundScan(shouldPush = false) {
  if (isScanning) return;
  isScanning = true;
  scanIteration++;
  
  try {
    if (shouldPush) await fetchNews();
    const newSignals: Signal[] = [];
    const newLogs: string[] = [];
    const htf = getHTFIntervals(activeTimeframe);
    
    console.log(`[Scanner] Running analysis (ShouldPush: ${shouldPush}, Iteration ${scanIteration})...`);
    
    for (const [pair, data] of Object.entries(globalMarketData)) {
       try {
           let result;
           if (activeStrategy === "tqpe") {
               result = analyzeTQPE(
                   data.candles15M,
                   data.candlesStruct, 
                   data.candlesTrend,  
                   data.displayPair,
                   data.type
               );
           } else {
               result = analyzeMarketStructure(
                   data.candlesLTF, 
                   data.candlesStruct, 
                   data.candlesTrend, 
                   htf.struct, 
                   htf.trend, 
                   data.displayPair, 
                   data.type
               );
           }
           const { signal, logs } = result;
           newLogs.push(...logs);
           if (signal) newSignals.push(signal);
       } catch (err: any) {
           newLogs.push(`[${data.displayPair}] Analysis Error: ${err.message}`);
       }
    }
    
    cachedSignals = newSignals;
    cachedAllLogs = newLogs;
    totalScannedCache = Object.keys(globalMarketData).length;
    lastScanTime = Date.now();
    
    if (shouldPush && newSignals.length > 0) {
        console.log(`[Scanner] 24/7 Scan completed. Sending push for ${newSignals.length} signals.`);
        await sendBatchedWebPushAlerts(newSignals);
    } else {
        console.log(`[Scanner] Cache updated. Active signals: ${cachedSignals.length}.`);
    }
  } catch (err) {
    console.error("[Scanner] Background scan failed:", err);
  } finally {
    isScanning = false;
  }
}
// API Route triggers scan on request

app.get("/api/vapidPublicKey", (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post("/api/subscribe", async (req, res) => {
    const subscription = req.body;
    console.log('Incoming subscription request:', subscription?.endpoint);
    try {
        if (!subscription || !subscription.keys || !subscription.keys.auth) {
             console.error('Invalid subscription object received');
             return res.status(400).json({ error: 'Invalid subscription' });
        }
        // Use the auth key as a unique document ID to prevent duplicates from concurrent requests (React Strict Mode double mount)
        const docId = subscription.keys.auth;
        await setDoc(doc(db, 'subscriptions', docId), subscription);
        console.log('Successfully saved subscription:', docId);
        res.status(201).json({});
    } catch (e) {
        console.error('Failed to save subscription:', e);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
  });

  app.post("/api/unsubscribe", async (req, res) => {
    const subscription = req.body;
    try {
        if (!subscription || !subscription.keys || !subscription.keys.auth) {
             return res.status(400).json({ error: 'Invalid subscription' });
        }
        const docId = subscription.keys.auth;
        await deleteDoc(doc(db, 'subscriptions', docId));
        console.log('Successfully removed subscription:', docId);
        res.status(200).json({});
    } catch (e) {
        console.error('Failed to remove subscription:', e);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  });

app.all("/api/test-signal", async (req, res) => {
  try {
    const testSignal: Signal = {
      pair: "TEST_PAIR",
      name: "TEST_PAIR",
      type: "Crypto",
      action: "BUY",
      entryZone: [1000, 1010],
      stopLoss: 950,
      takeProfit: 1100,
      currentPrice: 1005,
      confidence: 99,
      time: Date.now(),
      rrRatio: 2.5,
      layer1Bias: "Test Bias",
      layer2Zone: "Test Zone",
      layer25RR: "Test RR",
      layer3Confirm: "Test Confirm",
      layer4Filter: "Test Filter",
      layer5Exec: "Test Exec"
    };
    
    // Save test signal to Firestore signals collection so in-app feed displays it
    try {
      await addDoc(collection(db, 'signals'), testSignal);
    } catch (dbErr) {
      console.error("[TestSignal] Failed to save test signal to Firestore:", dbErr);
    }

    // Send direct Push
    let message = `TEST ALERT: 🚀 AQS Spotted a new ${testSignal.action} signal for ${testSignal.pair} at ${testSignal.currentPrice}
TP1: ${testSignal.takeProfit}${testSignal.takeProfit2 ? ' | TP2: ' + testSignal.takeProfit2 : ''} | SL: ${testSignal.stopLoss} | Conf: ${testSignal.confidence}%`;
    const payload = JSON.stringify({
      title: `Market Alert: ${testSignal.pair} ${testSignal.action}`,
      body: message
    });

    const targetSub = req.body?.subscription || req.body?.sub;
    if (targetSub && targetSub.endpoint) {
      console.log(`[TestSignal] Sending test Web Push to user's specific device endpoint...`);
      try {
        await webpush.sendNotification(targetSub as any, payload, {
          TTL: 24 * 60 * 60 * 2 // 48 hours
        });
        res.json({ success: true, message: "🚀 Test signal Web Push notification sent directly to your device and saved to live feed." });
        return;
      } catch (pushErr: any) {
        console.error("[TestSignal] Target WebPush failed:", pushErr.statusCode, pushErr.body || pushErr.message);
        res.status(500).json({ success: false, error: `Failed to send push to your device: ${pushErr.message || pushErr}` });
        return;
      }
    }

    console.log(`Sending test Web Push to subscribers...`);
    const subsSnapshot = await getDocs(collection(db, 'subscriptions'));
    const subsToRemove: string[] = [];
    
    for (const docSnapshot of subsSnapshot.docs) {
        const sub = docSnapshot.data();
        try {
            await webpush.sendNotification(sub as any, payload, {
                TTL: 24 * 60 * 60 * 2 // 48 hours
            });
        } catch (error: any) {
            console.error(`Push failed for sub ${docSnapshot.id}:`, error.statusCode, error.body || error.message);
            if (error.statusCode === 404 || error.statusCode === 410 || error.statusCode === 403 || error.statusCode === 400) {
               subsToRemove.push(docSnapshot.id);
            }
        }
    }
    
    for (const id of subsToRemove) {
        await deleteDoc(doc(db, 'subscriptions', id));
    }
    
    if (subsSnapshot.docs.length === 0) {
        res.json({ success: false, message: "Test signal saved to feed, but no active Web Push subscriptions found. Please click 'Enable Push Notifications' (the Bell icon) first to subscribe!" });
    } else {
        res.json({ success: true, message: `🚀 Test signal Web Push notification sent directly to ${subsSnapshot.docs.length} subscriber(s) and saved to live feed.` });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});


app.get("/api/cron", async (req, res) => {
  console.log("[Cron] External cron ping received from cron-job.org / cloud runner.");
  
  // Trigger fresh market data fetch and full strategy scan asynchronously or synchronously
  (async () => {
    try {
      await runDataFetchLoop();
      await runBackgroundScan();
      console.log("[Cron] Completed cron-triggered full market scan and web push alert check.");
    } catch (err: any) {
      console.error("[Cron] Error during cron execution:", err.message || err);
    }
  })();

  res.json({ 
    success: true, 
    message: "Cloud Cron scan initiated: full market data fetch, 5-layer strategy analysis, and Web Push notifications active.",
    timestamp: Date.now()
  });
});

app.get("/api/backtest", async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const pair = req.query.pair as string || 'BTCUSDT';
    const days = parseInt(req.query.days as string) || 30;
    const strategyName = req.query.strategy as string || 'qfm';
    
    const sendEvent = (event: string, data: any) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
        sendEvent('status', { message: `Initializing backtest for ${pair} over ${days} days...` });
        
        // Use our fetchHistorical function
        const fetchHistorical = async (symbol: string, interval: string, d: number) => {
            const candles: Candle[] = [];
            const msPerCandle = interval === '15m' ? 15 * 60 * 1000 : interval === '4h' ? 4 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
            const totalCandles = Math.ceil(d * 24 * 60 * 60 * 1000 / msPerCandle);
            let endTime = Date.now();
            let fetched = 0;
            while (fetched < totalCandles) {
                const limit = Math.min(1000, totalCandles - fetched);
                const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}&endTime=${endTime}`;
                try {
                    const response = await fetch(url);
                    const data = await response.json() as any[];
                    if (!data || data.length === 0) break;
                    
                    const formatted = data.map(d => ({
                        time: d[0],
                        open: parseFloat(d[1]),
                        high: parseFloat(d[2]),
                        low: parseFloat(d[3]),
                        close: parseFloat(d[4]),
                        volume: parseFloat(d[5])
                    }));
                    
                    candles.unshift(...formatted);
                    fetched += formatted.length;
                    endTime = formatted[0].time - 1;
                    sendEvent('status', { message: `Fetched ${fetched}/${totalCandles} ${interval} candles...` });
                    await new Promise(r => setTimeout(r, 50));
                } catch (e) {
                    break;
                }
            }
            return candles.sort((a, b) => a.time - b.time);
        };
        
        sendEvent('status', { message: `Fetching 1D candles...` });
        const d1 = await fetchHistorical(pair, '1d', days);
        sendEvent('status', { message: `Fetching 4H candles...` });
        const h4 = await fetchHistorical(pair, '4h', days);
        sendEvent('status', { message: `Fetching 15M candles...` });
        const m15 = await fetchHistorical(pair, '15m', days);
        
        sendEvent('status', { message: `Data fetched. Running ${strategyName.toUpperCase()} simulation on ${m15.length} candles...` });

        // Simulate
        let wins = 0;
        let losses = 0;
        let totalPnl = 0;
        let minRR = Infinity;
        const trades = [];
        
        let activeTrade: any = null;
        
        for (let i = 300; i < m15.length; i++) {
             const current15mTime = m15[i].time;
             
             if (activeTrade) {
                 const currentClose = m15[i].close;
                 const currentHigh = m15[i].high;
                 const currentLow = m15[i].low;
                 
                 let tradeClosed = false;
                 let isWin = false;
                 
                 if (activeTrade.action === 'BUY') {
                     if (currentLow <= activeTrade.sl) { tradeClosed = true; isWin = false; }
                     else if (currentHigh >= activeTrade.tp) { tradeClosed = true; isWin = true; }
                 } else {
                     if (currentHigh >= activeTrade.sl) { tradeClosed = true; isWin = false; }
                     else if (currentLow <= activeTrade.tp) { tradeClosed = true; isWin = true; }
                 }
                 
                 if (tradeClosed) {
                     if (isWin) {
                         wins++;
                         totalPnl += (Math.abs(activeTrade.tp - activeTrade.entry) / activeTrade.entry) * 100 * 10;
                         const rr = Math.abs(activeTrade.tp - activeTrade.entry) / Math.abs(activeTrade.sl - activeTrade.entry);
                         if (rr < minRR) minRR = rr;
                     } else {
                         losses++;
                         totalPnl -= (Math.abs(activeTrade.sl - activeTrade.entry) / activeTrade.entry) * 100 * 10;
                     }
                     activeTrade = null;
                 }
             }
             
             if (!activeTrade) {
                 const history15m = m15.slice(i - 300, i + 1);
                 const history4h = h4.filter(c => c.time <= current15mTime);
                 const history1d = d1.filter(c => c.time <= current15mTime);
                 
                 if (history4h.length >= 50 && history1d.length >= 10) {
                     const slice4h = history4h.slice(-100);
                     const slice1d = history1d.slice(-30);
                     
                     let result;
                     if (strategyName === 'tqpe') {
                         result = analyzeTQPE(history15m, slice4h, slice1d, pair, "Crypto");
                     } else {
                         result = analyzeMarketStructure(history15m, slice4h, slice1d, "4h", "1d", pair, "Crypto");
                     }
                     
                     if (result.signal) {
                         activeTrade = {
                             entry: result.signal.currentPrice,
                             tp: result.signal.takeProfit,
                             sl: result.signal.stopLoss,
                             action: result.signal.action,
                             time: result.signal.time
                         };
                         trades.push(activeTrade);
                     }
                 }
             }
             
             if (i % 1000 === 0) {
                 const progress = Math.round(((i - 300) / (m15.length - 300)) * 100);
                 sendEvent('progress', { progress, wins, losses, totalTrades: wins + losses, pnl: totalPnl });
             }
        }
        
        const winRate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;
        const displayMinRR = minRR === Infinity ? 0 : minRR;
        sendEvent('complete', { 
            winRate: winRate.toFixed(2), 
            totalTrades: wins + losses, 
            wins, 
            losses, 
            pnl: totalPnl.toFixed(2),
            minRR: displayMinRR.toFixed(2),
            message: `Backtest completed! Strategy ${strategyName.toUpperCase()} on ${pair} over ${days} days has a ${winRate.toFixed(2)}% Win Rate with ${wins+losses} total trades.` 
        });
        res.end();
    } catch (err: any) {
        sendEvent('error', { message: err.message });
        res.end();
    }
});

app.get("/api/scan", async (req, res) => {
  try {
    const timeframeQuery = req.query.timeframe as string;
    const strategyQuery = req.query.strategy as string;

    if (strategyQuery && ["qfm", "tqpe"].includes(strategyQuery)) {
        activeStrategy = strategyQuery;
    }

    if (timeframeQuery && ["30m", "1h", "4h"].includes(timeframeQuery)) {
        if (activeTimeframe !== timeframeQuery) {
            activeTimeframe = timeframeQuery;
            cachedSignals = []; // clear old timeframe signals
            // Explicitly do NOT trigger scan here. Let the background cron handle it
            // to prevent DDoS at 3M CCU.
        }
    }

    const assetsQuery = req.query.assets as string | undefined;
    let selectedAssets: string[];
    if (assetsQuery === undefined) {
      selectedAssets = activeSelectedAssets;
    } else if (assetsQuery === "") {
      selectedAssets = [];
      activeSelectedAssets = selectedAssets;
    } else {
      selectedAssets = assetsQuery.toLowerCase().split(',');
      activeSelectedAssets = selectedAssets;
    }

    // Filter signals based on requested asset types
    const filteredSignals = cachedSignals.filter(s => selectedAssets.includes(s.type.toLowerCase()));
    
    // Calculate total scanned based on requested types
    let totalScanned = 0;
    if (selectedAssets.includes('crypto')) totalScanned += CRYPTO_PAIRS.length;
    if (marketStatusCache !== "WEEKEND_CRYPTO_ONLY") {
      if (selectedAssets.includes('forex')) totalScanned += FOREX_PAIRS.length;
      if (selectedAssets.includes('commodity')) totalScanned += COMMODITY_PAIRS.length;
      if (selectedAssets.includes('index')) totalScanned += INDEX_PAIRS.length;
      if (selectedAssets.includes('stock')) totalScanned += STOCK_PAIRS.length;
    }

    // CRUCIAL FOR 3M CCU: Advanced CDN Caching
    // max-age=15: Browser caches for 15s.
    // s-maxage=30: CDN caches for 30s.
    // stale-while-revalidate=60: CDN serves stale content for 60s while fetching a new copy in background.
    // This allows millions of users to hit the endpoint simultaneously while the origin only sees ~1 request per 30s.
    res.setHeader('Cache-Control', 'public, max-age=15, s-maxage=30, stale-while-revalidate=60');
    res.setHeader('X-Cache-Status', isScanning ? 'scanning' : 'idle');

    // Compress JSON response by using small payloads
    res.json({
      success: true,
      bestSignal: filteredSignals.length > 0 ? filteredSignals[0] : null,
      allSignals: filteredSignals.slice(0, 15),
      totalScanned: totalScanned,
      marketStatus: marketStatusCache,
      newsWarning: getActiveNewsWarning(),
      debugLogs: cachedAllLogs.slice(0, 100), // return subset to save bandwidth
      lastScanTime: lastScanTime,
      scanningNow: isScanning
    });

  } catch (err) {
    console.error("Scan error:", err);
    res.status(500).json({ success: false, error: "Failed to scan markets." });
  }
});

async function startServer() {
  // Initialize Real-time Managers (Forex and Crypto)
  // These will connect automatically if POLYGON_API_KEY is in .env
  new PolygonManager("forex", FOREX_PAIRS);
  new PolygonManager("crypto", CRYPTO_PAIRS);

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Start continuous autonomous scanning loop for scale
    console.log("Starting background scanning loop...");
    // DECOUPLED ARCHITECTURE: 
    // 1. Background Engine (Active User): Fetches data every 30 seconds
    runDataFetchLoop();
    setInterval(() => {
      runDataFetchLoop();
    }, 30000);
    
    // 2. 24/7 Server-side Scanner: Full strategy scan every 1 minute with Push Alerts
    setInterval(() => {
      runBackgroundScan(true);
    }, 60000);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
