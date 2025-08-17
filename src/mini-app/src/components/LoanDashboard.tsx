"use client";

import { useSession } from "next-auth/react";
import {
  useCallback,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { createPublicClient, http } from "viem";
import { worldchain } from "viem/chains";
import { useAccount } from "wagmi";
import CrossChainBNPLABI from "@/abi/CrossChainBNPL.json";
import { CONTRACT_ADDRESS, LoanSummary, UserDashboard } from "@/types/loan";
import { usdcToUSDDisplay, getCreditLevel } from "@/utils/currency";

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

interface LoanDashboardProps {
  onLoanSelect?: (loan: LoanSummary) => void;
  onRepaymentSuccess?: (
    amount: string,
    loanId: string,
    levelUpData?: { newLevel: number; newCreditLimit: string }
  ) => void;
}

export interface LoanDashboardRef {
  refreshData: () => Promise<void>;
}

export const LoanDashboard = forwardRef<LoanDashboardRef, LoanDashboardProps>(
  ({ onLoanSelect }, ref) => {
    const { data: session } = useSession();
    const { address } = useAccount();
    const [dashboardData, setDashboardData] = useState<UserDashboard | null>(
      null
    );
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    // Use session wallet address if available, fallback to wagmi
    const walletAddress = session?.user?.walletAddress || address;

    const loadUserData = useCallback(async () => {
      if (!walletAddress) return;

      try {
        setLoading(true);
        setLoadError(false);

        // Validate contract address is configured
        if (!CONTRACT_ADDRESS) {
          throw new Error(
            "Contract address not configured. Please check environment variables."
          );
        }

        console.log("🚀 Loading OPTIMIZED dashboard data in single call...", {
          address: walletAddress,
          contractAddress: CONTRACT_ADDRESS,
          timestamp: new Date().toISOString(),
        });

        const data = await retryWithBackoff(async () => {
          return await publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: CrossChainBNPLABI,
            functionName: "getUserDashboardData",
            args: [walletAddress],
          });
        });

        console.log("✅ Dashboard data loaded successfully:", data);
        setDashboardData(data as UserDashboard);
      } catch (error) {
        console.error("❌ Failed to load dashboard data:", error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }, [walletAddress]);

    // Expose refresh function to parent components
    useImperativeHandle(ref, () => ({
      refreshData: loadUserData,
    }));

    useEffect(() => {
      loadUserData();
    }, [loadUserData]);

    // Loading state
    if (loading) {
      return (
        <div className="w-full bg-white rounded-xl shadow-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      );
    }

    // Error state
    if (loadError || !dashboardData) {
      return (
        <div className="w-full bg-white rounded-xl shadow-lg p-6">
          <div className="text-center text-red-600">
            <p className="font-medium">Failed to load dashboard</p>
            <button
              onClick={loadUserData}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    // Connection status
    if (!walletAddress) {
      return (
        <div className="w-full bg-white rounded-xl shadow-lg p-6">
          <div className="text-center text-gray-500">
            <p className="font-medium">Connect wallet to view your loans</p>
          </div>
        </div>
      );
    }

    const creditLevel = getCreditLevel(
      dashboardData.creditLimit,
      dashboardData.totalRepaid
    );

    return (
      <div className="w-full bg-white rounded-xl shadow-lg p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            📊 Loan Dashboard
          </h3>
          <p className="text-sm text-gray-600">Your BNPL credit status</p>
        </div>

        {/* Credit Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-xs text-blue-600 font-medium">
              Available Credit
            </p>
            <p className="text-lg font-bold text-blue-900">
              {usdcToUSDDisplay(dashboardData.availableCredit)}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-xs text-green-600 font-medium">Total Repaid</p>
            <p className="text-lg font-bold text-green-900">
              {usdcToUSDDisplay(dashboardData.totalRepaid)}
            </p>
          </div>
        </div>

        {/* Credit Level Progress */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Credit Level {creditLevel.currentLevel}
            </span>
            <span className="text-sm text-gray-600">
              {usdcToUSDDisplay(dashboardData.creditLimit)} limit
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${creditLevel.progressPercent}%` }}
            ></div>
          </div>

          {!creditLevel.isMaxLevel && (
            <p className="text-xs text-gray-600">
              Repay ${creditLevel.neededForNext.toFixed(2)} more to unlock $
              {creditLevel.nextLevelAmount} credit
            </p>
          )}

          {creditLevel.isMaxLevel && (
            <p className="text-xs text-green-600 font-medium">
              🎉 Maximum credit level achieved!
            </p>
          )}
        </div>

        {/* Active Loans */}
        {dashboardData.activeLoans.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Active Loans</h4>
            {dashboardData.activeLoans.map((loan) => (
              <div
                key={loan.loanId.toString()}
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 cursor-pointer hover:bg-yellow-100 transition-colors"
                onClick={() => onLoanSelect?.(loan)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">
                        {loan.merchantName}
                      </span>
                      <span className="text-lg font-bold text-yellow-900">
                        {usdcToUSDDisplay(loan.totalOwed, 6)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>📍 {loan.merchantLocation}</p>
                      <p>
                        Principal: {usdcToUSDDisplay(loan.currentPrincipal, 6)}{" "}
                        • Interest: {usdcToUSDDisplay(loan.interestAccrued, 6)}
                      </p>
                      <p className="text-xs">
                        Loan #{loan.loanId.toString()} •{" "}
                        {new Date(
                          Number(loan.createdTimestamp) * 1000
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-yellow-700">
                  💡 Click to repay loan
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-500">Credit Limit</p>
              <p className="text-sm font-semibold">
                {usdcToUSDDisplay(dashboardData.creditLimit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Active Loans</p>
              <p className="text-sm font-semibold">
                {dashboardData.activeLoans.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Lifetime Repaid</p>
              <p className="text-sm font-semibold">
                {usdcToUSDDisplay(dashboardData.totalRepaid)}
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {dashboardData.activeLoans.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <p className="font-medium">No active loans</p>
            <p className="text-sm">Request a loan to get started</p>
          </div>
        )}
      </div>
    );
  }
);

LoanDashboard.displayName = "LoanDashboard";
