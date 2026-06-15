/**
 * Multichain configuration — single source of truth for all chain-specific constants.
 * Add new chains here; the rest of the app picks them up automatically.
 */
import { base, celo } from "wagmi/chains";
import type { Chain } from "wagmi/chains";

export interface ChainConfig {
    chain: Chain;
    /** USDC contract address on this chain */
    usdcAddress: `0x${string}`;
    /** SpaceshipGame proxy contract address on this chain */
    gameContractAddress: `0x${string}`;
    /** Human-readable label */
    label: string;
    /** Block explorer base URL */
    explorerUrl: string;
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
    [base.id]: {
        chain: base,
        usdcAddress: (process.env.NEXT_PUBLIC_BASE_USDC_ADDRESS ||
            "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913") as `0x${string}`,
        gameContractAddress: (process.env.NEXT_PUBLIC_BASE_GAME_CONTRACT_ADDRESS ||
            "0xea7757c9dBDA44961DD900074c15a9dBdEf94931") as `0x${string}`,
        label: "Base",
        explorerUrl: "https://basescan.org",
    },
    [celo.id]: {
        chain: celo,
        usdcAddress: (process.env.NEXT_PUBLIC_CELO_USDC_ADDRESS ||
            "0xcebA9300f2b948710d2653dD7B07f33A8B32118C") as `0x${string}`,
        gameContractAddress: (process.env.NEXT_PUBLIC_CELO_GAME_CONTRACT_ADDRESS ||
            "0xF457FE10F74cBD8F02aA62953bb7F7d0d0BDd12a") as `0x${string}`,
        label: "Celo",
        explorerUrl: "https://celoscan.io",
    },
};

export const SUPPORTED_CHAINS = Object.values(CHAIN_CONFIGS).map((c) => c.chain);

/** Returns the config for a given chainId, falling back to Base if unknown. */
export function getChainConfig(chainId: number | undefined): ChainConfig {
    return CHAIN_CONFIGS[chainId ?? base.id] ?? CHAIN_CONFIGS[base.id];
}
