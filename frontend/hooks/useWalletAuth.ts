"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useAuth } from "@/context/AuthContext";

/**
 * Hook that automatically logs in user when wallet connects
 * Watches for wallet connection and calls backend login endpoint
 */
export function useWalletAuth() {
    const { address, isConnected } = useAccount();
    const { user, loginWithWallet, isLoading } = useAuth();

    useEffect(() => {
        // Only login if:
        // 1. Wallet is connected
        // 2. We have an address
        // 3. User is not already authenticated
        // 4. We're not already loading
        if (isConnected && address && !user && !isLoading) {
            loginWithWallet(address).catch((error) => {
                console.error("Wallet login failed:", error);
            });
        }
    }, [isConnected, address, user, isLoading, loginWithWallet]);

    return { isConnected, address, user };
}
