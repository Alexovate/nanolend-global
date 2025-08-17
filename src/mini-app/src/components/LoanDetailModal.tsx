"use client";

import { useCallback, useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { worldchain } from "viem/chains";
import { Button } from "@worldcoin/mini-apps-ui-kit-react";
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
  const [, setBalanceExplanation] = useState<string>("");
  const [hasSetInitialAmount, setHasSetInitialAmount] =
    useState<boolean>(false);

  // Use session wallet address if available, fallback to wagmi
  const walletAddress = session?.user?.walletAddress as `0x${string}`;

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
            address: CONTRACT_ADDRESS,
            abi: CrossChainBNPLABI,
            functionName: "getCurrentBalance",
            args: [loan.loanId],
          });
        }),
        retryWithBackoff(async () => {
          return await publicClient.readContract({
            address: WORLD_CHAIN_USDC_ADDRESS,
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
      const [principal, interest, totalOwed] = loanBalanceData as [
        bigint,
        bigint,
        bigint
      ];

      setCurrentBalance({
        principal,
        interest,
        total: totalOwed,
      });

      setWalletBalance(walletUSDCBalance as bigint);

      // Create balance explanation
      const principalUSD = Number(principal) / 1_000_000;
      const interestUSD = Number(interest) / 1_000_000;
      const totalUSD = Number(totalOwed) / 1_000_000;
      const walletUSD = Number(walletUSDCBalance as bigint) / 1_000_000;

      let explanation = `Loan Balance:\n• Principal: $${principalUSD.toFixed(
        6
      )}\n• Interest: $${interestUSD.toFixed(
        6
      )}\n• Total Due: $${totalUSD.toFixed(
        6
      )}\n\nYour USDC Balance: $${walletUSD.toFixed(6)}`;

      if (totalOwed > (walletUSDCBalance as bigint)) {
        explanation += "\n\n⚠️ Insufficient USDC balance for full repayment.";
      } else {
        explanation += "\n\n✅ Sufficient balance available.";
      }

      setBalanceExplanation(explanation);

      // Auto-set full repayment amount if not already set
      if (!hasSetInitialAmount && totalOwed > 0) {
        const fullAmount = Number(totalOwed) / 1_000_000;
        setRepaymentAmount(fullAmount.toFixed(6));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loan?.loanId, walletAddress]); // Intentionally exclude hasSetInitialAmount to prevent infinite recreation

  // Load balance when modal opens or loan changes
  useEffect(() => {
    if (isOpen && loan) {
      setHasSetInitialAmount(false); // Reset for new loan
      loadCurrentBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loan?.loanId]); // Only depend on isOpen and loan ID, not the function itself

  // Repay loan function using permit2 signature transfer
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

      console.log("💳 Initiating repayment via permit2 contract call...");

      // Create permit2 transfer structure for World App (following working example)
      const deadline = Math.floor((Date.now() + 30 * 60 * 1000) / 1000); // 30 minutes from now
      const nonce = Date.now().toString(); // Use timestamp as nonce

      console.log("🔍 Permit2 transaction details:");
      console.log("  - Token:", WORLD_CHAIN_USDC_ADDRESS);
      console.log("  - Amount:", repaymentUSDC.toString());
      console.log("  - Deadline:", deadline);
      console.log("  - Nonce:", nonce);
      console.log("  - Recipient (Our Contract):", CONTRACT_ADDRESS);

      // Execute permit2 transaction via World App (CORRECT PATTERN)
      // Flow: World App -> Our Contract -> Permit2 Contract
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: CONTRACT_ADDRESS,
            abi: CrossChainBNPLABI,
            functionName: "repayLoan",
            args: [
              loan.loanId, // loanId
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
              "PERMIT2_SIGNATURE_PLACEHOLDER_0", // Signature placeholder for World App
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

      if (finalPayload.status === "error") {
        // Handle user cancellation gracefully
        const errorCode = String(finalPayload.error_code).toLowerCase();
        if (errorCode.includes("cancel") || errorCode.includes("user")) {
          console.log("User cancelled repayment:", finalPayload.error_code);
          return; // Exit without showing error
        }
        throw new Error(`Repayment failed: ${finalPayload.error_code}`);
      }

      console.log("✅ Repayment completed successfully!");
      console.log(
        "  - Transaction Hash:",
        finalPayload.transaction_id || "N/A"
      );

      // Close modal and notify parent
      onClose();
      onRepaymentSuccess(
        parseFloat(repaymentAmount).toFixed(2),
        loan.loanId.toString()
      );

      // Refresh balance after successful repayment
      setTimeout(async () => {
        await loadCurrentBalance();
      }, 2000);
    } catch (err) {
      console.error("❌ Repayment error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Enhanced error messages for permit2 repayment
      let displayError = `Repayment error: ${errorMessage}`;

      if (errorMessage.includes("Transaction failed")) {
        displayError =
          "Transaction failed. Please check your USDC balance and try again.";
      } else if (errorMessage.includes("insufficient")) {
        displayError = "Insufficient USDC balance for repayment.";
      } else if (errorMessage.includes("InvalidToken")) {
        displayError = "Invalid token address. Please contact support.";
      } else if (errorMessage.includes("PermitExpired")) {
        displayError = "Transaction permit expired. Please try again.";
      } else if (errorMessage.includes("InvalidRecipient")) {
        displayError = "Invalid recipient address. Please contact support.";
      } else if (errorMessage.includes("ExcessiveRepayment")) {
        displayError =
          "Repayment amount exceeds total owed. Please adjust amount.";
      } else if (errorMessage.includes("InvalidRepaymentAmount")) {
        displayError = "Invalid repayment amount. Full repayment required.";
      } else if (
        errorMessage.includes("already repaid") ||
        errorMessage.includes("LoanNotActive")
      ) {
        displayError = "This loan has already been repaid.";
      } else if (errorMessage.includes("RepaymentsDisabled")) {
        displayError =
          "Repayments are temporarily disabled. Please try again later.";
      } else if (errorMessage.includes("UnauthorizedAccess")) {
        displayError = "You are not authorized to repay this loan.";
      } else if (errorMessage.includes("network")) {
        displayError =
          "Network error. Please check your connection and try again.";
      } else if (errorMessage.includes("timeout")) {
        displayError = "Transaction timed out. Please try again.";
      }

      setError(displayError);
    } finally {
      setIsRepaying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 h-screen w-screen overflow-hidden">
      <div className="h-full overflow-y-auto overscroll-none">
        <div className="p-6 pt-8 pb-8 max-w-md mx-auto w-full min-h-full flex flex-col justify-start">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Loan Repayment</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm">❌ {error}</p>
            </div>
          )}

          {/* Loan Details Card */}
          <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Loan Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Merchant:</span>
                <span className="font-medium">{loan.merchantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Location:</span>
                <span className="font-medium">{loan.merchantLocation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Loan ID:</span>
                <span className="font-medium">#{loan.loanId.toString()}</span>
              </div>
            </div>
          </div>

          {/* Balance Information */}
          <div className="bg-blue-50 rounded-xl p-5 mb-6 border border-blue-100">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mt-2"></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Loading loan details...
                </p>
              </div>
            ) : currentBalance ? (
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-900 mb-3">
                  Current Balance
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Principal:</span>
                    <span className="font-medium text-blue-900">
                      {usdcToUSDDisplayPrecise(currentBalance.principal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Interest:</span>
                    <span className="font-medium text-blue-900">
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
            ) : (
              <div className="text-center py-4 text-red-600">
                Failed to load balance. Please refresh this page.
              </div>
            )}
          </div>

          {/* Wallet Balance */}
          {walletBalance !== null && (
            <div className="bg-green-50 rounded-lg p-3 mb-6 border border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">
                  Your USDC Balance:
                </span>
                <span className="font-semibold text-green-900">
                  {usdcToUSDDisplayPrecise(walletBalance)}
                </span>
              </div>
            </div>
          )}

          {/* Repayment Amount Input */}
          {currentBalance && (
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Repayment Amount (USD)
                </label>
                <input
                  type="number"
                  value={repaymentAmount}
                  onChange={(e) => setRepaymentAmount(e.target.value)}
                  step="0.000001"
                  min="0"
                  max={Number(currentBalance.total) / 1_000_000}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="px-3 py-1 text-xs border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    25%
                  </button>
                  <button
                    onClick={() => {
                      const halfAmount =
                        (Number(currentBalance.total) / 1_000_000) * 0.5;
                      setRepaymentAmount(halfAmount.toFixed(6));
                    }}
                    className="px-3 py-1 text-xs border border-gray-300 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => {
                      const fullAmount =
                        Number(currentBalance.total) / 1_000_000;
                      setRepaymentAmount(fullAmount.toFixed(6));
                    }}
                    className="px-3 py-1 text-xs border border-gray-300 rounded bg-blue-50 hover:bg-blue-100 transition-colors text-blue-700 font-medium"
                  >
                    Full
                  </button>
                </div>
              </div>

              {/* Repay Button */}
              <Button
                onClick={handleRepayLoan}
                disabled={
                  !repaymentAmount ||
                  parseFloat(repaymentAmount) <= 0 ||
                  parseFloat(repaymentAmount) >
                    Number(currentBalance.total) / 1_000_000 ||
                  isRepaying
                }
                className="w-full py-4"
              >
                {isRepaying
                  ? "Processing Repayment..."
                  : `Repay $${parseFloat(repaymentAmount || "0").toFixed(
                      6
                    )} USDC`}
              </Button>

              {/* Helper Text */}
              <p className="text-xs text-gray-500 text-center">
                Repayment uses permit2 signature transfer for secure
                transactions
              </p>
            </div>
          )}

          {/* Close Button */}
          <Button onClick={onClose} variant="secondary" className="w-full mt-4">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
