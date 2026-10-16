import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("GenLayer SDK binding guards", () => {
  it("forces finalized reads and finalized post-write waiting", async () => {
    const source = await readFile(resolve("lib/gateway.ts"), "utf8");
    expect(source).toContain("TransactionHashVariant.LATEST_FINAL");
    expect(source).toContain("TransactionStatus.FINALIZED");
    expect(source).not.toContain("LATEST_NONFINAL");
  });

  it("has no private-key account generation path", async () => {
    const source = await readFile(resolve("lib/gateway.ts"), "utf8");
    expect(source).not.toContain("generatePrivateKey");
    expect(source).not.toContain("createAccount(");
    expect(source).toContain("eth_requestAccounts");
  });
});
