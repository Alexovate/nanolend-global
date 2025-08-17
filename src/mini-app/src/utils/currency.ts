/**
 * USDC Currency Utilities for World Chain BNPL
 * All amounts are in USDC with 6 decimal places (e.g., 1000000 = $1.00)
 */

/**
 * Convert USDC amount (6 decimals) to USD for display
 * @param usdcAmount Amount in USDC base units (BigInt) - 6 decimals
 * @returns USD amount as number
 * @example usdcToUSD(BigInt(1000000)) => 1.0 ($1.00)
 */
export function usdcToUSD(usdcAmount: bigint): number {
  return Number(usdcAmount) / 1_000_000;
}

/**
 * Convert USD amount to USDC (6 decimals) for smart contract calls
 * @param usdAmount USD amount as number
 * @returns USDC amount in base units (BigInt) - 6 decimals
 * @example usdToUSDC(1.5) => BigInt(1500000)
 */
export function usdToUSDC(usdAmount: number): bigint {
  return BigInt(Math.round(usdAmount * 1_000_000));
}

/**
 * Convert USDC amount (6 decimals) to formatted USD string for display
 * @param usdcAmount Amount in USDC base units (BigInt) - 6 decimals
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted USD string (e.g., "$12.34")
 * @example usdcToUSDDisplay(BigInt(1250000)) => "$1.25"
 */
export function usdcToUSDDisplay(
  usdcAmount: bigint,
  decimals: number = 2
): string {
  const usdAmount = usdcToUSD(usdcAmount);
  return `$${usdAmount.toFixed(decimals)}`;
}

/**
 * Enhanced BNPL Constants - 4-level progressive system: $2 → $3 → $4 → $5
 */
export const MIN_LOAN_USD = 0.25; // $0.25 minimum loan
export const MAX_LOAN_USD = 5.0; // $5.00 maximum loan

// Credit levels: user progresses by repaying previous level amount
export const CREDIT_LEVELS = [
  { level: 1, amount: 2.0 }, // $2.00 starting credit
  { level: 2, amount: 3.0 }, // $3.00 after repaying $2
  { level: 3, amount: 4.0 }, // $4.00 after repaying $3
  { level: 4, amount: 5.0 }, // $5.00 after repaying $4 (max)
];

/**
 * Validate USD amount for loan constraints
 * @param usdAmount USD amount as number
 * @returns Object with validation result and error message
 */
export function validateLoanAmount(usdAmount: number): {
  isValid: boolean;
  error?: string;
} {
  if (isNaN(usdAmount) || usdAmount <= 0) {
    return { isValid: false, error: "Please enter a valid amount" };
  }

  if (usdAmount < MIN_LOAN_USD) {
    return {
      isValid: false,
      error: `Minimum loan amount is $${MIN_LOAN_USD.toFixed(2)}`,
    };
  }

  if (usdAmount > MAX_LOAN_USD) {
    return {
      isValid: false,
      error: `Maximum loan amount is $${MAX_LOAN_USD.toFixed(2)}`,
    };
  }

  return { isValid: true };
}

/**
 * 4-level progressive credit system for hackathon demo
 * @param creditLimit User's current credit limit in USDC
 * @param totalRepaid Total amount user has repaid in USDC
 * @returns Level info and progress
 */
export function getCreditLevel(
  creditLimit: bigint,
  totalRepaid: bigint
): {
  currentLevel: number;
  nextLevel: number | null;
  isMaxLevel: boolean;
  progressPercent: number;
  neededForNext: number;
  nextLevelAmount: number;
} {
  const creditUSD = usdcToUSD(creditLimit);
  const repaidUSD = usdcToUSD(totalRepaid);

  // Find current level based on credit limit
  let currentLevel = 1;
  for (const level of CREDIT_LEVELS) {
    if (Math.abs(creditUSD - level.amount) < 0.1) {
      // Allow small differences
      currentLevel = level.level;
      break;
    }
  }

  const isMaxLevel = currentLevel >= CREDIT_LEVELS.length;
  const nextLevel = isMaxLevel ? null : currentLevel + 1;
  const nextLevelAmount = isMaxLevel
    ? CREDIT_LEVELS[CREDIT_LEVELS.length - 1].amount
    : CREDIT_LEVELS[currentLevel].amount;

  // Calculate progress: how much of current credit limit has been repaid

  // ✅ FIXED: Calculate the baseline (lastCreditUpgrade) for current level
  // Based on rules: Level 1($2)→Level 2($3)→Level 3($4)→Level 4($5)
  // To reach each level, user must have repaid:
  // Level 1: $0 baseline (starting level)
  // Level 2: $2 total (lastCreditUpgrade = $0 + $2 = $2)
  // Level 3: $5 total (lastCreditUpgrade = $2 + $3 = $5)
  // Level 4: $9 total (lastCreditUpgrade = $5 + $4 = $9)

  let lastCreditUpgrade = 0;
  if (currentLevel === 2) lastCreditUpgrade = 2.0; // Needed $2 to reach Level 2
  else if (currentLevel === 3)
    lastCreditUpgrade = 5.0; // Needed $2+$3=$5 to reach Level 3
  else if (currentLevel === 4) lastCreditUpgrade = 9.0; // Needed $2+$3+$4=$9 to reach Level 4

  // ✅ CORRECT: Users must repay (lastCreditUpgrade + currentCreditLimit) total to advance
  const currentCreditLimitUSD = usdcToUSD(creditLimit);
  const totalNeededForNext = lastCreditUpgrade + currentCreditLimitUSD;
  const neededForNext = isMaxLevel
    ? 0
    : Math.max(0, totalNeededForNext - repaidUSD);
  const progressPercent = isMaxLevel
    ? 100
    : Math.min(
        Math.max(0, (repaidUSD - lastCreditUpgrade) / currentCreditLimitUSD) *
          100,
        100
      );

  return {
    currentLevel,
    nextLevel,
    isMaxLevel,
    progressPercent,
    neededForNext,
    nextLevelAmount,
  };
}
