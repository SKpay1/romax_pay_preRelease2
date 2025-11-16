import { storage } from '../storage';

const MIN_DEPOSIT_USDT = 30;
const MAX_DEPOSIT_USDT = 20000;
const MAX_DELTA = 0.01;
const DECIMAL_PLACES = 4;

export function validateDepositAmount(amount: number): { valid: boolean; error?: string } {
  if (amount < MIN_DEPOSIT_USDT) {
    return { valid: false, error: `Минимальная сумма пополнения ${MIN_DEPOSIT_USDT} USDT` };
  }
  if (amount > MAX_DEPOSIT_USDT) {
    return { valid: false, error: `Максимальная сумма пополнения ${MAX_DEPOSIT_USDT} USDT` };
  }
  return { valid: true };
}

export function roundToDecimals(num: number, decimals: number): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export async function generateUniquePayableAmount(requestedAmount: number): Promise<number> {
  const roundedRequested = roundToDecimals(requestedAmount, DECIMAL_PLACES);
  
  const activeDeposits = await storage.getActiveDeposits();
  
  const usedAmounts = new Set(
    activeDeposits
      .map(d => d.payableAmount ? parseFloat(d.payableAmount) : null)
      .filter((amt): amt is number => amt !== null)
  );
  
  if (!usedAmounts.has(roundedRequested)) {
    return roundedRequested;
  }
  
  let delta = 0.0001;
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts && delta <= MAX_DELTA) {
    const candidateAmount = roundToDecimals(roundedRequested - delta, DECIMAL_PLACES);
    
    if (candidateAmount < roundedRequested - MAX_DELTA) {
      break;
    }
    
    if (!usedAmounts.has(candidateAmount)) {
      return candidateAmount;
    }
    
    delta += 0.0001;
    attempts++;
  }
  
  throw new Error(
    `Не удалось сгенерировать уникальную сумму для ${roundedRequested} USDT. ` +
    `Слишком много активных депозитов с похожими суммами. Попробуйте позже.`
  );
}
