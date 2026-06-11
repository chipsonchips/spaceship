/**
 * User-friendly error message mapping for frontend
 * Converts technical wallet/blockchain errors into clear, actionable messages
 */

export function getUserFriendlyErrorMessage(error: unknown): string {
    const errorMsg =
        (error as Error).message || (error as any)?.shortMessage || String(error);
    const errorLower = errorMsg.toLowerCase();

    // User rejected transaction
    if (
        errorLower.includes("user rejected") ||
        errorLower.includes("user denied") ||
        errorLower.includes("user cancelled")
    ) {
        return "Transaction cancelled. You rejected the transaction in your wallet.";
    }

    // Nonce errors
    if (
        errorLower.includes("nonce") ||
        errorLower.includes("nonce too low") ||
        errorLower.includes("nonce has already been used")
    ) {
        return "Your transaction is being processed. Please wait a moment and try again.";
    }

    // Network/RPC errors
    if (
        errorLower.includes("network") ||
        errorLower.includes("timeout") ||
        errorLower.includes("connection") ||
        errorLower.includes("fetch failed")
    ) {
        return "Network connection issue. Please check your connection and try again.";
    }

    // Gas/fee errors
    if (
        errorLower.includes("gas") ||
        errorLower.includes("insufficient funds for gas") ||
        errorLower.includes("intrinsic gas too low")
    ) {
        return "Insufficient ETH for gas fees. Please add ETH to your wallet.";
    }

    // Balance errors
    if (
        errorLower.includes("insufficient") &&
        (errorLower.includes("balance") ||
            errorLower.includes("funds") ||
            errorLower.includes("allowance"))
    ) {
        return "Insufficient USDC balance. Please add more USDC to your wallet.";
    }

    // Contract/blockchain errors
    if (errorLower.includes("revert") || errorLower.includes("execution reverted")) {
        // Try to extract revert reason if available
        const reasonMatch = errorMsg.match(/reason[:\s]+([^,\n]+)/i);
        if (reasonMatch && reasonMatch[1]) {
            return `Transaction failed: ${reasonMatch[1].trim()}`;
        }
        return "Transaction failed. The blockchain rejected this action.";
    }

    // Wallet not connected
    if (
        errorLower.includes("wallet not connected") ||
        errorLower.includes("no wallet client")
    ) {
        return "Please connect your wallet to continue.";
    }

    // Switch network
    if (errorLower.includes("chain") || errorLower.includes("network mismatch")) {
        return "Please switch to the correct network in your wallet.";
    }

    // Transaction timeout
    if (errorLower.includes("timeout") || errorLower.includes("timed out")) {
        return "Transaction timed out. Please try again.";
    }

    // Generic fallback for unknown errors
    if (errorMsg.length > 200) {
        // Long error messages are usually technical - provide simple message
        return "An error occurred. Please try again or contact support if the problem persists.";
    }

    // Return original message if it's already user-friendly (short and clear)
    return errorMsg;
}

/**
 * Check if an error is transient and worth retrying automatically
 */
export function isTransientError(error: unknown): boolean {
    const errorMsg =
        (error as Error).message || (error as any)?.shortMessage || String(error);
    const errorLower = errorMsg.toLowerCase();

    return (
        errorLower.includes("nonce") ||
        errorLower.includes("network") ||
        errorLower.includes("timeout") ||
        errorLower.includes("connection")
    );
}
