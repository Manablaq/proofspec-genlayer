export function shortAddress(value: string): string {
  if (value.length < 13) return value;
  return `${value.slice(0, 7)}…${value.slice(-5)}`;
}

export function shortHash(value: string): string {
  if (!value) return "—";
  if (value.length < 18) return value;
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

export function resultTone(value: string): "good" | "bad" | "warn" | "neutral" {
  if (value === "CERTIFIED" || value === "SATISFIED" || value === "VERIFIED") return "good";
  if (value === "REJECTED" || value === "VIOLATED" || value === "INVALID") return "bad";
  if (value === "INSUFFICIENT" || value === "UNRESOLVED" || value === "PENDING") return "warn";
  return "neutral";
}
