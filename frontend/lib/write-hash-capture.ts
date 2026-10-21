/** Capture an injected wallet hash before GenLayer SDK receipt polling starts. */
export type HashCaptureProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

export function captureSubmittedHash<T extends HashCaptureProvider>(
  original: T,
  onHash: (hash: string) => void
): HashCaptureProvider {
  let sendAttempted = false;
  return {
    async request(args) {
      // A single SDK write must never invoke the wallet twice, even concurrently.
      if (args.method === "eth_sendTransaction") {
        if (sendAttempted) {
          throw new Error("A second wallet broadcast was attempted; do not resubmit.");
        }
        sendAttempted = true;
      }
      const result = await original.request(args);
      if (args.method !== "eth_sendTransaction") return result;
      if (typeof result !== "string" || !/^0x[0-9a-f]{64}$/i.test(result)) {
        throw new Error("Wallet returned an invalid transaction hash; do not resubmit.");
      }
      onHash(result);
      return result;
    }
  };
}
