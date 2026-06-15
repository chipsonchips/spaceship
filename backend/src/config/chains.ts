/**
 * Backend chain registry — single source of truth for all supported chains.
 * Each entry maps a chain ID to its RPC URL and contract address,
 * resolved from environment variables.
 */

export interface BackendChainConfig {
    chainId: number;
    label: string;
    rpcUrl: string;
    contractAddress: string;
    usdcAddress: string;
    explorerUrl: string;
}

const CHAIN_REGISTRY: Record<string, BackendChainConfig> = {
    base: {
        chainId: 8453,
        label: "Base",
        rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
        contractAddress: process.env.BASE_SPACESHIP_CONTRACT_ADDRESS || "",
        usdcAddress:
            process.env.BASE_USDC_ADDRESS ||
            "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        explorerUrl: "https://basescan.org",
    },
    celo: {
        chainId: 42220,
        label: "Celo",
        rpcUrl: process.env.CELO_RPC_URL || "https://forno.celo.org",
        contractAddress: process.env.CELO_SPACESHIP_CONTRACT_ADDRESS || "",
        usdcAddress:
            process.env.CELO_USDC_ADDRESS ||
            "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
        explorerUrl: "https://celoscan.io",
    },
};

/**
 * Returns the chain config for a given chainId.
 * If no chainId is provided, throws an error (chainId must be provided by frontend).
 */
export function getActiveChainConfig(chainId?: number | string): BackendChainConfig {
    if (!chainId) {
        throw new Error(
            'chainId is required. The backend now uses the chain connected in the frontend. ' +
            'Pass chainId in your request body or socket event.'
        );
    }
    return getChainConfig(chainId);
}

/**
 * Returns the chain config for a given chainId.
 * Supports both numeric chain IDs (8453 for Base, 42220 for Celo) and string keys.
 */
export function getChainConfig(chainId: number | string): BackendChainConfig {
    let config: BackendChainConfig | undefined;

    if (typeof chainId === 'number') {
        // Look up by numeric chain ID
        config = Object.values(CHAIN_REGISTRY).find(c => c.chainId === chainId);
    } else {
        // Look up by string key
        config = CHAIN_REGISTRY[chainId.toLowerCase()];
    }

    if (!config) {
        throw new Error(
            `Unknown chain "${chainId}". Supported chains: ${Object.keys(CHAIN_REGISTRY).join(", ")}`
        );
    }

    if (!config.contractAddress) {
        throw new Error(
            `Contract address not set for chain "${config.label}". ` +
            `Set ${config.label.toUpperCase()}_SPACESHIP_CONTRACT_ADDRESS in your .env`
        );
    }

    return config;
}

export { CHAIN_REGISTRY };
