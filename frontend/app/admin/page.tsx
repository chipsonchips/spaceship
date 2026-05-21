"use client";

import { useState, useEffect } from "react";
import {
  Pause,
  Play,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import * as apiAuth from "@/lib/api-auth";
import {
  SkeletonHeader,
  SkeletonStats,
  SkeletonTabs,
} from "@/components/skeleton";
import { AdminPageHeader, AdminTabs, AdminFormRow } from "@/components/admin";

interface ContractStatus {
  owner: string;
  serverOperator: string;
  isPaused: boolean;
  contractAddress: string;
  ethBalance: number;
  usdcBalance: number;
  usdcToken: string;
  chain: string;
  chainId: number;
}

interface Transaction {
  type: string;
  status: "pending" | "success" | "error";
  message: string;
  txHash?: string;
  timestamp: number;
  chain?: string;
}

export default function AdminDashboard() {
  const { adminSecret, isAuthenticated, selectedChain } = useAdminAuth();
  const [contractStatus, setContractStatus] = useState<ContractStatus | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<
    "overview" | "house" | "contract" | "advanced"
  >("overview");

  // Form states
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [newOperator, setNewOperator] = useState("");
  const [ethWithdrawAddress, setEthWithdrawAddress] = useState("");
  const [ethWithdrawAmount, setEthWithdrawAmount] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      fetchContractStatus();
    }
  }, [isAuthenticated, selectedChain]);


  const fetchContractStatus = async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoading(true);
      const response = await apiAuth.adminGetContractStatus(selectedChain);
      // Extract the status data from the response
      const { success, ...statusData } = response;
      setContractStatus(statusData as ContractStatus);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setIsLoading(false);
    }
  };

  const makeRequest = async (
    operationName: string,
    apiCall: () => Promise<any>,
  ) => {
    try {
      setIsLoading(true);
      setError("");
      const result = await apiCall();
      setTransactions((prev) => [
        {
          type: operationName,
          status: "success",
          message: "Operation successful",
          txHash: result.txHash,
          timestamp: Date.now(),
          chain: result.chain,
        },
        ...prev,
      ]);
      await fetchContractStatus();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Operation failed";
      setError(errorMsg);
      setTransactions((prev) => [
        {
          type: operationName,
          status: "error",
          message: errorMsg,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) return;
    await makeRequest("withdrawHouse", () =>
      apiAuth.adminWithdrawHouse(parseFloat(withdrawAmount), selectedChain),
    );
    setWithdrawAmount("");
  };

  const handleFund = async () => {
    if (!fundAmount) return;
    await makeRequest("fundHouse", () =>
      apiAuth.adminFundHouse(parseFloat(fundAmount), selectedChain),
    );
    setFundAmount("");
  };

  const handlePause = async () => {
    await makeRequest("pauseContract", () =>
      apiAuth.adminPauseContract(selectedChain),
    );
  };

  const handleUnpause = async () => {
    await makeRequest("unpauseContract", () =>
      apiAuth.adminUnpauseContract(selectedChain),
    );
  };

  const handleSetOperator = async () => {
    if (!newOperator) return;
    await makeRequest("setOperator", () =>
      apiAuth.adminSetOperator(newOperator, selectedChain),
    );
    setNewOperator("");
  };

  const handleWithdrawETH = async () => {
    if (!ethWithdrawAddress || !ethWithdrawAmount) return;
    await makeRequest("withdrawETH", () =>
      apiAuth.adminWithdrawETH(
        ethWithdrawAddress,
        parseFloat(ethWithdrawAmount),
        selectedChain,
      ),
    );
    setEthWithdrawAddress("");
    setEthWithdrawAmount("");
  };

  const dashboardTabs = [
    { id: "overview", label: "Overview" },
    { id: "house", label: "House" },
    { id: "contract", label: "Contract" },
    { id: "advanced", label: "Advanced" },
  ] as const;

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <AdminPageHeader
        title="Admin Dashboard"
        description="Manage contract and house operations"
        actions={
          <button
            type="button"
            onClick={fetchContractStatus}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all disabled:opacity-50 w-full sm:w-auto touch-manipulation"
          >
            <RefreshCw
              className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        }
      />

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Quick Stats */}
      {isLoading && !contractStatus ? (
        <SkeletonStats count={4} />
      ) : (
        contractStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
              <p className="text-slate-400 text-sm mb-2">USDC Balance</p>
              <p className="text-2xl font-bold text-white">
                ${contractStatus.usdcBalance.toFixed(2)}
              </p>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
              <p className="text-slate-400 text-sm mb-2">ETH Balance</p>
              <p className="text-2xl font-bold text-white">
                {contractStatus.ethBalance.toFixed(4)} ETH
              </p>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
              <p className="text-slate-400 text-sm mb-2">Status</p>
              <div className="flex items-center gap-2">
                {contractStatus.isPaused ? (
                  <>
                    <Pause className="w-5 h-5 text-yellow-400" />
                    <p className="text-yellow-400 font-semibold">Paused</p>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 text-green-400" />
                    <p className="text-green-400 font-semibold">Active</p>
                  </>
                )}
              </div>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
              <p className="text-slate-400 text-sm mb-2">Chain</p>
              <p className="text-xl font-bold text-white">
                {contractStatus.chain}
              </p>
            </div>
          </div>
        )
      )}

      {/* Tabs */}
      {isLoading && !contractStatus ? (
        <SkeletonTabs tabCount={4} />
      ) : (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-xl sm:rounded-2xl overflow-hidden">
          <AdminTabs
            tabs={[...dashboardTabs]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as typeof activeTab)}
          />

          <div className="p-4 sm:p-6">
            {activeTab === "overview" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Contract Information
                </h3>
                {contractStatus && (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center py-2 border-b border-slate-800/50 last:border-0">
                      <span className="text-slate-400 text-sm">Contract Address</span>
                      <span className="text-white font-mono text-xs sm:text-sm break-all sm:text-right">
                        {contractStatus.contractAddress.slice(0, 10)}...
                        {contractStatus.contractAddress.slice(-8)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center py-2 border-b border-slate-800/50 last:border-0">
                      <span className="text-slate-400 text-sm">Owner</span>
                      <span className="text-white font-mono text-xs sm:text-sm break-all sm:text-right">
                        {contractStatus.owner.slice(0, 10)}...
                        {contractStatus.owner.slice(-8)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center py-2">
                      <span className="text-slate-400 text-sm">Server Operator</span>
                      <span className="text-white font-mono text-xs sm:text-sm break-all sm:text-right">
                        {contractStatus.serverOperator.slice(0, 10)}...
                        {contractStatus.serverOperator.slice(-8)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "house" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Withdraw House Profits
                  </h3>
                  <AdminFormRow>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Amount in USDC"
                      className="flex-1 min-w-0 px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                    />
                    <button
                      type="button"
                      onClick={handleWithdraw}
                      disabled={isLoading || !withdrawAmount}
                      className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 w-full sm:w-auto shrink-0 touch-manipulation"
                    >
                      {isLoading ? "Processing..." : "Withdraw"}
                    </button>
                  </AdminFormRow>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Fund House
                  </h3>
                  <AdminFormRow>
                    <input
                      type="number"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="Amount in USDC"
                      className="flex-1 min-w-0 px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                    />
                    <button
                      type="button"
                      onClick={handleFund}
                      disabled={isLoading || !fundAmount}
                      className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 w-full sm:w-auto shrink-0 touch-manipulation"
                    >
                      {isLoading ? "Processing..." : "Fund"}
                    </button>
                  </AdminFormRow>
                </div>
              </div>
            )}

            {activeTab === "contract" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handlePause}
                    disabled={isLoading || contractStatus?.isPaused}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 touch-manipulation"
                  >
                    <Pause className="w-5 h-5 shrink-0" />
                    Pause Contract
                  </button>
                  <button
                    type="button"
                    onClick={handleUnpause}
                    disabled={isLoading || !contractStatus?.isPaused}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 touch-manipulation"
                  >
                    <Play className="w-5 h-5 shrink-0" />
                    Unpause Contract
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Set Server Operator
                  </h3>
                  <AdminFormRow>
                    <input
                      type="text"
                      value={newOperator}
                      onChange={(e) => setNewOperator(e.target.value)}
                      placeholder="0x..."
                      className="flex-1 min-w-0 px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                    />
                    <button
                      type="button"
                      onClick={handleSetOperator}
                      disabled={isLoading || !newOperator}
                      className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 w-full sm:w-auto shrink-0 touch-manipulation"
                    >
                      {isLoading ? "Setting..." : "Set"}
                    </button>
                  </AdminFormRow>
                </div>
              </div>
            )}

            {activeTab === "advanced" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Withdraw ETH
                  </h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={ethWithdrawAddress}
                      onChange={(e) => setEthWithdrawAddress(e.target.value)}
                      placeholder="Recipient address (0x...)"
                      className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                    />
                    <AdminFormRow>
                      <input
                        type="number"
                        value={ethWithdrawAmount}
                        onChange={(e) => setEthWithdrawAmount(e.target.value)}
                        placeholder="Amount in ETH"
                        className="flex-1 min-w-0 px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                      />
                      <button
                        type="button"
                        onClick={handleWithdrawETH}
                        disabled={
                          isLoading || !ethWithdrawAddress || !ethWithdrawAmount
                        }
                        className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 w-full sm:w-auto shrink-0 touch-manipulation"
                      >
                        {isLoading ? "Processing..." : "Withdraw"}
                      </button>
                    </AdminFormRow>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction History */}
      {transactions.length > 0 && (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Transaction History
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {transactions.map((tx, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-3 bg-slate-800/30 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {tx.status === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  <div>
                    <p className="text-white font-medium">{tx.type}</p>
                    <p className="text-slate-400 text-sm">{tx.message}</p>
                  </div>
                </div>
                {tx.txHash && (
                  <a
                    href={`https://basescan.org/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
