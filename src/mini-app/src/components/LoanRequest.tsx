"use client";

import {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "@worldcoin/mini-apps-ui-kit-react";
import { useSession } from "next-auth/react";
import { MiniKit, VerificationLevel, Tokens } from "@worldcoin/minikit-js";
import { createPublicClient, http } from "viem";
import { worldchain } from "viem/chains";
import CrossChainBNPLABI from "@/abi/CrossChainBNPL.json";
import { usdcToUSDDisplay, usdToUSDC } from "@/utils/currency";
import { CONTRACT_ADDRESS, MerchantSummary } from "@/types/loan";

// const USDC_DECIMALS = 6; // Keeping for reference but not used directly

// Helper function for retrying network requests with exponential backoff
const retryWithBackoff = async function <T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(
        `⏳ Network request failed, retrying in ${delay}ms... (attempt ${
          attempt + 1
        }/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
};

const publicClient = createPublicClient({
  chain: worldchain,
  transport: http(),
});

// Smart contract constants
const MIN_LOAN_AMOUNT_USD = 0.25; // $0.25 minimum
const MIN_LOAN_DISPLAY = MIN_LOAN_AMOUNT_USD.toFixed(2);

interface LoanRequestProps {
  onTransactionSuccess?: (amount: string, merchant: string) => void;
}

export interface LoanRequestRef {
  refreshCredit: () => Promise<void>;
}

export const LoanRequest = forwardRef<LoanRequestRef, LoanRequestProps>(
  function LoanRequest({ onTransactionSuccess }, ref) {
    const { data: session } = useSession();
    const [registeredMerchants, setRegisteredMerchants] = useState<
      MerchantSummary[]
    >([]);
    const [selectedMerchant, setSelectedMerchant] = useState("");
    const [loanAmount, setLoanAmount] = useState(""); // Now in USD
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [availableCredit, setAvailableCredit] = useState<bigint>(BigInt(0));
    const [creditLoading, setCreditLoading] = useState(true);
    const [merchantsLoading, setMerchantsLoading] = useState(true);
    const [merchantsLoadError, setMerchantsLoadError] = useState(false);
    const [creditLoadError, setCreditLoadError] = useState(false);

    // Load registered merchants from smart contract
    const loadRegisteredMerchants = useCallback(async () => {
      try {
        setMerchantsLoading(true);
        setMerchantsLoadError(false);

        console.log("🔍 Loading registered merchants from contract events...");

        // Get all MerchantRegistered events using getLogs (working approach from old project)
        const merchantRegisteredEvents = await retryWithBackoff(async () => {
          return await publicClient.getLogs({
            address: CONTRACT_ADDRESS,
            event: {
              type: "event",
              name: "MerchantRegistered",
              inputs: [
                { name: "merchant", type: "address", indexed: true },
                { name: "name", type: "string", indexed: false },
                { name: "location", type: "string", indexed: false },
              ],
            },
            fromBlock: "earliest",
            toBlock: "latest",
          });
        });

        console.log(
          `📋 Found ${merchantRegisteredEvents.length} merchant registration events`
        );

        // Load merchant data with Promise.allSettled to handle partial failures
        const merchantResults = await Promise.allSettled(
          merchantRegisteredEvents.map(async (event) => {
            return await retryWithBackoff(async () => {
              const merchantAddress = event.args?.merchant as string;
              if (!merchantAddress) return null;

              const merchantData = (await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: CrossChainBNPLABI,
                functionName: "merchants",
                args: [merchantAddress],
              })) as [boolean, bigint, bigint, string, string, bigint];

              const [isActive, , , name, location] = merchantData;

              if (isActive && name) {
                return {
                  merchantAddress,
                  isActive,
                  outstandingLoans: BigInt(0), // Not used in loan request
                  totalProcessed: BigInt(0), // Not used in loan request
                  name,
                  location,
                } as MerchantSummary;
              }
              return null;
            });
          })
        );

        // Extract successful merchants and log failures
        const activeMerchants: MerchantSummary[] = [];
        let failedCount = 0;

        merchantResults.forEach((result, index) => {
          if (result.status === "fulfilled" && result.value !== null) {
            activeMerchants.push(result.value);
          } else {
            failedCount++;
            if (result.status === "rejected") {
              console.error(
                `⚠️ Failed to load merchant ${index}:`,
                result.reason
              );
            }
          }
        });

        if (failedCount > 0) {
          console.warn(
            `⚠️ ${failedCount} merchants failed to load due to network issues`
          );
        }

        console.log(
          "✅ Found",
          activeMerchants.length,
          "active registered merchants (",
          failedCount,
          "failed):",
          activeMerchants
        );
        setRegisteredMerchants(activeMerchants);

        // Auto-select first merchant if none selected
        if (activeMerchants.length > 0 && !selectedMerchant) {
          setSelectedMerchant(activeMerchants[0].merchantAddress);
        }
      } catch (error) {
        console.error("❌ Failed to load merchants:", error);
        setMerchantsLoadError(true);
        setError("Failed to load merchants. Please refresh the page.");
      } finally {
        setMerchantsLoading(false);
      }
    }, [selectedMerchant]);

    // Load available credit from smart contract
    const loadAvailableCredit = useCallback(async () => {
      if (!session?.user?.walletAddress) {
        console.log("⏳ Session not ready yet, wallet address not available");
        return;
      }

      try {
        setCreditLoading(true);
        setCreditLoadError(false);

        console.log(
          "💰 Loading available credit for:",
          session.user.walletAddress
        );

        const dashboardData = await retryWithBackoff(async () => {
          return await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CrossChainBNPLABI,
            functionName: "getUserDashboardData",
            args: [session.user.walletAddress],
          });
        });

        const dashboard = dashboardData as {
          availableCredit: bigint;
        };
        const credit = dashboard.availableCredit as bigint;

        console.log(`✅ Available credit loaded: ${usdcToUSDDisplay(credit)}`);
        setAvailableCredit(credit);
      } catch (error) {
        console.error("❌ Failed to load available credit:", error);
        setCreditLoadError(true);
      } finally {
        setCreditLoading(false);
      }
    }, [session?.user?.walletAddress]);

    // Load data on component mount and session changes
    useEffect(() => {
      loadRegisteredMerchants();
    }, [loadRegisteredMerchants]);

    useEffect(() => {
      if (session?.user?.walletAddress) {
        loadAvailableCredit();
      }
    }, [session?.user?.walletAddress, loadAvailableCredit]);

    // Validate loan amount
    const validateLoanAmountInput = useCallback(
      (amount: string): string | null => {
        const numAmount = parseFloat(amount);

        if (isNaN(numAmount) || numAmount <= 0) {
          return "Please enter a valid amount";
        }

        if (numAmount < MIN_LOAN_AMOUNT_USD) {
          return `Minimum loan amount is $${MIN_LOAN_DISPLAY}`;
        }

        const loanAmountUSDC = usdToUSDC(numAmount);
        if (loanAmountUSDC > availableCredit) {
          return `Insufficient credit. Available: ${usdcToUSDDisplay(
            availableCredit
          )}`;
        }

        return null;
      },
      [availableCredit]
    );

    // Handle loan request using MiniKit.commands.pay
    const handleRequestLoan = async () => {
      if (!session?.user?.walletAddress || !loanAmount || !selectedMerchant)
        return;

      const validationError = validateLoanAmountInput(loanAmount);
      if (validationError) {
        setError(validationError);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const loanAmountUSDC = usdToUSDC(parseFloat(loanAmount));
        const selectedMerchantData = registeredMerchants.find(
          (m) => m.merchantAddress === selectedMerchant
        );
        const merchantName = selectedMerchantData?.name || "Unknown Merchant";

        console.log("🔄 Starting loan request process:", {
          merchant: selectedMerchant,
          merchantName,
          amount: loanAmount,
          amountUSDC: loanAmountUSDC.toString(),
          userAddress: session.user.walletAddress,
        });

        // Step 1: Get World ID verification (Proof of Humanhood)
        const verifyPayload = {
          action:
            process.env.NEXT_PUBLIC_WORLD_ID_ACTION_ID || "request_nano_loan",
          signal: session.user.walletAddress,
          verification_level: VerificationLevel.Orb,
        };

        console.log("🌍 Starting World ID verification...");
        const { finalPayload: verifyResponse } =
          await MiniKit.commandsAsync.verify(verifyPayload);

        if (verifyResponse.status === "error") {
          throw new Error(
            `World ID verification failed: ${verifyResponse.error_code}`
          );
        }

        console.log("✅ World ID verification successful!");

        // Step 2: Submit loan request using MiniKit.commands.pay
        const paymentPayload = {
          reference: `loan-${Date.now()}`,
          to: selectedMerchant as `0x${string}`,
          tokens: [
            {
              symbol: Tokens.USDC,
              token_amount: loanAmountUSDC.toString(),
            },
          ],
          description: `BNPL loan from ${merchantName}`,
        };

        console.log("💳 Initiating MiniKit payment...");
        const { finalPayload: payResponse } = await MiniKit.commandsAsync.pay(
          paymentPayload
        );

        if (payResponse.status === "error") {
          throw new Error(`Payment failed: ${payResponse.error_code}`);
        }

        console.log("✅ Payment successful!");

        // Wait for World overlay to close before callback
        setTimeout(() => {
          onTransactionSuccess?.(loanAmount, merchantName);
        }, 500);

        // Clear form
        setLoanAmount("");

        // Update available credit locally for instant UI feedback
        setAvailableCredit((prevCredit) => {
          const newAvailableCredit =
            prevCredit >= loanAmountUSDC
              ? prevCredit - loanAmountUSDC
              : BigInt(0);
          console.log(
            `💰 Reduced available credit by ${usdcToUSDDisplay(loanAmountUSDC)}`
          );
          return newAvailableCredit;
        });

        // Refresh available credit from blockchain after delay
        setTimeout(async () => {
          try {
            await loadAvailableCredit();
          } catch (error) {
            console.log("⚠️ Delayed credit refresh failed:", error);
          }
        }, 3000);
      } catch (error) {
        console.error("❌ Loan request error:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to process loan request. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    const selectedMerchantData = registeredMerchants.find(
      (m) => m.merchantAddress === selectedMerchant
    );

    // Expose refresh function to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        refreshCredit: loadAvailableCredit,
      }),
      [loadAvailableCredit]
    );

    return (
      <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-sm border p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Buy Now, Pay Later
            </h2>
            <p className="text-sm text-gray-600">
              Cross-Chain BNPL with World ID verification
            </p>
          </div>

          {/* Error Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">❌ {error}</p>
            </div>
          )}

          {/* Available Credit Display */}
          {creditLoading || merchantsLoading ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="text-gray-400">🔄</div>
                <p className="text-sm text-gray-600">Loading credit limit...</p>
              </div>
            </div>
          ) : creditLoadError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">
                ❌ Failed to load credit limit
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-900">
                  Available Credit:
                </span>
                <span className="text-lg font-bold text-blue-900">
                  {usdcToUSDDisplay(availableCredit)}
                </span>
              </div>
            </div>
          )}

          {/* Merchant Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Merchant
            </label>
            {merchantsLoading ? (
              <div className="border border-gray-300 rounded-lg p-3 text-center text-gray-500">
                🔄 Loading merchants...
              </div>
            ) : merchantsLoadError ? (
              <div className="border border-red-300 rounded-lg p-3 text-center text-red-600">
                ❌ Failed to load merchants
              </div>
            ) : registeredMerchants.length === 0 ? (
              <div className="border border-gray-300 rounded-lg p-3 text-center text-gray-500">
                No merchants available
              </div>
            ) : (
              <select
                value={selectedMerchant}
                onChange={(e) => setSelectedMerchant(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {registeredMerchants.map((merchant) => (
                  <option
                    key={merchant.merchantAddress}
                    value={merchant.merchantAddress}
                  >
                    {merchant.name}{" "}
                    {merchant.location && `- ${merchant.location}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Loan Amount */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Loan Amount (USD)
            </label>
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              placeholder={`Min: $${MIN_LOAN_DISPLAY}`}
              step="0.01"
              min={MIN_LOAN_AMOUNT_USD}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {["0.50", "1.00", "2.00", "5.00"].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setLoanAmount(amount)}
                  className="px-3 py-1 text-xs border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Merchant Info */}
          {selectedMerchantData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="font-medium text-green-900 mb-1">
                {selectedMerchantData.name}
              </h4>
              {selectedMerchantData.location && (
                <p className="text-sm text-green-700">
                  📍 {selectedMerchantData.location}
                </p>
              )}
              <p className="text-xs text-green-600 mt-1">
                Outstanding:{" "}
                {usdcToUSDDisplay(selectedMerchantData.outstandingLoans)}
              </p>
            </div>
          )}

          {/* Request Loan Button */}
          <Button
            onClick={handleRequestLoan}
            disabled={
              !session?.user?.walletAddress ||
              !loanAmount ||
              !selectedMerchant ||
              isLoading ||
              creditLoading ||
              merchantsLoading ||
              !!validateLoanAmountInput(loanAmount)
            }
            className="w-full py-4"
          >
            {isLoading
              ? "Processing..."
              : !session?.user?.walletAddress
              ? "Connect Wallet"
              : !loanAmount
              ? "Enter Amount"
              : !selectedMerchant
              ? "Select Merchant"
              : `Request $${loanAmount} Loan`}
          </Button>

          {/* Helper Text */}
          <p className="text-xs text-gray-500 text-center">
            Loan approval requires World ID verification for sybil resistance
          </p>
        </div>
      </div>
    );
  }
);

LoanRequest.displayName = "LoanRequest";
