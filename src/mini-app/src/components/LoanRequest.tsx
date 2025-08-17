"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits } from "viem";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const [amount, setAmount] = useState("2");
  const [selectedMerchant, setSelectedMerchant] = useState(DEMO_MERCHANTS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    writeContract,
    data: hash,
    error: contractError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const handleRequestLoan = async () => {
    if (!address || !amount || !selectedMerchant || !session?.user?.username)
      return;

    try {
      setIsLoading(true);
      setError(null);

      console.log("Requesting loan with World ID verification:", {
        merchant: selectedMerchant,
        amount: amount,
        userAddress: address,
        username: session.user.username,
      });

      // Step 1: Get World ID verification (Proof of Humanhood)
      const verifyPayload = {
        action:
          process.env.NEXT_PUBLIC_WORLD_ID_ACTION_ID || "request_nano_loan",
        signal: address, // Use wallet address as signal
        verification_level: VerificationLevel.Orb, // Highest security level
      };

      console.log("Starting World ID verification...");
      const { finalPayload: verifyResponse } =
        await MiniKit.commandsAsync.verify(verifyPayload);

      if (verifyResponse.status === "error") {
        // Handle user cancellation gracefully
        const errorCode = String(verifyResponse.error_code).toLowerCase();
        if (errorCode.includes("cancel") || errorCode.includes("user")) {
          console.log(
            "User cancelled World ID verification:",
            verifyResponse.error_code
          );
          return; // Exit without showing error
        }
        throw new Error(
          `World ID verification failed: ${verifyResponse.error_code}`
        );
      }

      console.log("✅ World ID verification successful:", verifyResponse);

      // Step 2: Submit loan request to smart contract with enhanced parameters
      const amountWei = parseUnits(amount, USDC_DECIMALS);

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CrossChainBNPLABI,
        functionName: "requestLoan",
        args: [
          selectedMerchant.address,
          amountWei,
          session.user.username || "anonymous", // Username for merchant dashboard
          verifyResponse.nullifier_hash, // Use actual World ID nullifier
          0, // WORLD_CHAIN_DOMAIN (settlement on World Chain)
          selectedMerchant.address, // Settlement address
        ],
      });
    } catch (err) {
      console.error("Loan request error:", err);
      setError(err instanceof Error ? err.message : "Loan request failed");
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
        disabled={
          !address || !session?.user?.username || !amount || isProcessing
        }
        className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
          !address || !session?.user?.username || !amount || isProcessing
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 active:scale-95"
        }`}
      >
        {isProcessing
          ? "Processing World ID..."
          : !address
          ? "Connect Wallet"
          : !session?.user?.username
          ? "Sign In with World ID"
          : `Request $${amount} USDC Loan`}
      </button>

      {/* Status Messages */}
      {isConfirming && (
        <div className="text-center text-sm text-blue-600">
          ✅ World ID verified! Confirming transaction...
        </div>
      )}

      {isConfirmed && (
        <div className="text-center text-sm text-green-600 font-medium">
          ✅ Loan approved! USDC sent to merchant.
        </div>
      )}

      {error && (
        <div className="text-center text-sm text-red-600">
          ❌ Error: {error}
        </div>
      )}

      {contractError && (
        <div className="text-center text-sm text-red-600">
          ❌ Contract Error: {contractError.message}
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
