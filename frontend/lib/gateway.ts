import { createClient, isSuccessful } from "genlayer-js";
import {
  TransactionHashVariant,
  type CalldataEncodable
} from "genlayer-js/types";
import { sdkChainFor } from "@/lib/network";
import {
  PENDING_WRITE_KEY, UncertainWriteError, checkWalletIdentity,
  validatePendingWrite, verifyWriteTransition, classifyFinalizedExecution,
  type ObservedWriteState, type PendingWrite
} from "@/lib/write-verification";
import type {
  ChallengeRecord,
  EvidenceSnapshot,
  RuntimeConfig,
  SpecRecord,
  WriteIntent,
  WritePhase,
  WriteResult
} from "@/lib/types";

type WalletProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

export interface ProofSpecGateway {
  getSpecCount(): Promise<number>;
  getChallengeCount(): Promise<number>;
  getSpec(specId: number): Promise<SpecRecord>;
  getChallenge(challengeId: number): Promise<ChallengeRecord>;
  getEvidenceSnapshot(snapshotId: string): Promise<EvidenceSnapshot>;
  verifyEvidenceSnapshot(snapshotId: string): Promise<boolean>;
  connectWallet(): Promise<string>;
  syncWalletNetwork(): Promise<void>;
  getPendingWrite(): PendingWrite | null;
  resumePendingWrite(onPhase: (phase: WritePhase, detail?: string) => void): Promise<WriteResult>;
  submitWrite(
    intent: WriteIntent,
    onPhase: (phase: WritePhase, detail?: string) => void
  ): Promise<WriteResult>;
}

function requireProvider(): WalletProvider {
  if (typeof window === "undefined") {
    throw new Error("Browser wallet not found. Install or enable a compatible wallet.");
  }
  const provider = (window as Window & { ethereum?: WalletProvider }).ethereum;
  if (!provider) {
    throw new Error("Browser wallet not found. Install or enable a compatible wallet.");
  }
  return provider;
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  throw new Error(`Expected numeric contract result, received ${String(value)}`);
}

function productionArgs(intent: WriteIntent): CalldataEncodable[] {
  switch (intent.kind) {
    case "create_spec":
      return intent.args;
    case "evaluate_spec":
      return [BigInt(intent.args[0])];
    case "open_challenge":
      return [
        BigInt(intent.args[0]),
        BigInt(intent.args[1]),
        intent.args[2],
        intent.args[3]
      ];
    case "resolve_challenge":
      return [BigInt(intent.args[0])];
  }
}

async function walletAccounts(provider: WalletProvider): Promise<string[]> {
  const result = await provider.request({ method: "eth_requestAccounts" });
  if (!Array.isArray(result)) throw new Error("Wallet returned an invalid account list.");
  return result.filter((item): item is string => typeof item === "string");
}

async function switchWallet(
  provider: WalletProvider,
  config: Extract<RuntimeConfig, { configured: true }>
): Promise<void> {
  const chainId = `0x${config.chainId.toString(16)}`;
  const current = await provider.request({ method: "eth_chainId" });
  if (current === chainId) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }]
    });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? Number((error as { code: unknown }).code)
        : null;

    if (code !== 4902) throw error;

    const chain = sdkChainFor(config.network);
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: [config.rpcUrl],
          ...(config.explorerUrl
            ? { blockExplorerUrls: [config.explorerUrl] }
            : {})
        }
      ]
    });
  }
}

class GenLayerProofSpecGateway implements ProofSpecGateway {
  private readonly config: Extract<RuntimeConfig, { configured: true }>;
  private readonly readClient: ReturnType<typeof createClient>;
  private account: string | null = null;

  constructor(config: Extract<RuntimeConfig, { configured: true }>) {
    this.config = config;
    this.readClient = createClient({
      chain: sdkChainFor(config.network),
      endpoint: config.rpcUrl
    });
  }

  private async read(functionName: string, args: CalldataEncodable[] = []) {
    return this.readClient.readContract({
      address: this.config.contractAddress,
      functionName,
      args,
      transactionHashVariant: TransactionHashVariant.LATEST_FINAL
    });
  }

  async getSpecCount(): Promise<number> {
    return asNumber(await this.read("get_spec_count"));
  }

