"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { createPublicClient, http } from "viem";
import { worldchain } from "viem/chains";
import { MiniKit } from "@worldcoin/minikit-js";
import { Button } from "@worldcoin/mini-apps-ui-kit-react";
import CrossChainBNPLABI from "@/abi/CrossChainBNPL.json";
import { CONTRACT_ADDRESS, WORLD_CHAIN_USDC_ADDRESS } from "@/types/loan";
import { usdToUSDC, usdcToUSDDisplay } from "@/utils/currency";

const publicClient = createPublicClient({
  chain: worldchain,
  transport: http(),
});

const BRIDGE_PRESET_AMOUNTS = ["5", "10", "20", "50"];

export function BridgeInterface() {
  const { data: session } = useSession();
  const [bridgeAmount, setBridgeAmount] = useState("10");
  const [ethereumAddress, setEthereumAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<bigint>(BigInt(0));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const walletAddress = session?.user?.walletAddress as `0x${string}`;

  // Load USDC balance
  const loadUSDCBalance = useCallback(async () => {
    if (!walletAddress) return;

    try {
      const balance = await publicClient.readContract({
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
      setUsdcBalance(balance as bigint);
    } catch (err) {
      console.error("Error loading USDC balance:", err);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      loadUSDCBalance();
    }
  }, [walletAddress, loadUSDCBalance]);

  const handleBridgeToEthereum = async () => {
    if (!walletAddress || !bridgeAmount || !ethereumAddress) return;

    try {
      setIsLoading(true);
      setError(null);

      const bridgeAmountUSDC = usdToUSDC(parseFloat(bridgeAmount));

      console.log("🌉 Starting bridge transaction:", {
        amount: bridgeAmount,
        amountUSDC: bridgeAmountUSDC.toString(),
        ethereumAddress,
      });

      const transactionPayload = {
        transaction: [
          {
            address: CONTRACT_ADDRESS,
            abi: CrossChainBNPLABI,
            functionName: "bridgeToEthereum",
            args: [bridgeAmountUSDC, ethereumAddress],
          },
        ],
      };

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction(
        transactionPayload
      );

      if (finalPayload.status === "error") {
        throw new Error(`Bridge failed: ${finalPayload.error_code}`);
      }

      console.log("✅ Bridge transaction successful!");
      setSuccess(true);
      setBridgeAmount("10");
      setEthereumAddress("");

      // Refresh balance
      setTimeout(() => {
        loadUSDCBalance();
      }, 2000);
    } catch (err) {
      console.error("❌ Bridge error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const availableBalance = usdcToUSDDisplay(usdcBalance).replace("$", "");

  return (
    <div className="w-full space-y-4">
      {/* Simplified Bridge Interface */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        {/* Balance Display */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">Available USDC</p>
          <p className="text-3xl font-bold text-gray-900">{availableBalance}</p>
        </div>

        {/* Amount Selection */}
        <div className="space-y-3">
          <p className="text-center text-sm font-medium text-gray-700">
            Choose amount to bridge
          </p>

          <div className="grid grid-cols-4 gap-3">
            {BRIDGE_PRESET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => setBridgeAmount(amount)}
                disabled={parseFloat(amount) > parseFloat(availableBalance)}
                className={`py-4 rounded-xl font-semibold transition-all ${
                  bridgeAmount === amount
                    ? "bg-green-500 text-white shadow-lg"
                    : parseFloat(amount) > parseFloat(availableBalance)
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95"
                }`}
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>

        {/* Ethereum Address */}
        <div className="space-y-3">
          <input
            type="text"
            value={ethereumAddress}
            onChange={(e) => setEthereumAddress(e.target.value)}
            placeholder="Ethereum address (0x...)"
            className="w-full px-4 py-4 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Bridge Button */}
        <Button
          onClick={handleBridgeToEthereum}
          disabled={
            !walletAddress || !bridgeAmount || !ethereumAddress || isLoading
          }
          className="w-full py-4 text-lg"
        >
          {isLoading ? "Bridging..." : `↗️ Bridge $${bridgeAmount} to Ethereum`}
        </Button>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">❌ {error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-green-800 font-medium mb-2">
              ✅ Bridge Started!
            </p>
            <p className="text-green-700 text-sm">
              USDC will arrive in ~15 minutes. Use Binance P2P to convert to PHP
              for GCash.
            </p>
          </div>
        )}

        {/* Simple Footer */}
        <div className="text-center text-xs text-gray-500 pt-2 border-t">
          Free bridge • ~15 minutes • For GCash cash-out
        </div>
      </div>
    </div>
  );
}
