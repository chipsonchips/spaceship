import { useCallback, useEffect, useState } from "react";
import { useProfile } from "@farcaster/auth-kit";

interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfp?: string;
  bio?: string;
}

export function useFarcasterAuth() {
  const [user, setUser] = useState<FarcasterUser>({
    fid: 0,
    username: "",
    displayName: "",
    pfp: "",
    bio: "",
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Farcaster user context
  useEffect(() => {
    const initializeFarcaster = async () => {
      try {
        setIsLoading(true);
        // @ts-expect-error - Check if running in Farcaster context
        if (window.farcaster) {
          // Note: In production, this would use the Farcaster SDK properly
          // For now, we'll skip the profile fetch to avoid hook rules violation
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.warn("Farcaster auth not available in this context:", err);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeFarcaster();
  }, []);

  // Request user approval (if in iframe)
  const requestUserApproval = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // @ts-expect-error - Farcaster SDK type mismatch
      if (window.farcaster?.requestUserApproval) {
        // @ts-expect-error - Farcaster SDK type mismatch
        const result = await window.farcaster.requestUserApproval();
        if (result?.username) {
          setUser({
            fid: result.fid || 0,
            username: result.username,
            displayName: result.displayName || result.username,
            pfp: result.pfpUrl,
            bio: result.bio,
          });
          setIsAuthenticated(true);
        }
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to get user approval";
      setError(errorMsg);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    requestUserApproval,
    farcasterUser: user,
  };
}

export default useFarcasterAuth;
