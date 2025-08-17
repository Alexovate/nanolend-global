"use client";

import { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import CrossChainBNPLABI from "@/abi/CrossChainBNPL.json";

// Contract configuration
const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_CROSSCHAIN_BNPL_ADDRESS as `0x${string}`;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
const USDC_DECIMALS = 6;

const BRIDGE_PRESET_AMOUNTS = ["5", "10", "20", "50"];

export function BridgeInterface() {
  const { address } = useAccount();
  const [bridgeAmount, setBridgeAmount] = useState("10");
  const [ethereumAddress, setEthereumAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showGCashGuide, setShowGCashGuide] = useState(false);

  // Get user's USDC balance
  const { data: usdcBalance } = useBalance({
    address,
    token: USDC_ADDRESS,
  });

  const { writeContract, data: hash, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const handleBridgeToEthereum = async () => {
    if (!address || !bridgeAmount || !ethereumAddress) return;

    try {
      setIsLoading(true);

      const amountWei = parseUnits(bridgeAmount, USDC_DECIMALS);

      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CrossChainBNPLABI.abi,
        functionName: "bridgeToEthereum",
        args: [amountWei, ethereumAddress as `0x${string}`],
      });
    } catch (err) {
      console.error("Bridge error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isProcessing = isLoading || isConfirming;
  const availableBalance = usdcBalance
    ? formatUnits(usdcBalance.value, USDC_DECIMALS)
    : "0";

  return (
    <div className="w-full space-y-4">
      {/* Bridge Interface */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            🌉 CCTP Bridge
          </h3>
          <p className="text-sm text-gray-600">
            Bridge USDC to Ethereum in ~15 minutes
          </p>
        </div>

        {/* Balance Display */}
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600">Your World Chain USDC Balance</p>
          <p className="text-2xl font-bold text-gray-900">
            {availableBalance} USDC
          </p>
        </div>

        {/* Bridge Amount Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Amount to Bridge (USDC)
          </label>

          {/* Preset Amount Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {BRIDGE_PRESET_AMOUNTS.map((presetAmount) => (
              <button
                key={presetAmount}
                onClick={() => setBridgeAmount(presetAmount)}
                disabled={
                  parseFloat(presetAmount) > parseFloat(availableBalance)
                }
                className={`py-3 px-2 rounded-lg font-semibold text-sm transition-all ${
                  bridgeAmount === presetAmount
                    ? "bg-green-500 text-white"
                    : parseFloat(presetAmount) > parseFloat(availableBalance)
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                ${presetAmount}
              </button>
            ))}
          </div>

          {/* Selected Amount Display */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm text-green-600 font-medium">
              Bridging Amount
            </p>
            <p className="text-2xl font-bold text-green-900">
              ${bridgeAmount} USDC
            </p>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Available: {availableBalance} USDC • Fee: Free (Demo)
          </p>
        </div>

        {/* Ethereum Address Input */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Ethereum Wallet Address
          </label>

          <div className="space-y-2">
            <input
              type="text"
              value={ethereumAddress}
              onChange={(e) => setEthereumAddress(e.target.value)}
              placeholder="0x1234567890123456789012345678901234567890"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />

            {/* Quick Wallet Options */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  setEthereumAddress(
                    "0x742f35c9e4C4D1b3B1bA4e0c1F1c0b2b8c45E2F1"
                  )
                }
                className="py-2 px-3 bg-gray-100 rounded-lg text-xs text-gray-700 hover:bg-gray-200 transition-all"
              >
                📱 Use MetaMask
              </button>
              <button
                onClick={() =>
                  setEthereumAddress(
                    "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
                  )
                }
                className="py-2 px-3 bg-gray-100 rounded-lg text-xs text-gray-700 hover:bg-gray-200 transition-all"
              >
                🏦 Use Exchange
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            🇵🇭 Your Ethereum wallet for GCash cash-out via Binance P2P
          </p>
        </div>

        {/* Bridge Button */}
        <button
          onClick={handleBridgeToEthereum}
          disabled={
            !address || !bridgeAmount || !ethereumAddress || isProcessing
          }
          className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
            !address || !bridgeAmount || !ethereumAddress || isProcessing
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 active:scale-95"
          }`}
        >
          {isProcessing
            ? "Bridging..."
            : !address
            ? "Connect Wallet"
            : `Bridge ${bridgeAmount} USDC to Ethereum`}
        </button>

        {/* Status Messages */}
        {isConfirming && (
          <div className="text-center text-sm text-green-600">
            🔄 Bridge transaction confirming... (~15 minutes)
          </div>
        )}

        {isConfirmed && (
          <div className="text-center space-y-2">
            <div className="text-sm text-green-600 font-medium">
              ✅ CCTP Bridge initiated successfully!
            </div>
            <button
              onClick={() => setShowGCashGuide(true)}
              className="text-blue-600 text-sm underline hover:text-blue-800"
            >
              📱 View GCash cash-out guide
            </button>
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
            🌉 Circle CCTP • ⚡ ~15 min bridge time • 🆓 Zero fees (Demo)
          </p>
        </div>
      </div>

      {/* GCash Cash-Out Guide */}
      {showGCashGuide && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-start">
            <h4 className="text-lg font-semibold text-blue-900">
              📱 GCash Cash-Out Guide
            </h4>
            <button
              onClick={() => setShowGCashGuide(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div className="bg-white rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-2">
                Step 1: Wait for Bridge (15 minutes)
              </h5>
              <p className="text-gray-600">
                Your USDC is being transferred to Ethereum via Circle CCTP.
                You'll receive it at:{" "}
                <span className="font-mono text-xs break-all">
                  {ethereumAddress}
                </span>
              </p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-2">
                Step 2: Convert USDC to PHP
              </h5>
              <p className="text-gray-600 mb-2">
                Use Binance P2P (recommended):
              </p>
              <ul className="text-gray-600 text-xs space-y-1 ml-4 list-disc">
                <li>Open Binance app → P2P Trading</li>
                <li>Sell USDC → Buy PHP</li>
                <li>Select GCash as payment method</li>
                <li>Fee: ~2-4% total</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-4">
              <h5 className="font-semibold text-gray-900 mb-2">
                Step 3: Receive in GCash
              </h5>
              <p className="text-gray-600">
                P2P buyer will send PHP directly to your GCash account. Complete
                transaction within 15 minutes.
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-blue-600">
              💡 Total time: ~30 minutes • Total fees: ~2-4%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
