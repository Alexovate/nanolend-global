/**
 * Enhanced loan type definitions for CrossChain BNPL
 * ETH Global NYC 2025 Hackathon
 */

// Contract address from environment (automatically updated by deployment script)
const CONTRACT_ADDRESS_ENV = process.env.NEXT_PUBLIC_CROSSCHAIN_BNPL_ADDRESS;

// Validate contract address is properly configured
if (!CONTRACT_ADDRESS_ENV) {
  throw new Error(
    "Contract address not configured. Please set NEXT_PUBLIC_CROSSCHAIN_BNPL_ADDRESS in .env.local"
  );
}

export const CONTRACT_ADDRESS = CONTRACT_ADDRESS_ENV as `0x${string}`;

console.log("✅ Contract address loaded from environment:", CONTRACT_ADDRESS);

// World Chain USDC token address (6 decimals)
export const WORLD_CHAIN_USDC_ADDRESS =
  "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1" as `0x${string}`;

// Chain configuration constants
export const WORLD_CHAIN_MAINNET_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_CHAIN_ID || "480"
);

// Enhanced credit score type matching the smart contract structure
export type CreditScore = {
  creditLimit: bigint;
  totalRepaid: bigint;
  lastCreditUpgrade: bigint;
};

// Enhanced loan structure for comprehensive tracking
export interface Loan {
  id: bigint;
  originalPrincipal: bigint;
  createdTimestamp: bigint;
  borrower: string;
  merchant: string;
  settlementDomain: number;
  settlementAddress: string;
  isActive: boolean;
  worldIdNullifier: string;
  borrowerUsername: string;
}

// Loan summary for dashboard display - optimized data structure
export interface LoanSummary {
  loanId: bigint;
  originalPrincipal: bigint;
  currentPrincipal: bigint;
  interestAccrued: bigint;
  totalOwed: bigint;
  createdTimestamp: bigint;
  merchant: string;
  merchantName: string;
  merchantLocation: string;
  borrowerUsername: string;
}

// Merchant summary for dashboard display
export interface MerchantSummary {
  merchantAddress: string;
  isActive: boolean;
  outstandingLoans: bigint;
  totalProcessed: bigint;
  name: string;
  location: string;
}

// User type enumeration matching smart contract
export enum UserType {
  CUSTOMER = 0,
  MERCHANT = 1,
  BOTH = 2,
}

// Complete dashboard data structure - everything in one call
export interface UserDashboard {
  // User credit information
  creditLimit: bigint;
  totalRepaid: bigint;
  availableCredit: bigint;

  // Active loans (all of them - no arbitrary limit)
  activeLoans: LoanSummary[];

  // User type and merchant data (if applicable)
  userType: UserType;
  merchantData: MerchantSummary;
}

// Enhanced merchant information
export interface MerchantInfo {
  address: string;
  name: string;
  location: string;
  gcashNumber: string;
  isActive: boolean;
  registeredAt: bigint;
  outstandingLoans: bigint;
  totalRepaid: bigint;
  totalBridged: bigint;
  bridgeCount: bigint;
}

// Bridge transaction tracking
export interface BridgeTransaction {
  merchant: string;
  ethereumRecipient: string;
  amount: bigint;
  cctpNonce: bigint;
  timestamp: bigint;
  status: BridgeStatus;
}

// Bridge transaction status
export enum BridgeStatus {
  INITIATED = 0,
  CONFIRMED = 1,
  FAILED = 2,
}
