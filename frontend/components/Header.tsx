"use client";

import Link from "next/link";
import { networkLabel } from "@/lib/runtime-config";
import { shortAddress } from "@/lib/format";
import { useProofSpec } from "@/components/ProofSpecProvider";

export function Header() {
  const { config, walletAddress, connectWallet, syncWalletNetwork, loading } = useProofSpec();

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="ProofSpec home">
        <span className="brand-mark" aria-hidden="true">P</span>
        <span>
          <strong>ProofSpec</strong>
          <small>semantic release certification</small>
        </span>
      </Link>

      <div className="header-actions">
        <span className="network-chip" data-testid="network-chip">
          <span className="network-dot" aria-hidden="true" />
          {loading ? "Checking network…" : networkLabel(config?.network ?? null)}
          {config?.configured ? ` · ${config.chainId}` : ""}
        </span>

        {walletAddress ? (
          <>
            <button className="button button-quiet" onClick={() => void syncWalletNetwork()}>
              Sync network
            </button>
            <span className="wallet-chip" data-testid="wallet-address">
              {shortAddress(walletAddress)}
            </span>
          </>
        ) : (
          <button
            className="button button-primary"
            onClick={() => void connectWallet()}
            disabled={!config?.configured}
          >
            Connect wallet
          </button>
        )}
      </div>
    </header>
  );
}
