import type { WriteIntent } from "@/lib/types";

export class DuplicateWriteError extends Error {
  constructor() {
    super("A ProofSpec write is already in progress.");
    this.name = "DuplicateWriteError";
  }
}

export class WriteLock {
  private active = false;

  get locked(): boolean {
    return this.active;
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.active) throw new DuplicateWriteError();
    this.active = true;
    try {
      return await operation();
    } finally {
      this.active = false;
    }
  }
}

export function reviewRows(intent: WriteIntent): Array<[string, string]> {
  return [
    ["Method", intent.functionName],
    ["Purpose", intent.summary],
    ["Arguments", JSON.stringify(intent.args)]
  ];
}
