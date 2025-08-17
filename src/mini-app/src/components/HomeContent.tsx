"use client";

import { useState, useRef } from "react";
import { Page } from "@/components/PageLayout";
import { LoanDashboard, LoanDashboardRef } from "@/components/LoanDashboard";
import { BridgeInterface } from "@/components/BridgeInterface";
import { LoanRequest, LoanRequestRef } from "@/components/LoanRequest";
import { LoanDetailModal } from "@/components/LoanDetailModal";
import { LoanSummary } from "@/types/loan";
import { Marble, TopBar } from "@worldcoin/mini-apps-ui-kit-react";

interface HomeContentProps {
  session: {
    user?: {
      id?: string;
      username?: string;
      profilePictureUrl?: string;
    };
  } | null;
}

export function HomeContent({ session }: HomeContentProps) {
  const [activeTab, setActiveTab] = useState<"loans" | "bridge">("loans");
  const [selectedLoan, setSelectedLoan] = useState<LoanSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const loanDashboardRef = useRef<LoanDashboardRef>(null);
  const loanRequestRef = useRef<LoanRequestRef>(null);

  const handleLoanSelect = (loan: LoanSummary) => {
    setSelectedLoan(loan);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedLoan(null);
  };

  const handleRepaymentSuccess = (amount: string, loanId: string) => {
    console.log("✅ Repayment successful:", { amount, loanId });
    // Refresh both dashboard and credit data
    loanDashboardRef.current?.refreshData();
    loanRequestRef.current?.refreshCredit();
  };

  const handleTransactionSuccess = (amount: string, merchant: string) => {
    console.log("✅ Loan transaction successful:", { amount, merchant });
    // Refresh both dashboard and credit data
    loanDashboardRef.current?.refreshData();
    loanRequestRef.current?.refreshCredit();
  };

  return (
    <>
      <Page.Header className="p-0">
        <TopBar
          title="NanoLend Global"
          endAdornment={
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold capitalize">
                {session?.user?.username}
              </p>
              <Marble src={session?.user?.profilePictureUrl} className="w-12" />
            </div>
          }
        />
      </Page.Header>

      <Page.Main className="flex flex-col mb-16">
        {/* App Description */}
        <div className="px-4 py-6 bg-gradient-to-r from-blue-50 to-green-50 border-b">
          <div className="text-center max-w-md mx-auto">
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              🇵🇭 BNPL + CCTP Offramp
            </h1>
            <p className="text-sm text-gray-600">
              Request USDC loans • Bridge to Ethereum • Cash out to GCash
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 py-4 bg-white border-b">
          <div className="flex max-w-md mx-auto">
            <button
              onClick={() => setActiveTab("loans")}
              className={`flex-1 py-3 px-4 text-center rounded-l-lg font-medium transition-all ${
                activeTab === "loans"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              💰 Loans
            </button>
            <button
              onClick={() => setActiveTab("bridge")}
              className={`flex-1 py-3 px-4 text-center rounded-r-lg font-medium transition-all ${
                activeTab === "bridge"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              🌉 Bridge
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-4 py-6 bg-gray-50 min-h-screen">
          <div className="max-w-md mx-auto space-y-4">
            {activeTab === "loans" && (
              <>
                {/* Loan Dashboard */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">
                      💰 USDC Loans Dashboard
                    </h2>
                    <p className="text-sm text-gray-600">
                      Manage your World ID verified micro-loans
                    </p>
                  </div>

                  <LoanDashboard
                    ref={loanDashboardRef}
                    onLoanSelect={handleLoanSelect}
                    onRepaymentSuccess={handleRepaymentSuccess}
                  />
                  <LoanRequest
                    ref={loanRequestRef}
                    onTransactionSuccess={handleTransactionSuccess}
                  />
                </div>

                {/* Quick Bridge CTA */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-700 mb-2">
                    Got USDC to cash out?
                  </p>
                  <button
                    onClick={() => setActiveTab("bridge")}
                    className="text-green-600 font-medium text-sm underline hover:text-green-800"
                  >
                    Switch to Bridge Dashboard →
                  </button>
                </div>
              </>
            )}

            {activeTab === "bridge" && (
              <>
                {/* Bridge Dashboard */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">
                      🌉 CCTP Bridge Dashboard
                    </h2>
                    <p className="text-sm text-gray-600">
                      Bridge USDC to Ethereum for Philippines GCash cash-out
                    </p>
                  </div>

                  <BridgeInterface />
                </div>

                {/* Quick Loan CTA */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-700 mb-2">Need more USDC?</p>
                  <button
                    onClick={() => setActiveTab("loans")}
                    className="text-blue-600 font-medium text-sm underline hover:text-blue-800"
                  >
                    Request a micro-loan →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Page.Main>

      {/* Loan Detail Modal */}
      {selectedLoan && (
        <LoanDetailModal
          loan={selectedLoan}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onRepaymentSuccess={handleRepaymentSuccess}
        />
      )}
    </>
  );
}
