"use client";

import { useEffect, useState } from "react";
import { Transaction } from "@/lib/simClient";
import { formatAddress, formatUsd, formatTimestamp } from "@/lib/formatters";
import Link from "next/link";
import { clsx } from "clsx";

interface TransactionFeedProps {
  transactions?: Transaction[];
  title?: string;
  maxHeight?: string;
  showFilters?: boolean;
}

export function TransactionFeed({
  transactions,
  title = "Live Transactions",
  maxHeight = "max-h-[600px]",
  showFilters = true,
}: TransactionFeedProps) {
  const [incomingFilter, setIncomingFilter] = useState(true);
  const [outgoingFilter, setOutgoingFilter] = useState(true);
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([]);
  const [isLive, setIsLive] = useState(!transactions);

  const displayTransactions = transactions || localTransactions;

  const filteredTransactions = displayTransactions.filter((tx) => {
    if (tx.type === "receive" && !incomingFilter) return false;
    if (tx.type === "send" && !outgoingFilter) return false;
    return true;
  });

  useEffect(() => {
    if (!transactions && isLive) {
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
        setLocalTransactions((prev) => [mockTx, ...prev].slice(0, 500));
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isLive, transactions]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            {isLive && (
              <span className="flex items-center space-x-1 text-xs text-emerald-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Live</span>
              </span>
            )}
          </div>
          {showFilters && (
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={incomingFilter}
                  onChange={(e) => setIncomingFilter(e.target.checked)}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-slate-600">Incoming</span>
              </label>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={outgoingFilter}
                  onChange={(e) => setOutgoingFilter(e.target.checked)}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-slate-600">Outgoing</span>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className={`overflow-auto ${maxHeight}`}>
        <table className="w-full">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                Type
              </th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                From
              </th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                To
              </th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                Amount
              </th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No transactions to display
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx, index) => (
                <tr
                  key={`${tx.signature}-${index}`}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                        tx.type === "receive"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {tx.type === "receive" ? "IN" : "OUT"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/wallet/${tx.fromAddress}`}
                      className="font-mono text-sm text-slate-900 hover:text-cyan-600"
                    >
                      {formatAddress(tx.fromAddress)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/wallet/${tx.toAddress}`}
                      className="font-mono text-sm text-slate-900 hover:text-cyan-600"
                    >
                      {formatAddress(tx.toAddress)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatUsd(tx.amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-500">
                    {formatTimestamp(tx.timestamp)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}