  async getChallengeCount(): Promise<number> {
    return asNumber(await this.read("get_challenge_count"));
  }

  async getSpec(specId: number): Promise<SpecRecord> {
    return (await this.read("get_spec", [BigInt(specId)])) as unknown as SpecRecord;
  }

  async getChallenge(challengeId: number): Promise<ChallengeRecord> {
    return (await this.read("get_challenge", [BigInt(challengeId)])) as unknown as ChallengeRecord;
  }

  async getEvidenceSnapshot(snapshotId: string): Promise<EvidenceSnapshot> {
    return (await this.read("get_evidence_snapshot", [snapshotId])) as unknown as EvidenceSnapshot;
  }

  async verifyEvidenceSnapshot(snapshotId: string): Promise<boolean> {
    return Boolean(await this.read("verify_evidence_snapshot", [snapshotId]));
  }

  async connectWallet(): Promise<string> {
    const provider = requireProvider();
    const accounts = await walletAccounts(provider);
    if (!accounts[0]) throw new Error("Wallet did not expose an account.");
    await switchWallet(provider, this.config);
    this.account = accounts[0];
    return this.account;
  }

  async syncWalletNetwork(): Promise<void> {
    await switchWallet(requireProvider(), this.config);
  }

  getPendingWrite(): PendingWrite | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(PENDING_WRITE_KEY);
    if (!raw) return null;
    let parsed: unknown;
    try { parsed = JSON.parse(raw); }
    catch { throw new Error("Outstanding-write journal is unreadable. Do not sign again."); }
    const pending = validatePendingWrite(parsed);
    if (pending.chainId !== this.config.chainId ||
        pending.contractAddress.toLowerCase() !== this.config.contractAddress.toLowerCase()) {
      throw new Error("An unresolved transaction belongs to another ProofSpec contract or chain. Reconcile it first.");
    }
    return pending;
  }

  private storePending(pending: PendingWrite): void {
    window.localStorage.setItem(PENDING_WRITE_KEY, JSON.stringify(pending));
  }

  private clearPending(): void {
    window.localStorage.removeItem(PENDING_WRITE_KEY);
  }

  private requireDurableJournal(): void {
    // Fail BEFORE requesting a signature when persistent storage is unavailable.
    const key = PENDING_WRITE_KEY + ":probe";
    window.localStorage.setItem(key, "ok");
    if (window.localStorage.getItem(key) !== "ok") {
      throw new Error("Cannot persist transaction tracking in this browser.");
    }
    window.localStorage.removeItem(key);
  }

  private async assertActiveWallet(provider: WalletProvider, expected: string): Promise<void> {
    const [accounts, chain] = await Promise.all([
      provider.request({ method: "eth_accounts" }),
      provider.request({ method: "eth_chainId" })
    ]);
    checkWalletIdentity(accounts, chain, expected, this.config.chainId);
  }

  private async observe(intent: WriteIntent, before?: ObservedWriteState): Promise<ObservedWriteState> {
    switch (intent.kind) {
      case "create_spec": {
        const count = await this.getSpecCount();
        return before ? { specCount: count, spec: count > 0 ? await this.getSpec(count) : undefined } : {specCount: count};
      }
      case "evaluate_spec":
        return { spec: await this.getSpec(intent.args[0]) };
      case "open_challenge": {
        const [spec, count] = await Promise.all([this.getSpec(intent.args[0]), this.getChallengeCount()]);
        return before
          ? { spec, challengeCount: count,
              challenge: spec.pending_challenge_id ? await this.getChallenge(spec.pending_challenge_id) : undefined }
          : { spec, challengeCount: count };
      }
      case "resolve_challenge": {
        const challenge = await this.getChallenge(intent.args[0]);
        return { challenge, spec: await this.getSpec(challenge.spec_id) };
      }
    }
  }

  private async reconcile(
    pending: PendingWrite,
    onPhase: (phase: WritePhase, detail?: string) => void
  ): Promise<WriteResult> {
    if (!pending.hash) {
      throw new UncertainWriteError(
        "Signing/broadcast outcome is unknown and no transaction hash was returned. Inspect wallet history before any new write."
      );
    }
    if (!/^0x[0-9a-f]{64}$/i.test(pending.hash)) {
      throw new UncertainWriteError("Outstanding transaction hash is malformed. Do not resubmit.", pending.hash);
    }
    // SDK Hash has a 66-character literal-length constraint, beyond `0x${string}`.
    // This assertion is safe only after the strict 32-byte hexadecimal check above.
    const hash = pending.hash as Parameters<typeof this.readClient.waitForTransactionReceipt>[0]["hash"];
    onPhase("finalizing", hash);
    let receipt: Awaited<ReturnType<typeof this.readClient.waitForTransactionReceipt>>;
    try {
      receipt = await this.readClient.waitForTransactionReceipt({
        hash, waitUntil: "finalized", fullTransaction: true
      });
    } catch {
      throw new UncertainWriteError(
        "Transaction " + hash + " has not been reconciled. Resume verification; do not submit again.", hash
      );
    }
    const execution = classifyFinalizedExecution(receipt);
    if (execution === "FAILED") {
      // Definitive finalized execution failure: this tx cannot have applied its write.
      this.clearPending();
      onPhase("failed", hash);
      throw new Error("Finalized GenVM execution was not successful: " +
        String(receipt.txExecutionResultName) + " (" + hash + ")");
    }
    if (execution !== "SUCCEEDED" || !isSuccessful(receipt)) {
      throw new UncertainWriteError("GenVM execution result is not proven successful for " +
        hash + ". Resume verification; do not submit again.", hash);
    }
    onPhase("verifying", "Checking expected finalized contract state for " + hash);
    try {
      const after = await this.observe(pending.intent, pending.before);
      verifyWriteTransition(pending.intent, pending.before, after, pending.account);
    } catch {
      throw new UncertainWriteError(
        "GenVM returned successfully but the expected finalized contract transition is not verified yet. Resume " + hash +
        "; do not submit again.", hash
      );
    }
    this.clearPending();
    onPhase("finalized", hash);
    return { hash, receipt };
  }

  async resumePendingWrite(
    onPhase: (phase: WritePhase, detail?: string) => void
  ): Promise<WriteResult> {
    const pending = this.getPendingWrite();
    if (!pending) throw new Error("No outstanding transaction is recorded.");
    return this.reconcile(pending, onPhase);
  }

  async submitWrite(
    intent: WriteIntent,
    onPhase: (phase: WritePhase, detail?: string) => void
  ): Promise<WriteResult> {
    const provider = requireProvider();
    onPhase("requesting-wallet");
    this.requireDurableJournal();
    if (this.getPendingWrite()) {
      throw new Error("An earlier transaction is unresolved. Resume it before signing another.");
    }
    if (!this.account) {
      const accounts = await walletAccounts(provider);
      if (!accounts[0]) throw new Error("Wallet did not expose an account.");
      this.account = accounts[0];
    }
    await switchWallet(provider, this.config);
    await this.assertActiveWallet(provider, this.account);
    const before = await this.observe(intent);
    // These asynchronous reads may take time: revalidate immediately before signing.
    await this.assertActiveWallet(provider, this.account);
    if (this.getPendingWrite()) throw new Error("An earlier transaction is unresolved.");
    const pending: PendingWrite = {
      version: 1, hash: null, chainId: this.config.chainId,
      contractAddress: this.config.contractAddress, account: this.account,
      intent, before, submittedAt: new Date().toISOString()
    };
    // Journal the intent before a potentially ambiguous wallet/broadcast response.
    this.storePending(pending);
    onPhase("submitting");
    const writeClient = createClient({
      chain: sdkChainFor(this.config.network), endpoint: this.config.rpcUrl,
      account: this.account as `0x${string}`,
      provider: provider as NonNullable<Parameters<typeof createClient>[0]>["provider"]
    });
    let rawHash: unknown;
    try {
      rawHash = await writeClient.writeContract({
        address: this.config.contractAddress,
        functionName: intent.functionName,
        args: productionArgs(intent)
      });
    } catch (error) {
      const rejection = typeof error === "object" && error !== null && "code" in error
        && Number((error as {code: unknown}).code) === 4001;
      if (rejection) {
        this.clearPending();
        throw error;
      }
      throw new UncertainWriteError(
        "Wallet/broadcast outcome is unknown. Inspect wallet transactions before signing again."
      );
    }
    const hash = String(rawHash);
    if (!/^0x[0-9a-f]{64}$/i.test(hash)) {
      throw new UncertainWriteError("The wallet returned an invalid transaction ID: " + hash);
    }
    // Do not erase the provisional journal if persistence fails after broadcast.
    try { this.storePending({...pending,hash}); }
    catch { throw new UncertainWriteError("Submitted transaction " + hash +
      " but could not persist its ID. Preserve this ID and reconcile manually.", hash); }
    onPhase("submitted", hash);
    return this.reconcile({...pending,hash}, onPhase);
  }

}

