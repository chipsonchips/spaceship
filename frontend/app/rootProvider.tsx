"use client";
import { ReactNode } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  WagmiProvider,
  http,
  createConfig,
  type CreateConnectorFn,
} from "wagmi";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import "@coinbase/onchainkit/styles.css";
import { SUPPORTED_CHAINS, CHAIN_CONFIGS } from "@/lib/chains";
import { AuthProvider } from "@/context/AuthContext";
import UsernamePrompt from "@/components/auth/UsernamePrompt";
import WalletAuthManager from "@/components/auth/WalletAuthManager";

const queryClient = new QueryClient();

const isMiniPay =
  typeof window !== "undefined" &&
  window.ethereum &&
  (window.ethereum as any).isMiniPay;

const connectors: CreateConnectorFn[] = [injected({ target: "metaMask" })];

if (!isMiniPay) {
  connectors.push(
    coinbaseWallet({
      appName: "Aviator",
      preference: "all",
    }),
  );

  if (typeof window !== "undefined") {
    connectors.push(
      walletConnect({
        projectId:
          process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
        metadata: {
          name: "Aviator",
          description: "Aviator - Multiply your fund with fun",
          url: process.env.NEXT_PUBLIC_URL || "https://aviator-sand.vercel.app",
          icons: ["https://aviator-sand.vercel.app/logo.png"],
        },
        showQrModal: true,
      }),
    );
  }
}

// Build transports map from all supported chains
const transports = Object.fromEntries(
  SUPPORTED_CHAINS.map((chain) => [chain.id, http()]),
);

const wagmiConfig = createConfig({
  ssr: true,
  chains: SUPPORTED_CHAINS as [
    (typeof SUPPORTED_CHAINS)[0],
    ...typeof SUPPORTED_CHAINS,
  ],
  connectors,
  transports,
});

export function RootProvider({ children }: { children: ReactNode }) {
  // If we are in minipay, we can skip the OnchainKitProvider wrapper to satisfy requirement
  // without breaking hydration as MiniPay renders strictly client-side within the wallet browser.
  if (isMiniPay) {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <WalletAuthManager />
            {children}
            <UsernamePrompt />
          </AuthProvider>
        </QueryClientProvider>
      </WagmiProvider>
    );
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
          config={{
            appearance: {
              mode: "auto",
            },
            wallet: {
              display: "modal",
              preference: "all",
            },
          }}
        >
          <AuthProvider>
            <WalletAuthManager />
            {children}
            <UsernamePrompt />
          </AuthProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
