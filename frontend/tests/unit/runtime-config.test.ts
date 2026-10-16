import { describe, expect, it } from "vitest";
import { resolveRuntimeConfig } from "@/lib/runtime-config";

describe("runtime configuration", () => {
  it("fails closed when contract address is absent", () => {
    const result = resolveRuntimeConfig({ PROOFSPEC_NETWORK: "studio-dev" });
    expect(result.configured).toBe(false);
    expect(result.error).toContain("Contract not configured");
  });

  it("binds Studio Devnet exactly", () => {
    const result = resolveRuntimeConfig({
      PROOFSPEC_NETWORK: "studio-dev",
      PROOFSPEC_CONTRACT_ADDRESS: "0x1111111111111111111111111111111111111111"
    });
    expect(result.configured).toBe(true);
    if (result.configured) {
      expect(result.chainId).toBe(61997);
      expect(result.rpcUrl).toBe("https://studio-dev.genlayer.com/api");
    }
  });

  it("binds Bradbury exactly", () => {
    const result = resolveRuntimeConfig({
      PROOFSPEC_NETWORK: "bradbury",
      PROOFSPEC_CONTRACT_ADDRESS: "0x1111111111111111111111111111111111111111"
    });
    expect(result.configured).toBe(true);
    if (result.configured) {
      expect(result.chainId).toBe(4221);
      expect(result.rpcUrl).toBe("https://rpc-bradbury.genlayer.com");
    }
  });

  it("rejects plain HTTP outside the explicit loopback E2E mock", () => {
    const result = resolveRuntimeConfig({
      PROOFSPEC_NETWORK: "bradbury",
      PROOFSPEC_CONTRACT_ADDRESS: "0x1111111111111111111111111111111111111111",
      PROOFSPEC_RPC_URL: "http://example.com/rpc"
    });
    expect(result.configured).toBe(false);
  });

  it("allows loopback HTTP only for explicit E2E mock mode", () => {
    const result = resolveRuntimeConfig({
      PROOFSPEC_NETWORK: "studio-dev",
      PROOFSPEC_CONTRACT_ADDRESS: "0x1111111111111111111111111111111111111111",
      PROOFSPEC_RPC_URL: "http://127.0.0.1:3100/api/mock-rpc",
      PROOFSPEC_E2E_MOCK: "1"
    });
    expect(result.configured).toBe(true);
    if (result.configured) expect(result.mockMode).toBe(true);
  });
});
