"use client";

import { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { worldchain } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create custom World Chain configuration
const worldChainConfig = {
  ...worldchain,
  id: 480,
  name: "World Chain",
  nativeCurrency: {
    decimals: 18,
    name: "WLD",
    symbol: "WLD",
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_WORLD_CHAIN_RPC ||
          "https://worldchain-mainnet.g.alchemy.com/public",
      ],
    },
  },
};

// Create Wagmi config
const config = createConfig({
  chains: [worldChainConfig],
  transports: {
    [worldChainConfig.id]: http(),
  },
});

// Create React Query client
const queryClient = new QueryClient();

interface Web3ProviderProps {
  children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
