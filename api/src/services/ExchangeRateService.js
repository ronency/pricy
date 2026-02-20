import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { FALLBACK_RATES } from '@pricy/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, '../../data/exchange-rates.json');
const API_URL = 'https://open.er-api.com/v6/latest/USD';

// In-memory cache so we only read the file once per process
let memoryCache = null;

function todayDateString() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function readCacheFile() {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCacheFile(data) {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

async function fetchFromApi() {
  const { data } = await axios.get(API_URL, { timeout: 10000 });
  if (data.result !== 'success' || !data.rates) {
    throw new Error(`Exchange rate API returned unexpected response: ${data.result}`);
  }
  return data.rates;
}

/**
 * Get current exchange rates (USD-based).
 * Returns cached rates if fetched today, otherwise fetches fresh rates.
 * Falls back to hardcoded rates if the API is unreachable.
 */
export async function getRates() {
  const today = todayDateString();

  // 1. Check in-memory cache
  if (memoryCache && memoryCache.date === today) {
    return memoryCache.rates;
  }

  // 2. Check file cache
  const fileCached = readCacheFile();
  if (fileCached && fileCached.date === today) {
    memoryCache = fileCached;
    return fileCached.rates;
  }

  // 3. Fetch fresh rates
  try {
    const rates = await fetchFromApi();
    const cacheData = { date: today, rates };
    writeCacheFile(cacheData);
    memoryCache = cacheData;
    console.log(`[ExchangeRateService] Fetched fresh rates for ${today}`);
    return rates;
  } catch (err) {
    console.error(`[ExchangeRateService] Failed to fetch rates: ${err.message}`);

    // Use stale file cache if available (better than nothing)
    if (fileCached) {
      console.warn(`[ExchangeRateService] Using stale cached rates from ${fileCached.date}`);
      memoryCache = fileCached;
      return fileCached.rates;
    }

    // Last resort: hardcoded fallback
    console.warn('[ExchangeRateService] Using hardcoded fallback rates');
    return FALLBACK_RATES;
  }
}
