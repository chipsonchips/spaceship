"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import UsernameModal from "./UsernameModal";

export default function UsernamePrompt() {
  const { user, isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log("UsernamePrompt mounted");
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const needsUsername =
      isAuthenticated &&
      user &&
      (user.username === null ||
        user.username === undefined ||
        user.username.trim() === "");

    console.log("UsernamePrompt state check:", {
      isAuthenticated,
      userId: user?.id,
      username: user?.username,
      needsUsername,
    });

    if (needsUsername) {
      console.log("Showing username modal");
      setShowModal(true);
    } else {
      console.log("Hiding username modal");
      setShowModal(false);
    }
  }, [mounted, isAuthenticated, user]);

  const handleClose = () => {
    // User must set a username, cannot close manually
  };

  if (!mounted) return null;

  return <UsernameModal isOpen={showModal} onClose={handleClose} />;
}
