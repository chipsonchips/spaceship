/**
 * User-friendly error message mapping
 * Converts technical blockchain and system errors into clear, actionable messages
 */

export function getUserFriendlyErrorMessage(error: unknown): string {
    const errorMsg = (error as Error).message || String(error);
    const errorLower = errorMsg.toLowerCase();

    // Nonce errors - Most common blockchain error
    if (
        errorLower.includes('nonce') ||
        errorLower.includes('nonce too low') ||
        errorLower.includes('nonce has already been used') ||
        errorLower.includes('nonce_expired')
    ) {
        return 'Your transaction is being processed. Please wait a moment and try again.';
    }

    // Network/RPC errors
    if (
        errorLower.includes('network') ||
        errorLower.includes('timeout') ||
        errorLower.includes('connection') ||
        errorLower.includes('fetch')
    ) {
        return 'Network connection issue. Please check your connection and try again.';
    }

    // Gas/fee errors
    if (
        errorLower.includes('gas') ||
        errorLower.includes('fee') ||
        errorLower.includes('insufficient funds for gas')
    ) {
        return 'Transaction fee error. Please ensure you have enough ETH for gas fees.';
    }

    // Balance errors
    if (
        errorLower.includes('insufficient') &&
        (errorLower.includes('balance') || errorLower.includes('funds'))
    ) {
        return 'Insufficient balance. Please deposit more USDC to your game account.';
    }

    // Contract/blockchain errors
    if (errorLower.includes('revert') || errorLower.includes('execution reverted')) {
        return 'Transaction failed. The blockchain rejected this action. Please try again.';
    }

    // Betting phase errors
    if (errorLower.includes('betting closed') || errorLower.includes('betting is closed')) {
        return 'Betting is closed. Please wait for the next round to start.';
    }

    // Duplicate bet errors
    if (errorLower.includes('already placed') || errorLower.includes('duplicate bet')) {
        return 'You already have an active bet in this round.';
    }

    // Cashout errors
    if (errorLower.includes('already cashed out')) {
        return 'You have already cashed out this bet.';
    }

    if (errorLower.includes('cannot cash out')) {
        return 'Cannot cash out at this time. The plane may have already crashed.';
    }

    // Validation errors
    if (errorLower.includes('minimum') || errorLower.includes('must be at least')) {
        return errorMsg; // Keep original message as it's already clear
    }

    if (errorLower.includes('maximum') || errorLower.includes('exceeds')) {
        return errorMsg; // Keep original message as it's already clear
    }

    // Authentication errors
    if (errorLower.includes('unauthorized') || errorLower.includes('authentication')) {
        return 'Please connect your wallet to continue.';
    }

    // Free bet errors
    if (errorLower.includes('free bet')) {
        return errorMsg; // Keep original message as it's already clear
    }

    // Account restriction errors
    if (
        errorLower.includes('suspended') ||
        errorLower.includes('banned') ||
        errorLower.includes('under review')
    ) {
        return errorMsg; // Keep original message as it's important
    }

    // Generic fallback for unknown errors
    if (errorMsg.length > 200) {
        return 'An error occurred. Please try again or contact support if the problem persists.';
    }

    // Return original message if it's already user-friendly (short and clear)
    return errorMsg;
}

/**
 * Check if an error is a nonce-related error
 */
export function isNonceError(error: unknown): boolean {
    const errorMsg = (error as Error).message || String(error);
    const errorLower = errorMsg.toLowerCase();

    return (
        errorLower.includes('nonce') ||
        errorLower.includes('nonce too low') ||
        errorLower.includes('nonce has already been used') ||
        errorLower.includes('nonce_expired')
    );
}

/**
 * Check if an error is transient and worth retrying
 */
export function isTransientError(error: unknown): boolean {
    const errorMsg = (error as Error).message || String(error);
    const errorLower = errorMsg.toLowerCase();

    return (
        isNonceError(error) ||
        errorLower.includes('network') ||
        errorLower.includes('timeout') ||
        errorLower.includes('connection') ||
        errorLower.includes('temporary')
    );
}
