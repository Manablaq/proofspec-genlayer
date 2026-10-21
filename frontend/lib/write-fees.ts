/** Deposit guard for ProofSpec R82; this is NOT a final consumed-fee estimate. */
export const MAX_PROOFSPEC_FEE_WEI = 1_000_000_000_000_000n; // 0.001 GEN

export function validateWriteFeeQuote(value: bigint | string | number, distribution: unknown): bigint {
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new Error("Unsafe numeric fee deposit; refusing wallet submission.");
  }
  let fee: bigint;
  try { fee = BigInt(value); }
  catch { throw new Error("Invalid fee deposit; refusing wallet submission."); }
  if (!distribution || typeof distribution !== "object" || Array.isArray(distribution)) {
    throw new Error("Missing GenLayer fee distribution; refusing wallet submission.");
  }
  if (fee <= 0n) throw new Error("Fee deposit must be positive; refusing wallet submission.");
  if (fee > MAX_PROOFSPEC_FEE_WEI) {
    throw new Error("Estimated deposit exceeds 0.001 GEN safety limit; measure and approve a method-specific cap before signing.");
  }
  return fee;
}
