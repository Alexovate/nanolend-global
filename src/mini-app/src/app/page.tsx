"use client";

import { Page } from "@/components/PageLayout";
import { AuthButton } from "@/components/AuthButton";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect authenticated users
  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/home");
    }
  }, [session, status, router]);

  if (status === "loading" || (status === "authenticated" && session)) {
    return (
      <Page className="gradient-muted">
        <Page.Main className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        </Page.Main>
      </Page>
    );
  }

  return (
    <Page className="gradient-muted">
      <Page.Main className="flex flex-col items-center justify-center h-full overflow-y-auto">
        <div className="text-center space-y-8 p-6 max-w-md w-full">
          {/* Hero Section */}
          <div className="space-y-4">
            <div className="text-6xl mb-4">🌉</div>
            <h1 className="text-4xl font-bold text-gradient">USDC Offramp</h1>
            <p className="text-lg text-gray-700 leading-relaxed">
              Bridge USDC to Ethereum, Cash out to GCash
            </p>
            <p className="text-sm text-gray-600">
              For Philippines merchants • Powered by Circle CCTP
            </p>
          </div>

          {/* Features Card */}
          <div className="card-elegant p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🚀 How it works
            </h2>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
                  1
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Get USDC Loans</p>
                  <p className="text-gray-600">
                    Use World ID to request instant USDC microloans
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
                  2
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">
                    Bridge to Ethereum
                  </p>
                  <p className="text-gray-600">
                    Use Circle CCTP to bridge USDC in 15 minutes
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
                  3
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Cash out to GCash</p>
                  <p className="text-gray-600">
                    Convert Ethereum USDC to PHP via Binance P2P
                  </p>
                </div>
              </div>
            </div>

            <AuthButton />
          </div>

          {/* Trust Footer */}
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              🔒 World ID • 🌉 Circle CCTP • 🇵🇭 GCash Ready
            </p>
            <p className="text-xs text-gray-400">
              Solving real merchant cash-out problems in Philippines
            </p>
          </div>
        </div>
      </Page.Main>
    </Page>
  );
}
