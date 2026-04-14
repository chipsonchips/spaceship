"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface UsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UsernameModal({ isOpen, onClose }: UsernameModalProps) {
  const { updateProfile } = useAuth();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (username.length > 32) {
      setError("Username must be at most 32 characters");
      return;
    }

    // Validate username format (alphanumeric, underscores, hyphens)
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError(
        "Username can only contain letters, numbers, underscores, and hyphens",
      );
      return;
    }

    try {
      setIsLoading(true);
      await updateProfile({ username: username.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set username");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-auto">
      {/* Transparent backdrop with subtle blur effect */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative max-w-md w-full mx-4 pointer-events-auto">
        {/* Outer glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-cyan-500/20 to-green-500/20 rounded-lg blur-xl" />

        {/* Main modal */}
        <div className="relative bg-black/80 border-2 border-green-500/50 rounded-lg p-8 shadow-2xl">
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent rounded-t-lg" />

          {/* Title */}
          <h2 className="text-2xl font-bold text-green-400 mb-2 font-orbitron uppercase tracking-wider">
            Set Your Username
          </h2>

          {/* Subtitle */}
          <p className="text-green-300/80 mb-6 text-sm font-courier">
            Choose a username to display on the leaderboard and in the game.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input field */}
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-4 py-3 bg-black/50 border border-green-500/50 rounded text-green-300 placeholder-green-600/50 focus:outline-none focus:border-green-400 focus:bg-black/70 transition-all font-courier"
                disabled={isLoading}
                autoFocus
              />
              <p className="text-xs text-green-600/70 mt-2 font-courier">
                3-32 characters, letters, numbers, underscores, and hyphens only
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-900/40 border border-red-500/50 rounded p-3">
                <p className="text-red-300 text-sm font-courier">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-400 hover:to-cyan-400 disabled:from-gray-600 disabled:to-gray-600 text-black font-bold py-3 px-4 rounded font-orbitron uppercase tracking-wider transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-green-500/50"
            >
              {isLoading ? "Setting..." : "Set Username"}
            </button>
          </form>

          {/* Bottom accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent rounded-b-lg" />
        </div>
      </div>
    </div>
  );
}
