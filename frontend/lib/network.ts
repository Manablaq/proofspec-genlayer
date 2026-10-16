import { studioDevnet, testnetBradbury } from "genlayer-js/chains";
import type { NetworkName } from "@/lib/types";

export function sdkChainFor(network: NetworkName) {
  return network === "studio-dev" ? studioDevnet : testnetBradbury;
}
