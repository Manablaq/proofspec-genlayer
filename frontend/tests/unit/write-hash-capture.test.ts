import { describe, expect, it, vi } from "vitest";
import { captureSubmittedHash } from "@/lib/write-hash-capture";

const HASH = "0x" + "a".repeat(64);

describe("R89 immediate wallet hash capture", () => {
  it("persists the hash before any downstream receipt waiting", async () => {
    const events: string[] = [];
    const provider = captureSubmittedHash({request: async () => {
      events.push("provider-return"); return HASH;
    }}, (hash) => { expect(hash).toBe(HASH); events.push("journal-saved"); });
    const returned = await provider.request({method:"eth_sendTransaction",params:[{}]});
    events.push("sdk-can-now-wait-for-receipt");
    expect(returned).toBe(HASH);
    expect(events).toEqual(["provider-return","journal-saved","sdk-can-now-wait-for-receipt"]);
  });
  it("does not journal reads or wallet chain checks", async () => {
    const onHash = vi.fn();
    const provider = captureSubmittedHash({request: async () => "0xf22d"}, onHash);
    expect(await provider.request({method:"eth_chainId"})).toBe("0xf22d");
    expect(onHash).not.toHaveBeenCalled();
  });
  it("refuses malformed transaction IDs and duplicate send requests", async () => {
    const onHash=vi.fn();
    const invalid=captureSubmittedHash({request: async () => "not-a-hash"}, onHash);
    await expect(invalid.request({method:"eth_sendTransaction"})).rejects.toThrow("invalid transaction hash");
    expect(onHash).not.toHaveBeenCalled();
    const valid=captureSubmittedHash({request: async () => HASH}, onHash);
    await valid.request({method:"eth_sendTransaction"});
    await expect(valid.request({method:"eth_sendTransaction"})).rejects.toThrow("second wallet broadcast");
    expect(onHash).toHaveBeenCalledTimes(1);
  });
  it("preserves wallet failures without inventing a hash", async () => {
    const onHash=vi.fn();
    const provider=captureSubmittedHash({request: async () => {throw new Error("wallet rejected");}},onHash);
    await expect(provider.request({method:"eth_sendTransaction"})).rejects.toThrow("wallet rejected");
    expect(onHash).not.toHaveBeenCalled();
  });
});
