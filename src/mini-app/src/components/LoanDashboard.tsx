"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import CrossChainBNPLABI from "@/abi/CrossChainBNPL.json";

// Contract configuration
const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_CROSSCHAIN_BNPL_ADDRESS as `0x${string}`;
const USDC_DECIMALS = 6;

interface Loan {
  id: string;
  amount: string;
  merchant: string;
  isActive: boolean;
  createdTimestamp: bigint;
  settlementDomain: number;
}

interface CreditInfo {
  creditLimit: string;
  totalRepaid: string;
}

export function LoanDashboard() {
  const { address } = useAccount();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState("0");

  // Get user's credit info
  const { data: creditData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CrossChainBNPLABI.abi,
    functionName: "getUserCredit",
    args: [address],
    query: { enabled: !!address },
  });

  // Get user's loan IDs
  const { data: loanIds } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CrossChainBNPLABI.abi,
    functionName: "getUserLoans",
    args: [address],
    query: { enabled: !!address },
  });

  const creditInfo: CreditInfo = creditData
    ? {
        creditLimit: formatUnits(creditData[0], USDC_DECIMALS),
        totalRepaid: formatUnits(creditData[1], USDC_DECIMALS),
      }
    : { creditLimit: "0", totalRepaid: "0" };

  useEffect(() => {
    // Calculate total outstanding from active loans
    if (loans.length > 0) {
      const outstanding = loans
        .filter((loan) => loan.isActive)
        .reduce((sum, loan) => sum + parseFloat(loan.amount), 0);
      setTotalOutstanding(outstanding.toFixed(2));
    }
  }, [loans]);

  const availableCredit = Math.max(
    0,
    parseFloat(creditInfo.creditLimit) - parseFloat(totalOutstanding)
  ).toFixed(2);

  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-6 space-y-4">
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
          <p className="text-xs text-blue-600 font-medium">Available Credit</p>
          <p className="text-lg font-bold text-blue-900">${availableCredit}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-xs text-green-600 font-medium">Total Repaid</p>
          <p className="text-lg font-bold text-green-900">
            ${creditInfo.totalRepaid}
          </p>
        </div>
      </div>

      {/* Outstanding Loans */}
      {parseFloat(totalOutstanding) > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-yellow-800">
              Outstanding
            </span>
            <span className="text-lg font-bold text-yellow-900">
              ${totalOutstanding}
            </span>
          </div>
          <p className="text-xs text-yellow-600 mt-1">
            {loans.filter((loan) => loan.isActive).length} active loan(s)
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="border-t pt-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500">Credit Limit</p>
            <p className="text-sm font-semibold">${creditInfo.creditLimit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Active Loans</p>
            <p className="text-sm font-semibold">
              {loans.filter((loan) => loan.isActive).length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Lifetime Repaid</p>
            <p className="text-sm font-semibold">${creditInfo.totalRepaid}</p>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {!address && (
        <div className="text-center text-sm text-gray-500 italic">
          Connect wallet to view your loans
        </div>
      )}
    </div>
  );
}
