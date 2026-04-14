"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import UsernameModal from "./UsernameModal";

export default function UsernamePrompt() {
  const { user, isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Show modal if user is authenticated but doesn't have a username
    if (isAuthenticated && user && !user.username) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [isAuthenticated, user, user?.username]);

  const handleClose = () => {
    // Don't close the modal - user must set a username
    // Only close when username is actually set (handled by parent via user update)
  };

  return <UsernameModal isOpen={showModal} onClose={handleClose} />;
}
