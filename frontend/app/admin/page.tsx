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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Admin Dashboard
            </h1>
            <p className="text-slate-400">
              Manage contract and house operations
            </p>
          </div>
          <button
            onClick={fetchContractStatus}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}
      </div>

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
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="flex border-b border-slate-700">
            {(["overview", "house", "contract", "advanced"] as const).map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-3 font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-green-600/20 text-green-400 border-b-2 border-green-500"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ),
            )}
          </div>

          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Contract Information
                </h3>
                {contractStatus && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Contract Address:</span>
                      <span className="text-white font-mono text-sm">
                        {contractStatus.contractAddress.slice(0, 10)}...
                        {contractStatus.contractAddress.slice(-8)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Owner:</span>
                      <span className="text-white font-mono text-sm">
                        {contractStatus.owner.slice(0, 10)}...
                        {contractStatus.owner.slice(-8)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Server Operator:</span>
                      <span className="text-white font-mono text-sm">
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
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Amount in USDC"
                      className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                    />
                    <button
                      onClick={handleWithdraw}
                      disabled={isLoading || !withdrawAmount}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {isLoading ? "Processing..." : "Withdraw"}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Fund House
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="Amount in USDC"
                      className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                    />
                    <button
                      onClick={handleFund}
                      disabled={isLoading || !fundAmount}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {isLoading ? "Processing..." : "Fund"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "contract" && (
              <div className="space-y-6">
                <div className="flex gap-4">
                  <button
                    onClick={handlePause}
                    disabled={isLoading || contractStatus?.isPaused}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Pause className="w-5 h-5" />
                    Pause Contract
                  </button>
                  <button
                    onClick={handleUnpause}
                    disabled={isLoading || !contractStatus?.isPaused}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Play className="w-5 h-5" />
                    Unpause Contract
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Set Server Operator
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOperator}
                      onChange={(e) => setNewOperator(e.target.value)}
                      placeholder="0x..."
                      className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                    />
                    <button
                      onClick={handleSetOperator}
                      disabled={isLoading || !newOperator}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {isLoading ? "Setting..." : "Set"}
                    </button>
                  </div>
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
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={ethWithdrawAmount}
                        onChange={(e) => setEthWithdrawAmount(e.target.value)}
                        placeholder="Amount in ETH"
                        className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                      />
                      <button
                        onClick={handleWithdrawETH}
                        disabled={
                          isLoading || !ethWithdrawAddress || !ethWithdrawAmount
                        }
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {isLoading ? "Processing..." : "Withdraw"}
                      </button>
                    </div>
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
                className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
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
