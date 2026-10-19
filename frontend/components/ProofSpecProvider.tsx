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
import { UncertainWriteError, refreshStatsAfterFinalizedWrite, type PendingWrite } from "@/lib/write-verification";
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
  pendingWrite: PendingWrite | null;
  resumePendingWrite(): Promise<void>;
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
  const [pendingWrite, setPendingWrite] = useState<PendingWrite | null>(null);
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
        setPendingWrite(nextGateway.getPendingWrite());
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
          setPendingWrite(gateway.getPendingWrite());
          // Finality was already verified: a failed dashboard refresh must not
          // relabel the successful write as FAILED or invite resubmission.
          await refreshStatsAfterFinalizedWrite(() => refreshStatsFor(gateway), setError);
          return result;
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "Transaction failed.";
          setWritePhase(caught instanceof UncertainWriteError ? "uncertain" : "failed");
          try { setPendingWrite(gateway.getPendingWrite()); } catch { /* retain last state */ }
          setWriteDetail(message);
          setError(message);
          throw caught;
        }
      });
    },
    [gateway, refreshStatsFor, walletAddress]
  );

  const resumePendingWrite = useCallback(async () => {
    if (!gateway) throw new Error("ProofSpec is not configured.");
    return lock.current.run(async () => {
      setWritePhase("finalizing");
      try {
        await gateway.resumePendingWrite((phase, detail) => {
          setWritePhase(phase);
          setWriteDetail(detail || null);
        });
        setPendingWrite(gateway.getPendingWrite());
        // The reconciled write remains finalized even if summary reads fail.
        await refreshStatsAfterFinalizedWrite(() => refreshStatsFor(gateway), setError);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Unable to reconcile outstanding transaction.";
        setWritePhase(caught instanceof UncertainWriteError ? "uncertain" : "failed");
        setWriteDetail(message);
        setError(message);
        try { setPendingWrite(gateway.getPendingWrite()); } catch { /* keep prior state */ }
        throw caught;
      }
    });
  }, [gateway, refreshStatsFor]);

  const clearWriteState = useCallback(() => {
    if (!pendingWrite && writePhase !== "submitting" && writePhase !== "finalizing" && writePhase !== "verifying") {
      setWritePhase("idle");
      setWriteDetail(null);
    }
  }, [writePhase, pendingWrite]);

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
      pendingWrite,
      resumePendingWrite,
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
      pendingWrite,
      resumePendingWrite,
      connectWallet,
      syncWalletNetwork,
      refreshStats,
      executeWrite,
      clearWriteState
    ]
  );

  return (
    <RuntimeContext.Provider value={value}>
      {pendingWrite ? (
        <section className="callout warning" role="status" aria-live="polite">
          <strong>Outstanding ProofSpec transaction — do not resubmit</strong>
          <p><code>{pendingWrite.hash || "No hash returned; manually inspect wallet history"}</code></p>
          <p>Chain {pendingWrite.chainId}; contract {pendingWrite.contractAddress}</p>
          <button className="button button-primary"
            disabled={!pendingWrite.hash || ["finalizing", "verifying"].includes(writePhase)}
            onClick={() => void resumePendingWrite().catch(() => undefined)}>
            Resume finalized transaction verification
          </button>
        </section>
      ) : null}
      {children}
    </RuntimeContext.Provider>
  );
}

export function useProofSpec() {
  const value = useContext(RuntimeContext);
  if (!value) throw new Error("useProofSpec must be used inside ProofSpecProvider.");
  return value;
}
