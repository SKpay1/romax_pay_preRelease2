import { storage } from '../storage';
import { log } from '../vite';

let expirationInterval: NodeJS.Timeout | null = null;
let isRunning = false;

const EXPIRATION_CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds

async function checkAndExpireDeposits(): Promise<number> {
  if (isRunning) {
    log('Previous expiration check still running, skipping this interval');
    return 0;
  }

  isRunning = true;
  
  try {
    const expiredCount = await storage.expireOldDeposits();
    
    if (expiredCount > 0) {
      log(`✓ Expired ${expiredCount} deposit(s)`);
    }
    
    return expiredCount;
  } catch (error) {
    log(`Error expiring deposits: ${error instanceof Error ? error.message : error}`);
    return 0;
  } finally {
    isRunning = false;
  }
}

export async function startDepositExpirationService(): Promise<void> {
  log('Starting deposit expiration service...');
  
  await checkAndExpireDeposits();
  
  if (expirationInterval) {
    clearInterval(expirationInterval);
  }
  
  expirationInterval = setInterval(async () => {
    await checkAndExpireDeposits();
  }, EXPIRATION_CHECK_INTERVAL_MS);

  const intervalSeconds = EXPIRATION_CHECK_INTERVAL_MS / 1000;
  log(`Deposit expiration service started. Checks every ${intervalSeconds} seconds.`);
}

export function stopDepositExpirationService(): void {
  if (expirationInterval) {
    clearInterval(expirationInterval);
    expirationInterval = null;
    log('Deposit expiration service stopped.');
  }
}

export async function forceCheckExpiration(): Promise<number> {
  return await checkAndExpireDeposits();
}
