"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits } from "viem";
import CrossChainBNPLABI from "@/abi/CrossChainBNPL.json";

// Contract configuration
const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_CROSSCHAIN_BNPL_ADDRESS as `0x${string}`;
const USDC_DECIMALS = 6;

// Predefined merchants for demo
const DEMO_MERCHANTS = [
  {
    name: "Sari-Sari Store Manila",
    address: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  },
  {
    name: "Tindahan ni Maria",
    address: "0x2345678901234567890123456789012345678901" as `0x${string}`,
  },
  {
    name: "Web3 Grocery Market",
    address: "0x3456789012345678901234567890123456789012" as `0x${string}`,
  },
];

const PRESET_AMOUNTS = ["1", "2", "3", "5"];

export function LoanRequest() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("2");
  const [selectedMerchant, setSelectedMerchant] = useState(DEMO_MERCHANTS[0]);
  const [isLoading, setIsLoading] = useState(false);

  const { writeContract, data: hash, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const handleRequestLoan = async () => {
    if (!address || !amount || !selectedMerchant) return;

    try {
      setIsLoading(true);

      const amountWei = parseUnits(amount, USDC_DECIMALS);

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CrossChainBNPLABI.abi,
        functionName: "requestLoan",
        args: [
          selectedMerchant.address,
          amountWei,
          `world-id-${Date.now()}`, // World ID nullifier (demo)
          0, // WORLD_CHAIN_DOMAIN (settlement on World Chain)
          selectedMerchant.address, // Settlement address
        ],
      });
    } catch (err) {
      console.error("Loan request error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isProcessing = isLoading || isConfirming;

  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-6 space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">💳 Request Loan</h3>
        <p className="text-sm text-gray-600">Get instant USDC with World ID</p>
      </div>

      {/* Amount Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Loan Amount (USDC)
        </label>

        {/* Preset Amount Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {PRESET_AMOUNTS.map((presetAmount) => (
            <button
              key={presetAmount}
              onClick={() => setAmount(presetAmount)}
              className={`py-3 px-2 rounded-lg font-semibold text-sm transition-all ${
                amount === presetAmount
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              ${presetAmount}
            </button>
          ))}
        </div>

        {/* Selected Amount Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-sm text-blue-600 font-medium">Selected Amount</p>
          <p className="text-2xl font-bold text-blue-900">${amount} USDC</p>
        </div>

        <p className="text-xs text-gray-500 text-center">
          💡 Start small, build credit • Max: $5 USDC
        </p>
      </div>

      {/* Merchant Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Merchant
        </label>
        <select
          value={selectedMerchant.name}
          onChange={(e) => {
            const merchant = DEMO_MERCHANTS.find(
              (m) => m.name === e.target.value
            );
            if (merchant) setSelectedMerchant(merchant);
          }}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {DEMO_MERCHANTS.map((merchant) => (
            <option key={merchant.address} value={merchant.name}>
              {merchant.name}
            </option>
          ))}
        </select>
      </div>

      {/* Request Button */}
      <button
        onClick={handleRequestLoan}
        disabled={!address || !amount || isProcessing}
        className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
          !address || !amount || isProcessing
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 active:scale-95"
        }`}
      >
        {isProcessing
          ? "Processing..."
          : !address
          ? "Connect Wallet"
          : `Request $${amount} USDC Loan`}
      </button>

      {/* Status Messages */}
      {isConfirming && (
        <div className="text-center text-sm text-blue-600">
          Confirming transaction...
        </div>
      )}

      {isConfirmed && (
        <div className="text-center text-sm text-green-600 font-medium">
          ✅ Loan approved! USDC sent to merchant.
        </div>
      )}

      {error && (
        <div className="text-center text-sm text-red-600">
          ❌ Error: {error.message}
        </div>
      )}

      {/* Info Footer */}
      <div className="border-t pt-4 text-center">
        <p className="text-xs text-gray-500">
          🔒 Secured by World ID • ⚡ Instant approval • 💰 Build credit score
        </p>
      </div>
    </div>
  );
}
