import { createClient } from "genlayer-js";
import {
  TransactionHashVariant,
  TransactionStatus,
  type CalldataEncodable
} from "genlayer-js/types";
import { sdkChainFor } from "@/lib/network";
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

    const writeClient = createClient({
      chain: sdkChainFor(this.config.network),
      endpoint: this.config.rpcUrl,
      account: this.account as `0x${string}`,
      provider: provider as NonNullable<Parameters<typeof createClient>[0]>["provider"]
    });

    const hash = await writeClient.writeContract({
      address: this.config.contractAddress,
      functionName: intent.functionName,
      args: productionArgs(intent)
    });

    onPhase("submitted", String(hash));
    onPhase("finalizing", "Waiting for GenLayer finality");

    const receipt = await writeClient.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
      fullTransaction: false
    });

    onPhase("finalized", String(hash));
    return { hash: String(hash), receipt };
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
    onPhase("finalized", hash);
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
