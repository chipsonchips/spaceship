"use client";

import { useEffect, useRef } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useAuth } from "@/context/AuthContext";

/**
 * Global manager that monitors wallet connection and handles authentication.
 * It automatically logs in when a wallet connects and handles address switching.
 */
export default function WalletAuthManager() {
  const { address, isConnected } = useAccount();
  const { user, loginWithWallet, logout, isLoading } = useAuth();
  const { disconnect } = useDisconnect();
  const lastProcessedAddress = useRef<string | undefined>(undefined);

  useEffect(() => {
    // 1. Handle disconnection
    if (!isConnected && user) {
      console.log("Wallet disconnected, logging out user:", user.id);
      logout();
      return;
    }

    // 2. Handle connection or address change
    if (isConnected && address) {
      console.log("WalletAuthManager: Wallet connected", {
        address,
        hasUser: !!user,
      });

      // If we have a user but it's a different address, logout first
      if (user && user.address?.toLowerCase() !== address.toLowerCase()) {
        console.log(
          "Wallet address mismatch, logging out old user and logging in new one",
          {
            old: user.address,
            new: address,
          },
        );
        logout();
        return; // Next effect run will handle the login
      }

      // If we don't have a user and we're not already loading, login
      if (!user && !isLoading && lastProcessedAddress.current !== address) {
        console.log(
          "WalletAuthManager: Attempting auto-login for address:",
          address,
        );
        lastProcessedAddress.current = address;
        loginWithWallet(address).catch((error) => {
          console.error("Auto-login failed:", error);
          lastProcessedAddress.current = undefined;
        });
      }
    } else if (!isConnected) {
      lastProcessedAddress.current = undefined;
    }
  }, [isConnected, address, user, isLoading, loginWithWallet, logout]);

  return null; // This component doesn't render anything
}
