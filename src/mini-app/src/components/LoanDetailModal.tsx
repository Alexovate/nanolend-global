"use client";

import { useCallback, useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { worldchain } from "viem/chains";
import { useAccount } from "wagmi";
import { MiniKit } from "@worldcoin/minikit-js";
import { useSession } from "next-auth/react";
import CrossChainBNPLABI from "@/abi/CrossChainBNPL.json";
import {
  CONTRACT_ADDRESS,
  LoanSummary,
  WORLD_CHAIN_USDC_ADDRESS,
} from "@/types/loan";
import { usdToUSDC } from "@/utils/currency";

// Helper function for high-precision display (6 decimals)
const usdcToUSDDisplayPrecise = (usdcAmount: bigint): string => {
  const usdAmount = Number(usdcAmount) / 1_000_000;
  return `$${usdAmount.toFixed(6)}`;
};

const publicClient = createPublicClient({
  chain: worldchain,
  transport: http(),
});

interface LoanDetailModalProps {
  loan: LoanSummary;
  isOpen: boolean;
  onClose: () => void;
  onRepaymentSuccess: (amount: string, loanId: string) => void;
}

export const LoanDetailModal = ({
  loan,
  isOpen,
  onClose,
  onRepaymentSuccess,
}: LoanDetailModalProps) => {
  const { data: session } = useSession();
  const { address } = useAccount();
  const [currentBalance, setCurrentBalance] = useState<{
    principal: bigint;
    interest: bigint;
    total: bigint;
  } | null>(null);
  const [walletBalance, setWalletBalance] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRepaying, setIsRepaying] = useState(false);
  const [repaymentAmount, setRepaymentAmount] = useState<string>("");
  const [balanceExplanation, setBalanceExplanation] = useState<string>("");
  const [hasSetInitialAmount, setHasSetInitialAmount] =
    useState<boolean>(false);

  // Use session wallet address if available, fallback to wagmi
  const walletAddress = (session?.user?.walletAddress ||
    address) as `0x${string}`;

  // Retry helper function with exponential backoff
  const retryWithBackoff = async function <T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(
          `⏳ Network request failed, retrying in ${delay}ms... (attempt ${attempt}/${maxAttempts})`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("Max attempts reached");
  };

  // Load current balance and wallet balance with retry
  const loadCurrentBalance = useCallback(async () => {
    if (!loan) return;

    // Ensure session and wallet address are available
    if (!walletAddress) {
      console.log("⏳ Session not ready yet, wallet address not available");
      setError("Please wait for wallet connection...");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(
        "🔍 Loading balance for loan",
        loan.loanId.toString(),
        "for address:",
        walletAddress
      );

      // Load loan balance and wallet USDC balance in parallel with retry
      const [loanBalanceData, walletUSDCBalance] = await Promise.all([
        retryWithBackoff(async () => {
          return await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: CrossChainBNPLABI,
            functionName: "getCurrentBalance",
            args: [loan.loanId],
          });
        }),
        retryWithBackoff(async () => {
          return await publicClient.readContract({
            address: WORLD_CHAIN_USDC_ADDRESS as `0x${string}`,
            abi: [
              {
                name: "balanceOf",
                type: "function",
                stateMutability: "view",
                inputs: [{ name: "account", type: "address" }],
                outputs: [{ name: "", type: "uint256" }],
              },
            ],
            functionName: "balanceOf",
            args: [walletAddress],
          });
        }),
      ]);

      console.log("✅ Balance data loaded:", {
        loanBalance: loanBalanceData,
        walletBalance: walletUSDCBalance,
      });

      // Parse loan balance data
      const [principal, interest, total] = loanBalanceData as [
        bigint,
        bigint,
        bigint
      ];

      setCurrentBalance({
        principal,
        interest,
        total,
      });

      setWalletBalance(walletUSDCBalance as bigint);

      // Smart default amount setting
      if (!hasSetInitialAmount && walletUSDCBalance && total) {
        const totalUSD = Number(total) / 1_000_000;
        const walletUSD = Number(walletUSDCBalance) / 1_000_000;

        if (walletUSD >= totalUSD) {
          // User has enough for full repayment
          setRepaymentAmount(totalUSD.toFixed(6));
          setBalanceExplanation(
            `💰 You have enough USDC to pay the full amount (Wallet: $${walletUSD.toFixed(
              6
            )})`
          );
        } else if (walletUSD > 0) {
          // User has some USDC but not enough for full repayment
          setRepaymentAmount(walletUSD.toFixed(6));
          setBalanceExplanation(
            `⚠️ Using your available USDC balance. You need $${(
              totalUSD - walletUSD
            ).toFixed(6)} more for full repayment.`
          );
        } else {
          // User has no USDC
          setRepaymentAmount("");
          setBalanceExplanation(
            "❌ No USDC in wallet. Please get USDC to make repayment."
          );
        }

        setHasSetInitialAmount(true);
      }
    } catch (error) {
      console.error("❌ Error loading balance:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load balance"
      );
    } finally {
      setIsLoading(false);
    }
  }, [loan, walletAddress, hasSetInitialAmount]);

  // Repay loan function with permit2
  const handleRepayLoan = async () => {
    if (!walletAddress || !currentBalance || !repaymentAmount) return;

    try {
      setIsRepaying(true);
      setError(null);

      const repaymentUSDC = usdToUSDC(parseFloat(repaymentAmount));
      console.log("🔄 Starting repayment process:", {
        loanId: loan.loanId.toString(),
        amount: repaymentAmount,
        amountUSDC: repaymentUSDC.toString(),
        walletAddress,
      });

      // Prepare permit2 transaction for World App
      const deadline = Math.floor((Date.now() + 30 * 60 * 1000) / 1000); // 30 minutes
      const nonce = Date.now().toString();

      console.log("📝 Sending permit2 transaction to World App...");

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: CONTRACT_ADDRESS,
            abi: CrossChainBNPLABI,
            functionName: "repayLoan",
            args: [
              loan.loanId,
              // PermitTransferFrom struct
              {
                permitted: {
                  token: WORLD_CHAIN_USDC_ADDRESS,
                  amount: repaymentUSDC.toString(),
                },
                nonce: nonce,
                deadline: deadline.toString(),
              },
              // SignatureTransferDetails struct
              {
                to: CONTRACT_ADDRESS,
                requestedAmount: repaymentUSDC.toString(),
              },
              "PERMIT2_SIGNATURE_PLACEHOLDER_0",
            ],
          },
        ],
        permit2: [
          {
            permitted: {
              token: WORLD_CHAIN_USDC_ADDRESS,
              amount: repaymentUSDC.toString(),
            },
            nonce: nonce,
            deadline: deadline.toString(),
            spender: CONTRACT_ADDRESS,
          },
        ],
      });

      console.log("📱 World App response:", finalPayload);

      if (finalPayload.status === "success") {
        console.log("✅ Repayment successful!");
        onRepaymentSuccess(repaymentAmount, loan.loanId.toString());
        onClose();
      } else {
        throw new Error(
          `Transaction failed: ${finalPayload.error_code || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("❌ Repayment failed:", error);
      setError(error instanceof Error ? error.message : "Repayment failed");
    } finally {
      setIsRepaying(false);
    }
  };

  useEffect(() => {
    if (isOpen && loan) {
      setHasSetInitialAmount(false); // Reset for new modal open
      loadCurrentBalance();
    }
  }, [isOpen, loan, loadCurrentBalance]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Repay Loan #{loan.loanId.toString()}
              </h3>
              <p className="text-sm text-gray-600">
                {loan.merchantName} • {loan.merchantLocation}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading && (
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mt-2"></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Loading loan details...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
              <button
                onClick={loadCurrentBalance}
                className="mt-2 text-sm text-red-600 hover:text-red-800"
              >
                Retry
              </button>
            </div>
          )}

          {currentBalance && walletBalance !== null && (
            <>
              {/* Loan Balance Breakdown */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900">Current Balance</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Principal:</span>
                    <span className="font-medium">
                      {usdcToUSDDisplayPrecise(currentBalance.principal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interest:</span>
                    <span className="font-medium">
                      {usdcToUSDDisplayPrecise(currentBalance.interest)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium text-gray-900">
                      Total Owed:
                    </span>
                    <span className="font-bold text-yellow-900">
                      {usdcToUSDDisplayPrecise(currentBalance.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Wallet Balance */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-600 font-medium">
                    Your USDC Balance:
                  </span>
                  <span className="font-bold text-blue-900">
                    {usdcToUSDDisplayPrecise(walletBalance)}
                  </span>
                </div>
              </div>

              {/* Repayment Amount Input */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Repayment Amount
                </label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  max={Number(currentBalance.total) / 1_000_000}
                  value={repaymentAmount}
                  onChange={(e) => setRepaymentAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.000000"
                />

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      const quarterAmount =
                        (Number(currentBalance.total) / 1_000_000) * 0.25;
                      setRepaymentAmount(quarterAmount.toFixed(6));
                    }}
                    className="py-2 px-3 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => {
                      const halfAmount =
                        (Number(currentBalance.total) / 1_000_000) * 0.5;
                      setRepaymentAmount(halfAmount.toFixed(6));
                    }}
                    className="py-2 px-3 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => {
                      const fullAmount =
                        Number(currentBalance.total) / 1_000_000;
                      setRepaymentAmount(fullAmount.toFixed(6));
                    }}
                    className="py-2 px-3 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                  >
                    Full
                  </button>
                </div>

                {/* Balance Explanation */}
                {balanceExplanation && (
                  <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
                    {balanceExplanation}
                  </div>
                )}
              </div>

              {/* Repay Button */}
              <button
                onClick={handleRepayLoan}
                disabled={
                  !repaymentAmount ||
                  parseFloat(repaymentAmount) <= 0 ||
                  parseFloat(repaymentAmount) >
                    Number(currentBalance.total) / 1_000_000 ||
                  isRepaying
                }
                className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
                  !repaymentAmount ||
                  parseFloat(repaymentAmount) <= 0 ||
                  parseFloat(repaymentAmount) >
                    Number(currentBalance.total) / 1_000_000 ||
                  isRepaying
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 active:scale-95"
                }`}
              >
                {isRepaying
                  ? "Processing Repayment..."
                  : `Repay $${parseFloat(repaymentAmount || "0").toFixed(
                      6
                    )} USDC`}
              </button>

              {/* Info Footer */}
              <div className="text-center text-xs text-gray-500 space-y-1">
                <p>🔒 Secured by World ID • ⚡ Instant via Permit2</p>
                <p>💳 No approval needed • 🏦 Direct from your wallet</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
