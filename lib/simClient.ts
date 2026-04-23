export interface WalletBalance {
  address: string;
  pusdBalance: number;
  solBalance: number;
  lastUpdated: number;
}

export interface Transaction {
  signature: string;
  timestamp: number;
  type: "send" | "receive";
  fromAddress: string;
  toAddress: string;
  amount: number;
  fee: number;
  status: "confirmed" | "pending" | "failed";
}

export interface TokenTransfer {
  signature: string;
  timestamp: number;
  fromAddress: string;
  toAddress: string;
  amount: number;
  tokenSymbol: string;
  tokenMint: string;
}

export interface WalletMetrics {
  totalReceived: number;
  totalSent: number;
  transactionCount: number;
  uniqueCounterparties: number;
  avgTransactionSize: number;
  firstActivity: number;
  lastActivity: number;
}

export interface DuneWalletData {
  balance: WalletBalance;
  transactions: Transaction[];
  transfers: TokenTransfer[];
  metrics: WalletMetrics;
}

const MOCK_WALLETS = [
  "7xKXtg2AWG4mFz8eYz1x2D2Z8Y9p7mN3kL6hJ4sQwRt",
  "3k4zVGsm5R8xLm2dW7pQ6nH9fK1cB8vM0tU5wXyZqA",
  "9mN2kL5pR8tVwXy3cB7zA6fH1eJ9sK4gL2qW5tY",
  "2vN4hL8kR6tPxM3cW9zB1fA5gJ7sK2qY4tU6wX",
  "5pL3hJ7kN9tRwXy2cB6zA8fG1dJ4sK6qW9tY3v",
];

function generateMockAddress(): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  let result = "";
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateMockTransactions(address: string, count: number): Transaction[] {
  const txs: Transaction[] = [];
  const now = Math.floor(Date.now() / 1000);
  
  for (let i = 0; i < count; i++) {
    const isSend = Math.random() > 0.5;
    const counterparty = generateMockAddress();
    txs.push({
      signature: `${generateMockAddress().slice(0, 20)}...`,
      timestamp: now - Math.floor(Math.random() * 86400 * 30),
      type: isSend ? "send" : "receive",
      fromAddress: isSend ? address : counterparty,
      toAddress: isSend ? counterparty : address,
      amount: Math.random() * 10000 + 100,
      fee: 0.000005 + Math.random() * 0.00001,
      status: Math.random() > 0.05 ? "confirmed" : "pending",
    });
  }
  
  return txs.sort((a, b) => b.timestamp - a.timestamp);
}

class DuneSimClient {
  private apiKey: string;
  private baseUrl: string = "https://api.dune.com/api/v1";
  private useRealApi: boolean = false;
  private queryCache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout: number = 30000;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_DUNE_API_KEY || "";
    this.useRealApi = !!this.apiKey;
    
