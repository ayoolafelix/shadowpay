"use client";

import { useEffect, useState, useCallback } from "react";
import { TransactionFeed } from "@/components/TransactionFeed";
import { WalletCard } from "@/components/WalletCard";
import { simClient, DuneWalletData, Transaction } from "@/lib/simClient";

export default function GlobalFlowPage() {
  const [topWallets, setTopWallets] = useState<DuneWalletData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const mockAddresses = simClient.getMockWalletAddresses();
      const wallets = await Promise.all(
        mockAddresses.map((addr) => simClient.getFullWalletData(addr))
      );
      setTopWallets(wallets);

      const initialTxs = simClient.getRecentTransactions(50);
      setTransactions(initialTxs);
    } catch (error) {
      console.error("Failed to load data:", error);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (transactions.length === 0) return;

    const interval = setInterval(() => {
      const mockTx: Transaction = {
        signature: `sig_${Math.random().toString(36).substring(7)}...`,
        timestamp: Math.floor(Date.now() / 1000),
        type: Math.random() > 0.5 ? "receive" : "send",
        fromAddress: Array.from({ length: 44 }, () =>
          "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz1234567890".charAt(
            Math.floor(Math.random() * 58)
          )
        ).join(""),
        toAddress: Array.from({ length: 44 }, () =>
          "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz1234567890".charAt(
            Math.floor(Math.random() * 58)
          )
        ).join(""),
        amount: Math.random() * 5000 + 100,
        fee: 0.000005,
        status: "confirmed",
      };
      setTransactions((prev) => [mockTx, ...prev].slice(0, 500));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Global PUSD Flow</h1>
          <p className="text-slate-500 mt-1">
            Real-time monitoring of PUSD activity across Solana
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TransactionFeed
            title="Live PUSD Transactions"
            transactions={transactions}
            maxHeight="max-h-[700px]"
            showFilters={true}
          />
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-6 text-white">
            <p className="text-cyan-100 text-sm">Network Status</p>
            <p className="text-3xl font-bold mt-2">Operational</p>
            <div className="flex items-center space-x-2 mt-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span className="text-sm text-cyan-100">Syncing data...</span>
            </div>
          </div>

          <h3 className="font-semibold text-slate-900">Top Wallets</h3>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-slate-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {topWallets.slice(0, 4).map((wallet) => (
                <WalletCard key={wallet.balance.address} data={wallet} showDetails={false} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}