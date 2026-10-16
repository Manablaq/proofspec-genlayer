import { describe, expect, it } from "vitest";
import { DuplicateWriteError, WriteLock, reviewRows } from "@/lib/write-safety";
import type { WriteIntent } from "@/lib/types";

describe("write safety", () => {
  it("rejects a duplicate concurrent write", async () => {
    const lock = new WriteLock();
    let release: (() => void) | undefined;

    const first = lock.run(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );

    await expect(lock.run(async () => undefined)).rejects.toBeInstanceOf(
      DuplicateWriteError
    );

    release?.();
    await first;
    expect(lock.locked).toBe(false);
  });

  it("always exposes method, purpose, and arguments for pre-sign review", () => {
    const intent: WriteIntent = {
      kind: "evaluate_spec",
      functionName: "evaluate_spec",
      args: [7],
      summary: "Evaluate specification #7"
    };
    expect(reviewRows(intent)).toEqual([
      ["Method", "evaluate_spec"],
      ["Purpose", "Evaluate specification #7"],
      ["Arguments", "[7]"]
    ]);
  });
});
