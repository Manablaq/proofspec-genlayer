"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { createProofSpecGateway, type ProofSpecGateway } from "@/lib/gateway";
import { WriteLock } from "@/lib/write-safety";
import type { RuntimeConfig, WriteIntent, WritePhase, WriteResult } from "@/lib/types";

type RuntimeContextValue = {
  config: RuntimeConfig | null;
  gateway: ProofSpecGateway | null;
  loading: boolean;
  error: string | null;
  specCount: number | null;
  challengeCount: number | null;
  walletAddress: string | null;
  writePhase: WritePhase;
  writeDetail: string | null;
  connectWallet(): Promise<void>;
  syncWalletNetwork(): Promise<void>;
  refreshStats(): Promise<void>;
  executeWrite(intent: WriteIntent): Promise<WriteResult>;
  clearWriteState(): void;
};

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export function ProofSpecProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RuntimeConfig | null>(null);
  const [gateway, setGateway] = useState<ProofSpecGateway | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specCount, setSpecCount] = useState<number | null>(null);
  const [challengeCount, setChallengeCount] = useState<number | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [writePhase, setWritePhase] = useState<WritePhase>("idle");
  const [writeDetail, setWriteDetail] = useState<string | null>(null);
  const lock = useRef(new WriteLock());

  const refreshStatsFor = useCallback(async (activeGateway: ProofSpecGateway) => {
    const [specs, challenges] = await Promise.all([
      activeGateway.getSpecCount(),
      activeGateway.getChallengeCount()
    ]);
    setSpecCount(specs);
    setChallengeCount(challenges);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/runtime-config", { cache: "no-store" });
        const nextConfig = (await response.json()) as RuntimeConfig;
        if (cancelled) return;

        setConfig(nextConfig);
        if (!nextConfig.configured) {
          setGateway(null);
          setSpecCount(null);
          setChallengeCount(null);
          return;
        }

        const nextGateway = createProofSpecGateway(nextConfig);
        setGateway(nextGateway);
        await refreshStatsFor(nextGateway);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to initialize ProofSpec.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [refreshStatsFor]);

  const refreshStats = useCallback(async () => {
    if (!gateway) return;
    try {
      setError(null);
      await refreshStatsFor(gateway);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to refresh finalized state.");
    }
  }, [gateway, refreshStatsFor]);

  const connectWallet = useCallback(async () => {
    if (!gateway) throw new Error("Configure the ProofSpec contract before connecting a wallet.");
    setError(null);
    try {
      const account = await gateway.connectWallet();
      setWalletAddress(account);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Wallet connection failed.";
      setError(message);
      throw caught;
    }
  }, [gateway]);

  const syncWalletNetwork = useCallback(async () => {
    if (!gateway) throw new Error("ProofSpec is not configured.");
    setError(null);
    try {
      await gateway.syncWalletNetwork();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Wallet network sync failed.";
      setError(message);
      throw caught;
    }
  }, [gateway]);

  const executeWrite = useCallback(
    async (intent: WriteIntent): Promise<WriteResult> => {
      if (!gateway) throw new Error("ProofSpec is not configured.");
      if (!walletAddress) throw new Error("Connect a wallet before signing a transaction.");

      return lock.current.run(async () => {
        setError(null);
        setWritePhase("requesting-wallet");
        setWriteDetail(null);

        try {
          const result = await gateway.submitWrite(intent, (phase, detail) => {
            setWritePhase(phase);
            setWriteDetail(detail || null);
          });
          await refreshStatsFor(gateway);
          return result;
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "Transaction failed.";
          setWritePhase("failed");
          setWriteDetail(message);
          setError(message);
          throw caught;
        }
      });
    },
    [gateway, refreshStatsFor, walletAddress]
  );

  const clearWriteState = useCallback(() => {
    if (writePhase !== "submitting" && writePhase !== "finalizing") {
      setWritePhase("idle");
      setWriteDetail(null);
    }
  }, [writePhase]);

  const value = useMemo<RuntimeContextValue>(
    () => ({
      config,
      gateway,
      loading,
      error,
      specCount,
      challengeCount,
      walletAddress,
      writePhase,
      writeDetail,
      connectWallet,
      syncWalletNetwork,
      refreshStats,
      executeWrite,
      clearWriteState
    }),
    [
      config,
      gateway,
      loading,
      error,
      specCount,
      challengeCount,
      walletAddress,
      writePhase,
      writeDetail,
      connectWallet,
      syncWalletNetwork,
      refreshStats,
      executeWrite,
      clearWriteState
    ]
  );

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useProofSpec() {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error("useProofSpec must be used inside ProofSpecProvider.");
  return value;
}
