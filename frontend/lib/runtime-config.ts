import type { NetworkName, RuntimeConfig } from "@/lib/types";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

const NETWORKS = {
  "studio-dev": {
    chainId: 61997,
    rpcUrl: "https://studio-dev.genlayer.com/api",
    explorerUrl: "https://explorer-studio-dev.genlayer.com"
  },
  bradbury: {
    chainId: 4221,
    rpcUrl: "https://rpc-bradbury.genlayer.com",
    explorerUrl: "https://explorer-bradbury.genlayer.com"
  }
} as const;

export function isNetworkName(value: string | undefined): value is NetworkName {
  return value === "studio-dev" || value === "bradbury";
}

function isAllowedRpcUrl(value: string, mockMode: boolean): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:") return true;
    return mockMode && parsed.protocol === "http:" &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");
  } catch {
    return false;
  }
}

export function resolveRuntimeConfig(env: Record<string, string | undefined>): RuntimeConfig {
  const rawNetwork = env.PROOFSPEC_NETWORK;
  const rawAddress = env.PROOFSPEC_CONTRACT_ADDRESS;
  const mockMode = env.PROOFSPEC_E2E_MOCK === "1";

  if (!isNetworkName(rawNetwork)) {
    return {
      configured: false,
      network: null,
      contractAddress: null,
      rpcUrl: null,
      chainId: null,
      explorerUrl: null,
      mockMode: false,
      error: "Contract not configured: choose studio-dev or bradbury."
    };
  }

  const network = NETWORKS[rawNetwork];
  if (!rawAddress || !ADDRESS_RE.test(rawAddress)) {
    return {
      configured: false,
      network: rawNetwork,
      contractAddress: null,
      rpcUrl: null,
      chainId: network.chainId,
      explorerUrl: network.explorerUrl,
      mockMode: false,
      error: "Contract not configured: a valid deployed contract address is required."
    };
  }

  const rpcUrl = env.PROOFSPEC_RPC_URL || network.rpcUrl;
  if (!isAllowedRpcUrl(rpcUrl, mockMode)) {
    return {
      configured: false,
      network: rawNetwork,
      contractAddress: null,
      rpcUrl: null,
      chainId: network.chainId,
      explorerUrl: network.explorerUrl,
      mockMode: false,
      error: "Contract not configured: RPC URL must be HTTPS."
    };
  }

  return {
    configured: true,
    network: rawNetwork,
    contractAddress: rawAddress as `0x${string}`,
    rpcUrl,
    chainId: network.chainId,
    explorerUrl: network.explorerUrl,
    mockMode,
    error: null
  };
}

export function networkLabel(network: NetworkName | null): string {
  if (network === "studio-dev") return "Studio Devnet";
  if (network === "bradbury") return "Bradbury Testnet";
  return "Unconfigured";
}
