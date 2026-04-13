export enum UserRole {
    PLAYER = 'player',
    ADMIN = 'admin',
    MODERATOR = 'moderator',
}

export enum UserSource {
    WALLET = 'wallet',
    FARCASTER = 'farcaster',
}

export interface User {
    id: string;
    address?: string;
    farcasterId?: number;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    email?: string;
    role: UserRole;
    permissions: string[];
    isActive: boolean;
    createdAt: string;
}

export interface AdminLog {
    id: string;
    adminId?: string;
    actionType: string;
    description?: string;
    details: Record<string, any>;
    ipAddress?: string;
    chainId?: number;
    success: boolean;
    errorMessage?: string;
    createdAt: string;
}