type JsonRpcResponse<T> = {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string };
};

class MockRpcProofSpecGateway implements ProofSpecGateway {
  private readonly config: Extract<RuntimeConfig, { configured: true }>;
  private rpcId = 0;
  private account: string | null = null;

  constructor(config: Extract<RuntimeConfig, { configured: true }>) {
    this.config = config;
  }

  private async rpc<T>(method: string, params: unknown[] = []): Promise<T> {
    this.rpcId += 1;
    const response = await fetch(this.config.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: this.rpcId,
        method,
        params
      })
    });

    const payload = (await response.json()) as JsonRpcResponse<T>;
    if (!response.ok || payload.error) {
      throw new Error(payload.error?.message || `Mock RPC failed: ${response.status}`);
    }
    return payload.result as T;
  }

  async getSpecCount(): Promise<number> {
    return this.rpc<number>("proofspec_getSpecCount");
  }

  async getChallengeCount(): Promise<number> {
    return this.rpc<number>("proofspec_getChallengeCount");
  }

  async getSpec(specId: number): Promise<SpecRecord> {
    return this.rpc<SpecRecord>("proofspec_getSpec", [specId]);
  }

  async getChallenge(challengeId: number): Promise<ChallengeRecord> {
    return this.rpc<ChallengeRecord>("proofspec_getChallenge", [challengeId]);
  }

  async getEvidenceSnapshot(snapshotId: string): Promise<EvidenceSnapshot> {
    return this.rpc<EvidenceSnapshot>("proofspec_getEvidenceSnapshot", [snapshotId]);
  }

  async verifyEvidenceSnapshot(snapshotId: string): Promise<boolean> {
    return this.rpc<boolean>("proofspec_verifyEvidenceSnapshot", [snapshotId]);
  }

  async connectWallet(): Promise<string> {
    const provider = requireProvider();
    const accounts = await walletAccounts(provider);
    if (!accounts[0]) throw new Error("Wallet did not expose an account.");
    await switchWallet(provider, this.config);
    this.account = accounts[0];
    return this.account;
  }

  async syncWalletNetwork(): Promise<void> {
    await switchWallet(requireProvider(), this.config);
  }

  getPendingWrite(): PendingWrite | null { return null; }

  async resumePendingWrite(): Promise<WriteResult> {
    throw new Error("Mock RPC has no live GenLayer transaction to resume.");
  }

  async submitWrite(
    intent: WriteIntent,
    onPhase: (phase: WritePhase, detail?: string) => void
  ): Promise<WriteResult> {
    const provider = requireProvider();
    onPhase("requesting-wallet");

    if (!this.account) {
      const accounts = await walletAccounts(provider);
      if (!accounts[0]) throw new Error("Wallet did not expose an account.");
      this.account = accounts[0];
    }

    await switchWallet(provider, this.config);
    onPhase("submitting");

    const walletHash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: this.account,
          to: this.config.contractAddress,
          data: "0x",
          value: "0x0"
        }
      ]
    });

    const hash = String(walletHash);
    await this.rpc("proofspec_applyWrite", [intent, hash, this.account]);
    onPhase("submitted", hash);
    onPhase("finalizing", "Waiting for mocked finalized state");
    const receipt = await this.rpc("proofspec_waitFinalized", [hash]);
    onPhase("finalized", "MOCK MODE ONLY: " + hash);
    return { hash, receipt };
  }
}

export function createProofSpecGateway(
  config: Extract<RuntimeConfig, { configured: true }>
): ProofSpecGateway {
  return config.mockMode
    ? new MockRpcProofSpecGateway(config)
    : new GenLayerProofSpecGateway(config);
}