    if (typeof window !== 'undefined' && this.useRealApi) {
      console.log("Dune SIM: Connected to real API");
    } else if (typeof window !== 'undefined') {
      console.log("Dune SIM: Using mock data (no API key)");
    }
  }

  isUsingRealApi(): boolean {
    return this.useRealApi;
  }

  private async executeQuery(sql: string, timeout: number = 30): Promise<any[]> {
    if (!this.useRealApi) return [];

    const cacheKey = sql;
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(`${this.baseUrl}/sql/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dune-api-key": this.apiKey,
        },
        body: JSON.stringify({
          query: sql,
          performance: "medium",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Dune SQL error:", error);
        return [];
      }

      const result = await response.json();
      const executionId = result.execution_id;

      const maxAttempts = timeout * 2;
      let attempts = 0;
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const statusRes = await fetch(
          `${this.baseUrl}/execution/${executionId}/status`,
          { headers: { "x-dune-api-key": this.apiKey } }
        );
        
        const status = await statusRes.json();
        if (status.state === "QUERY_STATE_COMPLETED") {
          const resultsRes = await fetch(
            `${this.baseUrl}/execution/${executionId}/results`,
            { headers: { "x-dune-api-key": this.apiKey } }
          );
          const results = await resultsRes.json();
          const data = results.result?.rows || [];
          this.queryCache.set(cacheKey, { data, timestamp: Date.now() });
          return data;
        } else if (status.state === "QUERY_STATE_FAILED") {
          console.error("Query failed:", status);
          return [];
        }
        attempts++;
      }
      return [];
    } catch (error) {
      console.error("Dune query error:", error);
      return [];
    }
  }

  async getWalletBalance(walletAddress: string): Promise<WalletBalance> {
    if (this.useRealApi) {
      const sql = `
        SELECT 
          address,
          balance,
          balance_usd
        FROM balances.spl_latest
        WHERE blockchain = 'solana'
          AND address = '${walletAddress}'
          AND token_address = 'PUSD_TOKEN_MINT'
      `;
      
      const results = await this.executeQuery(sql);
      if (results.length > 0) {
        return {
          address: walletAddress,
          pusdBalance: results[0].balance || 0,
          solBalance: 0,
          lastUpdated: Math.floor(Date.now() / 1000),
        };
      }
    }

    return {
      address: walletAddress,
      pusdBalance: Math.random() * 100000 + 1000,
      solBalance: Math.random() * 10 + 0.1,
      lastUpdated: Math.floor(Date.now() / 1000),
    };
  }

  async getTransactionHistory(walletAddress: string): Promise<Transaction[]> {
    if (this.useRealApi) {
      const sql = `
        SELECT 
          block_time,
          tx_from,
          tx_to,
          value,
          tx_hash,
          success
        FROM solana.transactions
        WHERE (tx_from = '${walletAddress}' OR tx_to = '${walletAddress}')
          AND block_time > NOW() - INTERVAL '30' DAY
        ORDER BY block_time DESC
        LIMIT 100
      `;
      
      const results = await this.executeQuery(sql);
      if (results.length > 0) {
        return results.map((row: any) => ({
          signature: row.tx_hash || "",
          timestamp: row.block_time ? Math.floor(new Date(row.block_time).getTime() / 1000) : Math.floor(Date.now() / 1000),
          type: row.tx_from === walletAddress ? "send" : "receive",
          fromAddress: row.tx_from || "",
          toAddress: row.tx_to || "",
          amount: row.value || 0,
          fee: 0.000005,
          status: row.success !== false ? "confirmed" : "failed",
        }));
      }
    }

    return generateMockTransactions(walletAddress, 50);
  }

  async getTokenTransfers(walletAddress: string): Promise<TokenTransfer[]> {
    if (this.useRealApi) {
      const sql = `
        SELECT 
          block_time,
          from_account,
          to_account,
          amount,
          tx_hash,
          mint
        FROM solana.spl_transfers
        WHERE from_account = '${walletAddress}' OR to_account = '${walletAddress}'
          AND block_time > NOW() - INTERVAL '30' DAY
        ORDER BY block_time DESC
        LIMIT 50
      `;
      
      const results = await this.executeQuery(sql);
      if (results.length > 0) {
        return results.map((row: any) => ({
          signature: row.tx_hash || "",
          timestamp: row.block_time ? Math.floor(new Date(row.block_time).getTime() / 1000) : Math.floor(Date.now() / 1000),
          fromAddress: row.from_account || "",
          toAddress: row.to_account || "",
          amount: row.amount || 0,
          tokenSymbol: "SPL",
          tokenMint: row.mint || "",
        }));
      }
    }

    const txs = generateMockTransactions(walletAddress, 30);
    return txs.map((tx) => ({
      signature: tx.signature,
      timestamp: tx.timestamp,
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      amount: tx.amount,
      tokenSymbol: "PUSD",
      tokenMint: "PUSD_MINT_ADDRESS",
    }));
  }

  async getRecentNetworkActivity(): Promise<Transaction[]> {
    if (this.useRealApi) {
      const sql = `
        SELECT 
          block_time,
          tx_from,
          tx_to,
          value,
          tx_hash
        FROM solana.transactions
        WHERE block_time > NOW() - INTERVAL '1' HOUR
        ORDER BY block_time DESC
        LIMIT 100
      `;
      
      const results = await this.executeQuery(sql);
      if (results.length > 0) {
        return results.map((row: any) => ({
          signature: row.tx_hash || "",
          timestamp: row.block_time ? Math.floor(new Date(row.block_time).getTime() / 1000) : Math.floor(Date.now() / 1000),
          type: Math.random() > 0.5 ? "send" : "receive",
          fromAddress: row.tx_from || "",
          toAddress: row.tx_to || "",
          amount: row.value || 0,
          fee: 0.000005,
          status: "confirmed",
        }));
      }
    }
    return [];
  }

  async getWalletMetrics(walletAddress: string): Promise<WalletMetrics> {
    const transactions = await this.getTransactionHistory(walletAddress);
    
    const received = transactions
      .filter((tx) => tx.type === "receive")
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const sent = transactions
      .filter((tx) => tx.type === "send")
      .reduce((sum, tx) => sum + tx.amount, 0);

    const counterparties = new Set(
      transactions.flatMap((tx) => [tx.fromAddress, tx.toAddress])
    );

    return {
      totalReceived: received,
      totalSent: sent,
      transactionCount: transactions.length,
      uniqueCounterparties: counterparties.size,
      avgTransactionSize: transactions.length > 0 
        ? (received + sent) / transactions.length / 2 
        : 0,
      firstActivity: transactions.length > 0 
        ? Math.min(...transactions.map((tx) => tx.timestamp))
        : Math.floor(Date.now() / 1000),
      lastActivity: transactions.length > 0 
        ? Math.max(...transactions.map((tx) => tx.timestamp))
        : Math.floor(Date.now() / 1000),
    };
  }

  async getFullWalletData(walletAddress: string): Promise<DuneWalletData> {
    const [balance, transactions, transfers] = await Promise.all([
      this.getWalletBalance(walletAddress),
      this.getTransactionHistory(walletAddress),
      this.getTokenTransfers(walletAddress),
    ]);

    const metrics = await this.getWalletMetrics(walletAddress);

    return {
      balance,
      transactions,
      transfers,
      metrics,
    };
  }

  subscribeToWallet(
    walletAddress: string,
    callback: (data: DuneWalletData) => void,
    interval: number = 10000
  ): () => void {
    this.queryCache.clear();
    
    const fetchData = async () => {
      const data = await this.getFullWalletData(walletAddress);
      callback(data);
    };

    fetchData();
    const timer = setInterval(fetchData, interval);

    return () => clearInterval(timer);
  }

  getRecentTransactions(count: number = 100): Transaction[] {
    const now = Math.floor(Date.now() / 1000);
    const transactions: Transaction[] = [];

    for (let i = 0; i < count; i++) {
      const from = generateMockAddress();
      const to = generateMockAddress();
      transactions.push({
        signature: `${generateMockAddress().slice(0, 20)}...`,
        timestamp: now - Math.floor(Math.random() * 3600),
        type: Math.random() > 0.5 ? "send" : "receive",
        fromAddress: from,
        toAddress: to,
        amount: Math.random() * 5000 + 100,
        fee: 0.000005 + Math.random() * 0.00001,
        status: "confirmed",
      });
    }

    return transactions.sort((a, b) => b.timestamp - a.timestamp);
  }

  getMockWalletAddresses(): string[] {
    return MOCK_WALLETS;
  }
}

export const simClient = new DuneSimClient();