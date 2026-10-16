import type { Metadata } from "next";
import { ProofSpecProvider } from "@/components/ProofSpecProvider";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofSpec — Semantic release certification",
  description: "Challengeable, consensus-backed software release certification on GenLayer."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ProofSpecProvider>
          <div className="page-shell">
            <Header />
            {children}
            <footer>
              <span>ProofSpec · bounded evidence, explicit uncertainty.</span>
              <span>Progress 4 local frontend candidate</span>
            </footer>
          </div>
        </ProofSpecProvider>
      </body>
    </html>
  );
}
