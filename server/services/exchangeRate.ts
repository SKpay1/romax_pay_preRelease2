interface ExchangeRateData {
  rate: number;
  timestamp: string;
  source: string;
}

interface ExchangeRateAPIResponse {
  result: string;
  base_code: string;
  time_last_update_utc: string;
  rates: {
    RUB: number;
    [key: string]: number;
  };
}

let cachedRate: ExchangeRateData | null = null;
let updateInterval: NodeJS.Timeout | null = null;

// Primary API - ExchangeRate-API free tier (1500 requests/month)
// Update every 30 minutes = 48 requests/day = 1440 requests/month (safe margin)
const EXCHANGE_API_URL = 'https://open.er-api.com/v6/latest/USD';

const UPDATE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const MIN_VALID_RATE = 70;
const MAX_VALID_RATE = 120;

/**
 * Validates if the exchange rate is within reasonable bounds
 */
function isValidRate(rate: number): boolean {
  return rate >= MIN_VALID_RATE && rate <= MAX_VALID_RATE && !isNaN(rate) && isFinite(rate);
}

/**
 * Fetches USD/RUB rate from ExchangeRate-API (free tier: 1500 requests/month)
 */
async function fetchUsdRubRate(): Promise<{ rate: number; source: string }> {
  try {
    const response = await fetch(EXCHANGE_API_URL);
    
    if (!response.ok) {
      throw new Error(`ExchangeRate API returned status ${response.status}`);
    }

    const data: ExchangeRateAPIResponse = await response.json();

    if (data.result !== 'success') {
      throw new Error('ExchangeRate API returned unsuccessful result');
    }

    const rawRate = data.rates.RUB;
    
    // Apply -0.5% adjustment to match market rate closer to CBR
    const adjustedRate = rawRate * 0.995;
    
    // Round to 2 decimal places to ensure displayed rate matches calculation rate
    const rate = Math.round(adjustedRate * 100) / 100;

    if (!rate || !isValidRate(rate)) {
      throw new Error(`Invalid rate: ${rate} (expected ${MIN_VALID_RATE}-${MAX_VALID_RATE})`);
    }

    console.log(`✓ Successfully fetched rate: ${rawRate.toFixed(2)} RUB/USD, adjusted: ${rate.toFixed(2)} RUB/USD (-0.5%)`);
    return {
      rate,
      source: 'Биржевой курс (обновляется каждые 30 минут)'
    };
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Updates the cached exchange rate
 */
async function updateExchangeRate(): Promise<void> {
  try {
    const { rate, source } = await fetchUsdRubRate();
    cachedRate = {
      rate,
      timestamp: new Date().toISOString(),
      source
    };
  } catch (error) {
    console.error('Error updating exchange rate:', error instanceof Error ? error.message : error);
    
    // If we don't have any cached rate yet, set a fallback
    if (!cachedRate) {
      console.warn('Using fallback rate as initial cache is empty');
      cachedRate = {
        rate: 95, // Reasonable fallback
        timestamp: new Date().toISOString(),
        source: 'Резервный курс (API недоступны)'
      };
    } else {
      console.log(`Using last known rate: ${cachedRate.rate.toFixed(2)} RUB/USD from ${cachedRate.timestamp}`);
    }
  }
}

/**
 * Starts the automatic rate update service
 */
export async function startExchangeRateService(): Promise<void> {
  console.log('Starting exchange rate service...');
  
  // Initial fetch
  await updateExchangeRate();
  
  // Set up periodic updates
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  updateInterval = setInterval(async () => {
    await updateExchangeRate();
  }, UPDATE_INTERVAL_MS);

  const intervalMinutes = UPDATE_INTERVAL_MS / (60 * 1000);
  const requestsPerDay = Math.floor((24 * 60) / intervalMinutes);
  const requestsPerMonth = requestsPerDay * 30;
  
  console.log(`Exchange rate service started. Updates every ${intervalMinutes} minutes.`);
  console.log(`Estimated usage: ${requestsPerDay} requests/day, ${requestsPerMonth} requests/month (limit: 1500).`);
}

/**
 * Stops the automatic rate update service
 */
export function stopExchangeRateService(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
    console.log('Exchange rate service stopped.');
  }
}

/**
 * Gets the current cached exchange rate
 * Returns the last successfully fetched rate
 */
export function getCurrentExchangeRate(): ExchangeRateData {
  if (!cachedRate) {
    // Return a safe fallback if service hasn't started yet
    return {
      rate: 95,
      timestamp: new Date().toISOString(),
      source: 'Биржевой курс (загрузка...)'
    };
  }
  
  return cachedRate;
}

/**
 * Forces an immediate rate update (useful for testing)
 */
export async function forceUpdateExchangeRate(): Promise<ExchangeRateData> {
  await updateExchangeRate();
  return getCurrentExchangeRate();
}
