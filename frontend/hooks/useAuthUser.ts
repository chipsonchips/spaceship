import { useAuth } from '@/context/AuthContext';
import { useCallback } from 'react';

/**
 * Hook to access auth user and methods
 * Provides convenient access to user data and auth operations
 */
export function useAuthUser() {
    const auth = useAuth();

    const isPlayerOnly = useCallback(() => {
        return auth.user?.role === 'player';
    }, [auth.user]);

    const isModerator = useCallback(() => {
        return auth.user?.role === 'moderator';
    }, [auth.user]);

    const canManageUsers = useCallback(() => {
        return auth.isAdmin() || auth.hasPermission('manage:users');
    }, [auth]);

    const canManageHouse = useCallback(() => {
        return auth.isAdmin() || auth.hasPermission('write:house');
    }, [auth]);

    const canManageContract = useCallback(() => {
        return auth.isAdmin() || auth.hasPermission('write:contract');
    }, [auth]);

    const canViewAuditLogs = useCallback(() => {
        return auth.isAdmin() || auth.hasPermission('read:audit');
    }, [auth]);

    return {
        ...auth,
        isPlayerOnly,
        isModerator,
        canManageUsers,
        canManageHouse,
        canManageContract,
        canViewAuditLogs,
    };
}
