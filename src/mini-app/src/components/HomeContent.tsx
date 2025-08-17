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
          title="NanoLend"
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
              ↗️ Bridge
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-4 py-6 bg-white min-h-screen">
          <div className="max-w-md mx-auto space-y-4">
            {activeTab === "loans" && (
              <>
                {/* Loan Dashboard */}
                <div className="space-y-4">
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
              </>
            )}

            {activeTab === "bridge" && (
              <>
                {/* Bridge Dashboard */}
                <div className="space-y-4">
                  <div className="text-center">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">
                      ↗️ Bridge to Ethereum
                    </h2>
                    <p className="text-sm text-gray-600">
                      Convert USDC to cash via GCash
                    </p>
                  </div>

                  <BridgeInterface />
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
