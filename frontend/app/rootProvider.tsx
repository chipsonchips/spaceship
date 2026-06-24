"use client";
import { ReactNode } from "react";
import { base, mainnet, celo } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  WagmiProvider,
  http,
  createConfig,
  type CreateConnectorFn,
} from "wagmi";
import { createPublicClient } from "viem";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import "@coinbase/onchainkit/styles.css";
import { SUPPORTED_CHAINS, CHAIN_CONFIGS } from "@/lib/chains";
import { AuthProvider } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import UsernamePrompt from "@/components/auth/UsernamePrompt";
import WalletAuthManager from "@/components/auth/WalletAuthManager";

const queryClient = new QueryClient();

const isMiniPay =
  typeof window !== "undefined" &&
  window.ethereum &&
  (window.ethereum as any).isMiniPay;

// For MiniPay, use injected connector without target specification to auto-detect
// For other environments, include MetaMask as a fallback
const connectors: CreateConnectorFn[] = isMiniPay
  ? [injected()]
  : [injected({ target: "metaMask" })];

if (!isMiniPay) {
  connectors.push(
    coinbaseWallet({
      appName: "Spaceship",
      preference: "all",
    }),
  );

  if (typeof window !== "undefined") {
    connectors.push(
      walletConnect({
        projectId:
          process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
        metadata: {
          name: "Spaceship",
          description: "Spaceship - Multiply your fund with fun",
          url:
            process.env.NEXT_PUBLIC_URL || "https://spaceship-sand.vercel.app",
          icons: ["https://spaceship-sand.vercel.app/logo.png"],
        },
        showQrModal: true,
      }),
    );
  }
}

// Build transports map with high-quality RPC endpoints to prevent CORS issues
const transports = {
  [base.id]: http("https://mainnet.base.org"),
  [celo.id]: http("https://forno.celo.org"),
  [mainnet.id]: http("https://cloudflare-eth.com"),
};

const wagmiConfig = createConfig({
  ssr: true,
  chains: [base, celo, mainnet] as const,
  connectors,
  transports,
});

// OnchainKit's Identity components (Avatar/Name) resolve ENS on Ethereum
// mainnet. Without an explicit client they fall back to the chain's default
// public RPC (eth.merkle.io), which rate-limits (429) and blocks CORS. Give
// OnchainKit a reliable mainnet client so identity resolution doesn't fail.
const defaultPublicClients = {
  [mainnet.id]: createPublicClient({
    chain: mainnet,
    transport: http("https://cloudflare-eth.com"),
  }),
};

export function RootProvider({ children }: { children: ReactNode }) {
  if (isMiniPay) {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <SettingsProvider>
            <AuthProvider>
              <WalletAuthManager />
              {children}
              <UsernamePrompt />
            </AuthProvider>
          </SettingsProvider>
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
          defaultPublicClients={defaultPublicClients}
          config={{
            appearance: {
              mode: "dark",
            },
            wallet: {
              display: "modal",
              preference: "all",
            },
          }}
        >
          <SettingsProvider>
            <AuthProvider>
              <WalletAuthManager />
              {children}
              <UsernamePrompt />
            </AuthProvider>
          </SettingsProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
