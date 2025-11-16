import { TronWeb } from 'tronweb';
import { storage } from '../storage';
import { log } from '../vite';

const MASTER_WALLET_ADDRESS = 'THVyqrSDMBvpibitvTt4xJFWxVgY61acLu';
const USDT_CONTRACT_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

const SCAN_INTERVAL_MS = 15 * 1000; // 15 seconds
const SCAN_WINDOW_MS = 2 * 60 * 1000; // 2 minutes lookback window
const MAX_EVENTS_PER_REQUEST = 200;

let scanInterval: NodeJS.Timeout | null = null;
let isScanning = false;
let tronWeb: TronWeb;

interface FailedDeposit {
  depositId: string;
  txHash: string;
  amount: number;
  error: string;
  timestamp: Date;
}

const failedDeposits: FailedDeposit[] = [];

function initializeTronWeb(): void {
  tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
  });
}

function convertFromSun(amountInSun: string | number): number {
  const amountBigInt = BigInt(amountInSun);
  const usdtDecimals = 6; // USDT TRC20 has 6 decimals
  const divisor = BigInt(10 ** usdtDecimals);
  const wholePart = amountBigInt / divisor;
  const fractionalPart = amountBigInt % divisor;
  
  const amountStr = `${wholePart}.${fractionalPart.toString().padStart(usdtDecimals, '0')}`;
  const amount = parseFloat(amountStr);
  
  return parseFloat(amount.toFixed(2));
}

async function processTransferEvent(event: any): Promise<{ success: boolean; error?: string }> {
  try {
    const { transaction_id: txHash, result, block_timestamp } = event;
    
    if (!result || !result.to || !result.from || result.value === undefined) {
      return { success: true };
    }

    const toAddress = tronWeb.address.fromHex(result.to);
    const fromAddress = tronWeb.address.fromHex(result.from);
    const amount = convertFromSun(result.value);

    if (toAddress !== MASTER_WALLET_ADDRESS) {
      return { success: true };
    }

    const existingDeposit = await storage.getDepositByTxHash(txHash);
    if (existingDeposit) {
      return { success: true };
    }

    const matchingDeposit = await storage.findPendingDepositByPayableAmount(amount);
    
    if (!matchingDeposit) {
      log(`⚠️ No matching deposit for transfer: ${amount} USDT from ${fromAddress} (tx: ${txHash})`);
      return { success: true };
    }

    const success = await storage.confirmDepositWithTransaction(
      matchingDeposit.id,
      txHash,
      amount
    );

    if (success) {
      log(`✓ Confirmed deposit ${matchingDeposit.id}: ${amount} USDT for user ${matchingDeposit.userId} (tx: ${txHash})`);
      return { success: true };
    } else {
      const error = `Failed to confirm deposit ${matchingDeposit.id} with tx ${txHash}`;
      log(`❌ ${error}`);
      
      failedDeposits.push({
        depositId: matchingDeposit.id,
        txHash,
        amount,
        error: 'Database transaction failed',
        timestamp: new Date(),
      });
      
      return { success: false, error };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`❌ Error processing transfer event: ${errorMsg}`);
    console.error('Full error details:', error);
    return { success: false, error: errorMsg };
  }
}

