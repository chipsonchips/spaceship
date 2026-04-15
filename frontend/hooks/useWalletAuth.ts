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
        console.log("useWalletAuth effect:", {
            isConnected,
            address,
            hasUser: !!user,
            isLoading,
        });

        if (isConnected && address && !user && !isLoading) {
            console.log("Calling loginWithWallet for address:", address);
            loginWithWallet(address).catch((error) => {
                console.error("Wallet login failed:", error);
            });
        }
    }, [isConnected, address, user, isLoading, loginWithWallet]);

    return { isConnected, address, user };
}
