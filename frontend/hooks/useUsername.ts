import { useState, useEffect } from "react";
import * as api from "@/lib/api";

export function useUsername(address: string | undefined) {
    const [username, setUsername] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!address) {
            setUsername(null);
            return;
        }

        const fetchUsername = async () => {
            setLoading(true);
            try {
                const response = await api.fetchUserByAddress(address);
                if (response.success && response.user?.username) {
                    setUsername(response.user.username);
                } else {
                    setUsername(null);
                }
            } catch (err) {
                console.error("Failed to fetch username:", err);
                setUsername(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUsername();
    }, [address]);

    return { username, loading };
}
