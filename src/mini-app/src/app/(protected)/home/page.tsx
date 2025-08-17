import { auth } from "@/auth";
import { Page } from "@/components/PageLayout";
import { LoanDashboard } from "@/components/LoanDashboard";
import { BridgeInterface } from "@/components/BridgeInterface";
import { LoanRequest } from "@/components/LoanRequest";
import { Marble, TopBar } from "@worldcoin/mini-apps-ui-kit-react";

export default async function Home() {
  const session = await auth();

  return (
    <>
      <Page.Header className="p-0">
        <TopBar
          title="USDC Offramp"
          endAdornment={
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold capitalize">
                {session?.user.username}
              </p>
              <Marble src={session?.user.profilePictureUrl} className="w-12" />
            </div>
          }
        />
      </Page.Header>
      <Page.Main className="flex flex-col items-center justify-start gap-4 mb-16 px-4">
        {/* Loan Management Section */}
        <div className="w-full max-w-md space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              💰 USDC Loans & Bridge
            </h2>
            <p className="text-sm text-gray-600">
              Request loans • Bridge to Ethereum • Cash out to GCash
            </p>
          </div>

          <LoanDashboard />
          <LoanRequest />
        </div>

        {/* CCTP Bridge Section */}
        <div className="w-full max-w-md space-y-4">
          <div className="text-center border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              🌉 Bridge to Ethereum
            </h3>
            <p className="text-xs text-gray-500">
              Use Circle CCTP to bridge your USDC for GCash cash-out
            </p>
          </div>

          <BridgeInterface />
        </div>
      </Page.Main>
    </>
  );
}
