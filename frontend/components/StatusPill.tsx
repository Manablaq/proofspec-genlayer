import { resultTone } from "@/lib/format";

export function StatusPill({ value }: { value: string }) {
  return <span className={`status-pill status-${resultTone(value)}`}>{value}</span>;
}