async function fetchEventsWithBlockRange(
  minTimestamp: number,
  maxTimestamp: number
): Promise<any[]> {
  const allEvents: any[] = [];
  let fingerprint: string | null = null;
  let iterationCount = 0;
  const maxIterations = 50; // Safety limit

  try {
    do {
      const options: any = {
        only_confirmed: true,
        event_name: 'Transfer',
        min_block_timestamp: minTimestamp,
        max_block_timestamp: maxTimestamp,
        order_by: 'block_timestamp,asc',
        limit: MAX_EVENTS_PER_REQUEST,
      };

      if (fingerprint) {
        options.fingerprint = fingerprint;
      }

      const response = await tronWeb.event.getEventsByContractAddress(
        USDT_CONTRACT_ADDRESS,
        options
      );

      if (!response.success || !response.data || response.data.length === 0) {
        break;
      }

      const relevantEvents = response.data.filter((event: any) => {
        if (!event.result || !event.result.to) {
          return false;
        }
        
        try {
          const toAddress = tronWeb.address.fromHex(event.result.to);
          return toAddress === MASTER_WALLET_ADDRESS;
        } catch {
          return false;
        }
      });

      allEvents.push(...relevantEvents);

      const lastEvent = response.data[response.data.length - 1] as any;
      fingerprint = lastEvent._fingerprint || null;
      
      if (!fingerprint) {
        break;
      }
      
      iterationCount++;
      if (iterationCount >= maxIterations) {
        log(`⚠️ Reached max iterations (${maxIterations}) while fetching events`);
        break;
      }

    } while (fingerprint);

    return allEvents;
  } catch (error) {
    log(`Error fetching events with block range: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}

async function scanBlockchain(): Promise<void> {
  if (isScanning) {
    log('Previous blockchain scan still running, skipping this interval');
    return;
  }

  isScanning = true;

  try {
    const currentBlock = await tronWeb.trx.getCurrentBlock();
    const currentBlockNumber = currentBlock.block_header?.raw_data?.number || 0;
    const currentBlockTimestamp = currentBlock.block_header?.raw_data?.timestamp || Date.now();

    let scanState = await storage.getTronScanState();
    
    if (!scanState) {
      const initialTimestamp = currentBlockTimestamp - SCAN_WINDOW_MS;
      scanState = await storage.createTronScanState({
        lastProcessedBlockNumber: (currentBlockNumber - 40).toString(),
      });
      
      await storage.updateTronScanStateWithTimestamp(
        currentBlockNumber - 40,
        new Date(initialTimestamp)
      );
      
      scanState = await storage.getTronScanState();
      if (!scanState) {
        throw new Error('Failed to create scan state');
      }
    }

    const lastProcessedTimestamp = scanState.lastProcessedTimestamp?.getTime() || 
                                   (currentBlockTimestamp - SCAN_WINDOW_MS);
    
    const minTimestamp = lastProcessedTimestamp;
    const maxTimestamp = currentBlockTimestamp;

    if (maxTimestamp <= minTimestamp) {
      return;
    }

    log(`Scanning blocks from timestamp ${minTimestamp} to ${maxTimestamp}...`);

    const events = await fetchEventsWithBlockRange(minTimestamp, maxTimestamp);

    log(`Found ${events.length} USDT transfer(s) to master wallet in scan window`);

    let allSuccessful = true;
    const processedResults: { success: boolean; error?: string }[] = [];

    for (const event of events) {
      const result = await processTransferEvent(event);
      processedResults.push(result);
      
      if (!result.success) {
        allSuccessful = false;
        log(`❌ Failed to process event tx: ${event.transaction_id} - ${result.error}`);
      }
    }

    if (!allSuccessful) {
      const failedCount = processedResults.filter(r => !r.success).length;
      log(`⚠️ WARNING: ${failedCount}/${events.length} events failed to process. Block number NOT advanced.`);
      log(`⚠️ Last processed block remains at ${scanState.lastProcessedBlockNumber}`);
      
      if (failedDeposits.length > 0) {
        log('❌ FAILED DEPOSITS REQUIRING MANUAL REVIEW:');
        failedDeposits.slice(-10).forEach(fd => {
          log(`   - Deposit ID: ${fd.depositId}, TX: ${fd.txHash}, Amount: ${fd.amount} USDT, Error: ${fd.error}`);
        });
      }
      return;
    }

    await storage.updateTronScanStateWithTimestamp(currentBlockNumber, new Date(currentBlockTimestamp));
    log(`✓ Successfully processed all ${events.length} events (including 0 events case), advanced to block ${currentBlockNumber}`);
  } catch (error) {
    if (error instanceof Error) {
      log(`❌ Error scanning blockchain: ${error.message}`);
      console.error('Full blockchain scanner error:', error);
    } else {
      log(`❌ Error scanning blockchain: ${error}`);
    }
    log(`⚠️ State NOT advanced due to error. Will retry on next scan.`);
  } finally {
    isScanning = false;
  }
}

export async function startBlockchainScanner(): Promise<void> {
  log('Starting TRON blockchain scanner...');
  
  initializeTronWeb();
  
  await scanBlockchain();
  
  if (scanInterval) {
    clearInterval(scanInterval);
  }
  
  scanInterval = setInterval(async () => {
    await scanBlockchain();
  }, SCAN_INTERVAL_MS);

  const intervalSeconds = SCAN_INTERVAL_MS / 1000;
  log(`Blockchain scanner started. Scans every ${intervalSeconds} seconds.`);
}

export function stopBlockchainScanner(): void {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
    log('Blockchain scanner stopped.');
  }
}

export async function forceScan(): Promise<void> {
  await scanBlockchain();
}

export function getFailedDeposits(): FailedDeposit[] {
  return [...failedDeposits];
}

export function clearFailedDeposits(): void {
  failedDeposits.length = 0;
  log('Cleared failed deposits list');
}
